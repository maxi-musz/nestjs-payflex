import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PurchaseAirtimeDto } from './dto/purchase-airtime.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { PushNotificationService } from 'src/push-notification/push-notification.service';

@Injectable()
export class AirtimeService {
  private readonly logger = new Logger(AirtimeService.name);
  private readonly credentials: ReturnType<typeof VtpassCredentialsHelper.getCredentials>;

  private readonly apiKey: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly pushNotificationService: PushNotificationService,
  ) {
    this.credentials = VtpassCredentialsHelper.getCredentials(configService);
    this.apiKey = this.credentials.apiKey;
    this.publicKey = this.credentials.publicKey;
    this.secretKey = this.credentials.secretKey;
    this.isDevelopment = this.credentials.isDevelopment;

    const baseUrlPreview = this.credentials.baseUrl || 'NOT SET';
    this.logger.log(`VTpass mode: ${this.isDevelopment ? 'SANDBOX' : 'LIVE'} | Base URL: ${baseUrlPreview}`);

    if (!this.apiKey || !this.publicKey) {
      this.logger.warn('VTpass API credentials are not fully configured (api/public).');
    }
    if (!this.secretKey) {
      this.logger.warn('VTpass secret key is not configured (needed for POST requests).');
    }
  }

  private getBaseUrl(): string {
    if (!this.credentials.baseUrl) {
      const which = this.isDevelopment ? 'VT_PASS_SANDBOX_API_URL' : 'VT_PASS_LIVE_API_URL';
      this.logger.error(`VTpass base URL not configured. Please set ${which}.`);
      throw new HttpException(`VTpass base URL not configured. Please set ${which}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return this.credentials.baseUrl.replace(/\/+$/, '');
  }

  private getGetHeaders() {
    return {
      'api-key': this.apiKey,
      'public-key': this.publicKey,
      'Content-Type': 'application/json',
    };
  }

  private getPostHeaders() {
    return {
      'api-key': this.apiKey,
      'secret-key': this.secretKey,
      'Content-Type': 'application/json',
    };
  }

  private generateVtpassRequestId(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const ii = pad(now.getMinutes());
    const base = `${yyyy}${mm}${dd}${hh}${ii}`;
    const suffix = Math.random().toString(36).slice(2, 10);
    return `${base}${suffix}`;
  }

  async getAirtimeProviderServiceIds() {
    const url = `${this.getBaseUrl()}/services?identifier=airtime`;
    this.logger.log(`Fetching VTpass airtime service IDs from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });

      // VTpass response structure: expect response_description and content
      if (!response.data?.content) {
        this.logger.warn(`Unexpected VTpass response for airtime service IDs: ${JSON.stringify(response.data)}`);
      }

      this.logger.log('Airtime service IDs retrieved successfully');
      return new ApiResponseDto(true, 'Airtime service IDs retrieved successfully', response.data?.content || []);
    } catch (error: any) {
      this.logger.error(`Error fetching VTpass airtime service IDs: ${error.message}`);
      if (error.response) {
        this.logger.error('VTpass API Error Response:', JSON.stringify({
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        }, null, 2));
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch airtime service IDs';
        throw new HttpException(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      if (error.request) {
        this.logger.error('VTpass API Request Error:', JSON.stringify(error.request, null, 2));
      }
      throw new HttpException('Failed to fetch airtime service IDs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async purchaseAirtime(userPayload: any, dto: PurchaseAirtimeDto) {
    // Use provided request_id for idempotency, or generate new one
    const request_id = dto.request_id || this.generateVtpassRequestId();
    const url = `${this.getBaseUrl()}/pay`;

    this.logger.log(`Purchasing VTU: serviceID=${dto.serviceID}, amount=${dto.amount}, phone=${dto.phone}, request_id=${request_id}`);

    // Check for existing transaction (idempotency)
    const existingTx = await this.prisma.transactionHistory.findUnique({
      where: { transaction_reference: request_id }
    });

    if (existingTx) {
      // Transaction already exists - return cached result (idempotent)
      this.logger.log(`Found existing transaction with request_id=${request_id}, status=${existingTx.status}`);
      
      if (existingTx.status === 'success') {
        // Return cached successful result
        const cachedResponse = (existingTx.meta_data as any)?.vtpass_response;
        return new ApiResponseDto(true, 'Airtime purchase already completed', cachedResponse || {
          code: '000',
          response_description: 'TRANSACTION SUCCESSFUL',
          requestId: request_id,
          message: 'Transaction already completed'
        });
      }

      // If pending or failed, return existing status (don't retry automatically)
      const statusMessage = existingTx.status === 'pending' 
        ? 'Transaction is still processing'
        : 'Previous transaction attempt failed';
      
      const cachedResponse = (existingTx.meta_data as any)?.vtpass_response;
      // Status is not success here (we already returned early if it was)
      return new ApiResponseDto(
        false,
        statusMessage,
        cachedResponse || {
          requestId: request_id,
          status: existingTx.status,
          transaction_number: existingTx.transaction_number
        }
      );
    }

    try {
      const payload = {
        request_id,
        serviceID: dto.serviceID,
        amount: dto.amount,
        phone: dto.phone,
      };

      this.logger.log(`Payload: ${JSON.stringify(payload)}`);
      this.logger.log(`Headers: ${JSON.stringify(this.getPostHeaders())}`);
      this.logger.log(`URL: ${url}`);

      // Wallet hold + create pending transaction atomically
      const description = `VTU ${dto.serviceID.toUpperCase()} to ${dto.phone}`;
      const createdTx = await this.prisma.$transaction(async (tx) => {
        // Prevent double-deduct: check existing by request_id
        const existing = await tx.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existing) return existing;

        const wallet = await tx.wallet.findUnique({ where: { user_id: userPayload.sub } });
        const amountNum = Number(dto.amount);
        if (!wallet || Number(wallet.current_balance) < amountNum) {
          throw new HttpException('Insufficient wallet balance', HttpStatus.BAD_REQUEST);
        }

        const balance_before = Number(wallet.current_balance);
        const balance_after = balance_before - amountNum;

        await tx.wallet.update({
          where: { user_id: userPayload.sub },
          data: { current_balance: balance_after }
        });

        return await tx.transactionHistory.create({
          data: {
            user_id: userPayload.sub,
            amount: amountNum,
            transaction_type: 'airtime',
            credit_debit: 'debit',
            description,
            status: 'pending',
            recipient_mobile: dto.phone,
            payment_method: 'wallet',
            payment_channel: 'other',
            transaction_reference: request_id,
            balance_before,
            balance_after,
            meta_data: payload,
          }
        });
      });

      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      const txContent = response.data?.content?.transactions || {};
      const responseCode = response.data?.code || '';
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';
      
      // Determine transaction status based on VTpass documentation
      // Code "000" with status "delivered" = success
      // Code "000" with status "pending" or "initiated" = processing (keep as pending, don't refund)
      // Code "099" = TRANSACTION IS PROCESSING (keep as pending, requery recommended)
      // Code "016" = TRANSACTION FAILED (actual failure)
      // Code "040" = TRANSACTION REVERSAL (refund)
      // Other codes = check response_description for actual status
      
      const isProcessing = responseCode === '000' && (txStatus === 'pending' || txStatus === 'initiated') ||
                           responseCode === '099' ||
                           responseDescription.includes('PROCESSING') ||
                           responseDescription.includes('PENDING');
      
      const isDelivered = responseCode === '000' && txStatus === 'delivered';
      const isReversed = responseCode === '040' || txStatus === 'reversed';
      const isFailed = responseCode === '016' || 
                      (responseCode === '000' && txStatus === 'failed') ||
                      (!isProcessing && !isDelivered && !isReversed && responseCode !== '000');

      let finalStatus: 'pending' | 'success' | 'failed' = 'pending';
      let shouldRefund = false;
      let shouldThrow = false;
      let errorMessage = '';

      if (isDelivered) {
        finalStatus = 'success';
      } else if (isReversed) {
        finalStatus = 'failed';
        shouldRefund = true;
        errorMessage = responseDescription || 'Transaction was reversed';
        shouldThrow = true;
      } else if (isFailed) {
        finalStatus = 'failed';
        shouldRefund = true;
        errorMessage = responseDescription || `Transaction failed with code: ${responseCode}`;
        shouldThrow = true;
      } else if (isProcessing) {
        // Keep as pending - transaction is processing, don't refund yet
        finalStatus = 'pending';
        this.logger.log(`Transaction is processing: ${responseDescription || `Status: ${txStatus}`}`);
      } else {
        // Unknown status - treat as pending and log for investigation
        finalStatus = 'pending';
        this.logger.warn(`Unknown transaction status. Code: ${responseCode}, Status: ${txStatus}, Description: ${responseDescription}`);
      }

      await this.prisma.transactionHistory.update({
        where: { transaction_reference: request_id },
        data: {
          status: finalStatus,
          transaction_number: txContent.transactionId?.toString() || null,
          fee: typeof txContent.commission === 'number' ? txContent.commission : Number(txContent.commission) || 0,
          meta_data: {
            ...(createdTx.meta_data as any),
            vtpass_response: response.data,
            vtpass_status: txStatus,
            vtpass_code: responseCode,
          }
        }
      });

      // Only refund and throw error for actual failures or reversals
      if (shouldRefund) {
        await this.prisma.wallet.update({
          where: { user_id: userPayload.sub },
          data: { current_balance: { increment: Number(dto.amount) } }
        });
        
        if (shouldThrow) {
        throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
        }
      }

      // If processing, return success response with pending status info
      if (isProcessing) {
        const formattedResponse = {
          id: createdTx.id,
          ...response.data,
          status: 'processing',
          message: 'Transaction is being processed. Status will be updated via webhook.',
        };
        return new ApiResponseDto(true, 'Transaction is being processed', formattedResponse);
      }

      const formattedResponse = {
        id: createdTx.id,
        ...response.data,
      };

      this.logger.log('Airtime purchase request completed successfully');

      // Send push notification on success (non-blocking)
      if (finalStatus === 'success') {
        this.pushNotificationService
          .sendTransactionNotification(
            userPayload.sub,
            'airtime',
            Number(dto.amount),
            'success',
            createdTx.id,
          )
          .catch((e) => this.logger.warn(`Push notification failed: ${e.message}`));
      }
      return new ApiResponseDto(true, 'Airtime purchase successful', formattedResponse);
    } catch (error: any) {
      this.logger.error(`Error purchasing airtime: ${error.message}`);
      
      // Update transaction status to failed and refund (idempotent - safe to retry)
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.transactionHistory.update({
            where: { transaction_reference: request_id },
            data: { 
              status: 'failed', 
              meta_data: { 
                request_id, 
                payload: {
                  request_id,
                  serviceID: dto.serviceID,
                  amount: dto.amount,
                  phone: dto.phone,
                },
                vtpass_error: error.response?.data || error.message || 'Unknown error'
              } 
            }
          });
          await tx.wallet.update({
            where: { user_id: userPayload.sub },
            data: { current_balance: { increment: Number(dto.amount) } }
          });
        });
      } catch (updateError: any) {
        // Transaction might not exist if error occurred before creation
        this.logger.warn(`Could not update transaction status: ${updateError.message}`);
      }

      if (error.response) {
        this.logger.error('VTpass API Error Response:', JSON.stringify({
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        }, null, 2));
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to purchase airtime';
        throw new HttpException(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      if (error.request) {
        this.logger.error('VTpass API Request Error:', JSON.stringify(error.request, null, 2));
      }
      throw new HttpException('Failed to purchase airtime', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Internal method to requery a transaction (called by cron service)
   * Updates transaction status based on VTpass response
   */
  async requeryPendingTransaction(requestId: string): Promise<{ updated: boolean; status?: string }> {
    const url = `${this.getBaseUrl()}/requery`;
    this.logger.log(`[Cron] Querying pending transaction: request_id=${requestId}`);

    try {
      // Get transaction from database
      const transaction = await this.prisma.transactionHistory.findUnique({
        where: { transaction_reference: requestId },
      });

      if (!transaction) {
        this.logger.warn(`[Cron] Transaction not found: ${requestId}`);
        return { updated: false };
      }

      // Skip if already successful
      if (transaction.status === 'success') {
        this.logger.log(`[Cron] Transaction ${requestId} already successful, skipping`);
        return { updated: false, status: 'success' };
      }

      // Skip if already failed
      if (transaction.status === 'failed') {
        this.logger.log(`[Cron] Transaction ${requestId} already failed, skipping`);
        return { updated: false, status: 'failed' };
      }

      // Check requery count
      const metaData = transaction.meta_data as any || {};
      const requeryCount = metaData.requery_count || 0;
      const maxRequeryAttempts = 3;

      if (requeryCount >= maxRequeryAttempts) {
        this.logger.warn(`[Cron] Transaction ${requestId} exceeded max requery attempts (${maxRequeryAttempts}), skipping`);
        return { updated: false };
      }

      // Check if transaction is too old (older than 30 minutes)
      const transactionAge = Date.now() - transaction.createdAt.getTime();
      const maxAge = 30 * 60 * 1000; // 30 minutes
      if (transactionAge > maxAge) {
        this.logger.warn(`[Cron] Transaction ${requestId} is too old (${Math.round(transactionAge / 60000)} minutes), skipping`);
        return { updated: false };
      }

      // Query VTpass
      const payload = { request_id: requestId };
      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      const txContent = response.data?.content?.transactions || {};
      const responseCode = response.data?.code || '';
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      // Determine status (same logic as purchase method)
      const isDelivered = responseCode === '000' && txStatus === 'delivered';
      const isReversed = responseCode === '040' || txStatus === 'reversed';
      const isFailed = responseCode === '016' || (responseCode === '000' && txStatus === 'failed');
      const isProcessing = responseCode === '000' && (txStatus === 'pending' || txStatus === 'initiated') ||
                           responseCode === '099' ||
                           responseDescription.includes('PROCESSING') ||
                           responseDescription.includes('PENDING');

      let finalStatus: 'pending' | 'success' | 'failed' = 'pending';
      let shouldRefund = false;

      if (isDelivered) {
        finalStatus = 'success';
        this.logger.log(`[Cron] Transaction ${requestId} delivered successfully`);
      } else if (isReversed || isFailed) {
        finalStatus = 'failed';
        shouldRefund = true;
        this.logger.warn(`[Cron] Transaction ${requestId} ${isReversed ? 'reversed' : 'failed'}`);
      } else if (isProcessing) {
        finalStatus = 'pending';
        this.logger.log(`[Cron] Transaction ${requestId} still processing`);
      } else {
        finalStatus = 'pending';
        this.logger.warn(`[Cron] Unknown status for transaction ${requestId}: ${responseCode}/${txStatus}`);
      }

      // Update transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.transactionHistory.update({
          where: { transaction_reference: requestId },
          data: {
            status: finalStatus,
            transaction_number: txContent.transactionId?.toString() || transaction.transaction_number,
            fee: typeof txContent.commission === 'number' 
              ? txContent.commission 
              : Number(txContent.commission) || transaction.fee || 0,
            meta_data: {
              ...metaData,
              vtpass_response: response.data,
              vtpass_status: txStatus,
              vtpass_code: responseCode,
              requery_count: requeryCount + 1,
              last_requery_at: new Date().toISOString(),
            },
          },
        });

        // Refund on failure/reversal
        if (shouldRefund && transaction.status !== 'failed') {
          const refundAmount = transaction.amount || 0;
          if (refundAmount > 0) {
            await tx.wallet.update({
              where: { user_id: transaction.user_id },
              data: { current_balance: { increment: Number(refundAmount) } },
            });
            this.logger.log(`[Cron] Refunded ${refundAmount} to user ${transaction.user_id}`);
          }
        }
      });

      return { updated: true, status: finalStatus };
    } catch (error: any) {
      this.logger.error(`[Cron] Error querying transaction ${requestId}: ${error.message}`);
      // Don't throw - just log and return
      return { updated: false };
    }
  }
}




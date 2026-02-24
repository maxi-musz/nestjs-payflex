import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PurchaseAirtimeDto } from './dto/purchase-airtime.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import {
  validateCredentialsOnInit,
  validateBaseUrl,
  validateCredentialsForPost,
  validateSecretKeyForHeaders,
  validateWalletBalance,
  determineTransactionStatus,
  handleAuthenticationError,
  shouldRequeryTransaction,
  generateVtpassRequestId,
  maskKey,
} from './airtime.validators';

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

    // Validate and log credentials
    validateCredentialsOnInit(
      {
        apiKey: this.apiKey,
        publicKey: this.publicKey,
        secretKey: this.secretKey,
        isDevelopment: this.isDevelopment,
      },
      this.logger,
    );
  }

  private getBaseUrl(): string {
    return validateBaseUrl(this.credentials.baseUrl, this.isDevelopment);
  }

  private getGetHeaders() {
    return {
      'api-key': this.apiKey,
      'public-key': this.publicKey,
      'Content-Type': 'application/json',
    };
  }

  private getPostHeaders() {
    validateSecretKeyForHeaders(this.secretKey, this.logger);
    return {
      'api-key': this.apiKey,
      'secret-key': this.secretKey,
      'Content-Type': 'application/json',
    };
  }

  private generateVtpassRequestId(): string {
    return generateVtpassRequestId();
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
        this.logger.error('VTpass API Request Error: network/request issue — no response received');
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
      // Validate credentials before making the request
      validateCredentialsForPost(
        {
          apiKey: this.apiKey,
          publicKey: this.publicKey,
          secretKey: this.secretKey,
          isDevelopment: this.isDevelopment,
        },
        this.logger,
      );

      const payload = {
        request_id,
        serviceID: dto.serviceID,
        amount: dto.amount,
        phone: dto.phone,
      };

      this.logger.log(`Payload: ${JSON.stringify(payload)}`);
      const headers = this.getPostHeaders();
      // Log headers with masked secret key for debugging
      const maskedHeaders = {
        ...headers,
        'secret-key': maskKey(headers['secret-key']),
        'api-key': maskKey(headers['api-key']),
      };
      this.logger.log(`Headers: ${JSON.stringify(maskedHeaders)}`);
      this.logger.log(`URL: ${url}`);

      // Wallet hold + create pending transaction atomically
      const description = `VTU ${dto.serviceID.toUpperCase()} to ${dto.phone}`;
      const createdTx = await this.prisma.$transaction(async (tx) => {
        // Prevent double-deduct: check existing by request_id
        const existing = await tx.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existing) return existing;

        const wallet = await tx.wallet.findFirst({ where: { user_id: userPayload.sub } });
        const amountNum = Number(dto.amount);

        this.logger.log(`Wallet lookup for user ${userPayload.sub}: ${wallet ? `found (id: ${wallet.id}, balance: ${wallet.current_balance})` : 'NOT FOUND'}`);

        if (!wallet) {
          this.logger.error(`User wallet not found for user ${userPayload.sub}`);
          throw new HttpException('User wallet not found in database', HttpStatus.BAD_REQUEST);
        }

        this.logger.log(`Balance check: ${wallet.current_balance} >= ${amountNum} → ${Number(wallet.current_balance) >= amountNum ? 'OK' : 'INSUFFICIENT'}`);
        validateWalletBalance(Number(wallet.current_balance), amountNum);

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
            provider: dto.serviceID,
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

      // Determine transaction status
      const statusResult = determineTransactionStatus(
        responseCode,
        txStatus,
        responseDescription,
        this.logger,
      );
      const { finalStatus, shouldRefund, shouldThrow, errorMessage } = statusResult;

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
          this.logger.error(`VTpass response: code=${responseCode}, status=${txStatus}, description="${responseDescription}"`);
          throw new HttpException(`Provider error: ${errorMessage}`, HttpStatus.BAD_REQUEST);
        }
      }

      // If processing, return success response with pending status info
      if (finalStatus === 'pending') {
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
      const isVtpassError = error.response && typeof error.response.status === 'number';
      this.logger.error(`Error purchasing airtime: ${isVtpassError ? '[VTpass] ' : ''}${error.message}`);
      
      // Record failure + refund if wallet was debited
      try {
        const existingTx = await this.prisma.transactionHistory.findUnique({
          where: { transaction_reference: request_id },
        });

        const errorMeta = {
          request_id,
          payload: { request_id, serviceID: dto.serviceID, amount: dto.amount, phone: dto.phone },
          vtpass_error: error.response?.data || error.message || 'Unknown error',
        };

        if (existingTx) {
          // Transaction was created (wallet was debited) — mark failed + refund
          await this.prisma.$transaction(async (tx) => {
            await tx.transactionHistory.update({
              where: { transaction_reference: request_id },
              data: { status: 'failed', meta_data: errorMeta },
            });
            await tx.wallet.update({
              where: { user_id: userPayload.sub },
              data: { current_balance: { increment: Number(dto.amount) } },
            });
          });
          this.logger.log(`Transaction ${request_id} marked as failed, wallet refunded`);
        } else {
          // Transaction was never created (error before DB commit) — create a failed record
          await this.prisma.transactionHistory.create({
            data: {
              user_id: userPayload.sub,
              amount: Number(dto.amount),
              provider: dto.serviceID,
              transaction_type: 'airtime',
              credit_debit: 'debit',
              description: `VTU ${dto.serviceID.toUpperCase()} to ${dto.phone}`,
              status: 'failed',
              recipient_mobile: dto.phone,
              payment_method: 'wallet',
              payment_channel: 'other',
              transaction_reference: request_id,
              balance_before: 0,
              balance_after: 0,
              meta_data: errorMeta,
            },
          });
          this.logger.log(`Failed transaction ${request_id} recorded (no wallet debit occurred)`);
        }
      } catch (updateError: any) {
        this.logger.error(`Failed to record transaction failure: ${updateError.message}`);
      }

      // Axios errors (actual VTpass API responses) have error.response.status (number)
      const isAxiosError = error.response && typeof error.response.status === 'number';

      if (isAxiosError) {
        this.logger.error(`VTpass API Error Response: ${error.response.status} ${error.response.statusText}`, JSON.stringify(error.response.data, null, 2));

        if (error.response.status === 401) {
          const authError = handleAuthenticationError(
            error,
            {
              apiKey: this.apiKey,
              publicKey: this.publicKey,
              secretKey: this.secretKey,
              isDevelopment: this.isDevelopment,
            },
            this.logger,
          );
          if (authError) throw authError;
        }

        const rawMessage = error.response.data?.response_description || error.response.data?.message || 'Failed to purchase airtime';
        throw new HttpException(`Provider error: ${rawMessage}`, error.response.status || HttpStatus.BAD_REQUEST);
      }

      if (error.request) {
        this.logger.error('VTpass API Request Error: network/request issue — no response received');
      }

      // Re-throw HttpExceptions as-is (internal errors like insufficient balance)
      if (error instanceof HttpException) throw error;

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

      // Check if transaction should be requeried
      const metaData = transaction.meta_data as any || {};
      const requeryCount = metaData.requery_count || 0;
      const transactionAge = Date.now() - transaction.createdAt.getTime();

      const requeryCheck = shouldRequeryTransaction(transactionAge, requeryCount);
      if (!requeryCheck.shouldRequery) {
        this.logger.warn(`[Cron] Transaction ${requestId} skipped: ${requeryCheck.reason}`);
        return { updated: false };
      }

      // Query VTpass
      const payload = { request_id: requestId };
      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      const txContent = response.data?.content?.transactions || {};
      const responseCode = response.data?.code || '';
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      // Determine transaction status
      const statusResult = determineTransactionStatus(
        responseCode,
        txStatus,
        responseDescription,
        this.logger,
      );
      const { finalStatus, shouldRefund } = statusResult;

      if (finalStatus === 'success') {
        this.logger.log(`[Cron] Transaction ${requestId} delivered successfully`);
      } else if (finalStatus === 'failed') {
        this.logger.warn(`[Cron] Transaction ${requestId} failed`);
      } else {
        this.logger.log(`[Cron] Transaction ${requestId} still processing`);
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




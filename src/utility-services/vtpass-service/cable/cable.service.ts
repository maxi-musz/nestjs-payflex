import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PurchaseCableDto } from './dto/purchase-cable.dto';
import { VerifySmartcardDto } from './dto/verify-smartcard.dto';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { EmailService } from 'src/common/mailer/email.service';

@Injectable()
export class CableService {
  private readonly logger = new Logger(CableService.name);
  private readonly credentials: ReturnType<typeof VtpassCredentialsHelper.getCredentials>;

  private readonly apiKey: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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

  private buildApiError(message: string, status: HttpStatus, data?: any): HttpException {
    return new HttpException(new ApiResponseDto(false, message, data), status);
  }

  private getBaseUrl(): string {
    if (!this.credentials.baseUrl) {
      const which = this.isDevelopment ? 'VT_PASS_SANDBOX_API_URL' : 'VT_PASS_LIVE_API_URL';
      this.logger.error(`VTpass base URL not configured. Please set ${which}.`);
      throw this.buildApiError(`VTpass base URL not configured. Please set ${which}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return this.credentials.baseUrl.replace(/\/+$/, '');
  }

  private getGetHeaders() {
    return {
      'api-key': this.apiKey,
      'public-key': this.publicKey,
      'Content-Type': 'application/json',
    } as any;
  }

  private getPostHeaders() {
    return {
      'api-key': this.apiKey,
      'secret-key': this.secretKey,
      'Content-Type': 'application/json',
    } as any;
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

  /**
   * List TV subscription providers (DSTV, GOTV, Startimes, Showmax, etc.)
   */
  async getCableProviderServiceIds() {
    const identifier = 'tv-subscription';
    const url = `${this.getBaseUrl()}/services?identifier=${encodeURIComponent(identifier)}`;
    this.logger.log(`Fetching VTpass cable service IDs for identifier='${identifier}' from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });

      if (!response.data?.content) {
        this.logger.warn(`Unexpected VTpass response for cable service IDs: ${JSON.stringify(response.data)}`);
      }

      this.logger.log('Cable service IDs retrieved successfully');
      return new ApiResponseDto(true, 'Cable service IDs retrieved successfully', response.data?.content || []);
    } catch (error: any) {
      this.logger.error(`Error fetching VTpass cable service IDs: ${error.message}`);
      if (error.response) {
        try { this.logger.error('VTpass API Error Response: ' + JSON.stringify(error.response.data)); } catch {}
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch cable service IDs';
        throw this.buildApiError(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      if (error.request) {
        this.logger.error('VTpass API Request Error: network/request issue');
      }
      throw this.buildApiError('Failed to fetch cable service IDs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getVariationCodes(serviceID: string) {
    const url = `${this.getBaseUrl()}/service-variations?serviceID=${encodeURIComponent(serviceID)}`;
    this.logger.log(`Fetching cable variation codes for serviceID='${serviceID}' from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });
      if (!response.data?.content) {
        this.logger.warn(`Unexpected VTpass response for cable variation codes: ${JSON.stringify(response.data)}`);
      }
      return new ApiResponseDto(true, `Variation codes retrieved successfully for ${serviceID}`, response.data?.content || {});
    } catch (error: any) {
      this.logger.error(`Error fetching cable variation codes for ${serviceID}: ${error.message}`);
      if (error.response) {
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch variation codes';
        this.logger.error(`VTpass API Error Response: ${JSON.stringify(error.response.data)}`);
        throw this.buildApiError(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      this.logger.error('VTpass API Request Error: network/request issue');
      throw this.buildApiError('Failed to fetch variation codes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifySmartcard(dto: VerifySmartcardDto) {
    const url = `${this.getBaseUrl()}/merchant-verify`;
    this.logger.log(`Verifying smartcard billersCode='${dto.billersCode}' serviceID='${dto.serviceID}'`);
    try {
      const payload = { billersCode: dto.billersCode, serviceID: dto.serviceID };
      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });
      return new ApiResponseDto(true, 'Smartcard verified successfully', response.data);
    } catch (error: any) {
      this.logger.error(`Error verifying smartcard: ${error.message}`);
      if (error.response) {
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to verify smartcard';
        throw this.buildApiError(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to verify smartcard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async purchase(userPayload: any, dto: PurchaseCableDto) {
    const request_id = dto.request_id || this.generateVtpassRequestId();
    const url = `${this.getBaseUrl()}/pay`;
    this.logger.log(`Purchasing cable: serviceID=${dto.serviceID}, billersCode=${dto.billersCode}, type=${dto.subscription_type}, request_id=${request_id}`);

    // Idempotency check
    const existingTx = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
    if (existingTx) {
      if (existingTx.status === 'success') {
        const cachedResponse = (existingTx.meta_data as any)?.vtpass_response;
        return new ApiResponseDto(true, 'Cable purchase already completed', cachedResponse || { requestId: request_id });
      }
      const cachedResponse = (existingTx.meta_data as any)?.vtpass_response;
      return new ApiResponseDto(false, existingTx.status === 'pending' ? 'Transaction is still processing' : 'Previous transaction attempt failed', cachedResponse || { requestId: request_id, status: existingTx.status });
    }

    let vtpassAmount = 0;
    try {
      // Determine amount
      if (dto.subscription_type === 'renew') {
        if (!dto.amount) {
          throw this.buildApiError('amount is required for renew subscription_type (use Renewal_Amount from verify)', HttpStatus.BAD_REQUEST);
        }
        vtpassAmount = Number(dto.amount);
      } else {
        // change: use variation_code amount if not provided
        if (!dto.variation_code) {
          throw this.buildApiError('variation_code is required for change subscription_type', HttpStatus.BAD_REQUEST);
        }
        if (dto.amount) {
          vtpassAmount = Number(dto.amount);
        } else {
          const varResp = await this.getVariationCodes(dto.serviceID);
          const variations = (varResp.data as any)?.variations || (varResp.data as any)?.varations || [];
          const found = variations.find((v: any) => v.variation_code === dto.variation_code);
          if (!found) throw this.buildApiError(`Variation code ${dto.variation_code} not found for ${dto.serviceID}`, HttpStatus.BAD_REQUEST);
          vtpassAmount = Number(found.variation_amount);
        }
      }

      // Determine phone in dev vs prod
      let phone: string;
      if (process.env.NODE_ENV === 'development') {
        phone = "201000000000";
      } else {
        const existingUser = await this.prisma.user.findUnique({ where: { id: userPayload.sub } });
        phone = existingUser?.phone_number?.trim() || '';
      }

      const payload: any = {
        request_id,
        serviceID: dto.serviceID,
        billersCode: dto.billersCode,
        amount: vtpassAmount,
        phone,
        subscription_type: dto.subscription_type,
      };
      if (dto.subscription_type === 'change') {
        payload.variation_code = dto.variation_code;
      }
      if (dto.quantity) payload.quantity = dto.quantity;

      // Wallet hold + pending tx
      const description = `${dto.serviceID.toUpperCase()} TV`;
      const amountNum = Number(vtpassAmount);
      const createdTx = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existing) return existing;

        const wallet = await tx.wallet.findUnique({ where: { user_id: userPayload.sub } });
        this.logger.log(`Wallet balance: ${wallet?.current_balance}`);
        if (!wallet || Number(wallet.current_balance) < amountNum) {
          throw this.buildApiError('Insufficient wallet balance', HttpStatus.BAD_REQUEST);
        }
        const balance_before = Number(wallet.current_balance);
        const balance_after = balance_before - amountNum;
        await tx.wallet.update({ where: { user_id: userPayload.sub }, data: { current_balance: balance_after } });

        return await tx.transactionHistory.create({
          data: {
            user_id: userPayload.sub,
            amount: amountNum,
            transaction_type: `cable`,
            credit_debit: 'debit',
            description,
            status: 'pending',
            recipient_mobile: dto.billersCode,
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

      const isProcessing = responseCode === '000' && (txStatus === 'pending' || txStatus === 'initiated') ||
                           responseCode === '099' ||
                           responseDescription.includes('PROCESSING') ||
                           responseDescription.includes('PENDING');
      const isDelivered = responseCode === '000' && txStatus === 'delivered';
      const isReversed = responseCode === '040' || txStatus === 'reversed';
      const isFailed = responseCode === '016' || (responseCode === '000' && txStatus === 'failed') || (!isProcessing && !isDelivered && !isReversed && responseCode !== '000');

      let finalStatus: 'pending' | 'success' | 'failed' = 'pending';
      let shouldRefund = false;
      let shouldThrow = false;
      let errorMessage = '';

      if (isDelivered) {
        finalStatus = 'success';
        
        // Send success email notification
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: userPayload.sub },
            select: { email: true, first_name: true }
          });
          
          if (user?.email) {
            const serviceName = dto.serviceID.toUpperCase();
            const productName = txContent.product_name || undefined;
            const transactionDate = new Date().toLocaleString('en-NG', {
              dateStyle: 'long',
              timeStyle: 'short'
            });
            
            await this.emailService.sendCablePurchaseSuccessEmail(
              user.email,
              user.first_name || 'Valued Customer',
              serviceName,
              dto.billersCode,
              vtpassAmount,
              request_id,
              transactionDate,
              productName
            );
            this.logger.log(`Success email sent to ${user.email} for cable purchase`);
          }
        } catch (emailError: any) {
          this.logger.error(`Failed to send cable purchase success email: ${emailError.message}`);
          // Don't throw - email failure shouldn't break transaction
        }
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
        finalStatus = 'pending';
        this.logger.log(`Transaction is processing: ${responseDescription || `Status: ${txStatus}`}`);
      } else {
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

      if (shouldRefund) {
        await this.prisma.wallet.update({ where: { user_id: userPayload.sub }, data: { current_balance: { increment: Number(vtpassAmount) } } });
        if (shouldThrow) {
          throw this.buildApiError(errorMessage, HttpStatus.BAD_REQUEST);
        }
      }

      if (isProcessing) {
        const formattedResponse = { id: createdTx.id, ...response.data, status: 'processing', message: 'Transaction is being processed. Status will be updated via webhook.' };
        return new ApiResponseDto(true, 'Transaction is being processed', formattedResponse);
      }

      const formattedResponse = { id: createdTx.id, ...response.data };
      this.logger.log('Cable purchase request completed');
      return new ApiResponseDto(true, 'Cable purchase successful', formattedResponse);
    } catch (error: any) {
      this.logger.error(`Error purchasing cable: ${error.message}`);
      try {
        const existingForUpdate = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existingForUpdate) {
          await this.prisma.$transaction(async (tx) => {
            await tx.transactionHistory.update({
              where: { transaction_reference: request_id },
              data: { status: 'failed', meta_data: { request_id, payload: ({ ...(dto as any) } as any), vtpass_error: (error.response?.data || error.message || 'Unknown error') } }
            });
            await tx.wallet.update({ where: { user_id: userPayload.sub }, data: { current_balance: { increment: Number(vtpassAmount) } } });
          });
        }
      } catch (updateError: any) {
        this.logger.warn(`Could not update transaction status: ${updateError.message || updateError}`);
      }
      // Preserve domain errors like Insufficient wallet balance
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.response) {
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to purchase cable';
        throw this.buildApiError(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to purchase cable', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}


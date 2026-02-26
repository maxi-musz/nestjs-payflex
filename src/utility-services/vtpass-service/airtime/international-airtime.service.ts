import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { PurchaseInternationalAirtimeDto } from './dto/purchase-international-airtime.dto';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';
import { StatsService } from 'src/common/stats/stats.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { AuditStatus } from '@prisma/client';

@Injectable()
export class InternationalAirtimeService {
  private readonly logger = new Logger(InternationalAirtimeService.name);
  private readonly credentials: ReturnType<typeof VtpassCredentialsHelper.getCredentials>;

  private readonly apiKey: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly statsService: StatsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {
    this.credentials = VtpassCredentialsHelper.getCredentials(configService);
    this.apiKey = this.credentials.apiKey;
    this.publicKey = this.credentials.publicKey;
    this.secretKey = this.credentials.secretKey;
    this.isDevelopment = this.credentials.isDevelopment;

    const baseUrlPreview = this.credentials.baseUrl || 'NOT SET';
    this.logger.log(`VTpass (Intl Airtime) mode: ${this.isDevelopment ? 'SANDBOX' : 'LIVE'} | Base URL: ${baseUrlPreview}`);

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
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const dateStr =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}`;
    const rand = Math.random().toString(36).slice(2, 14);
    return `${dateStr}${rand}`;
  }

  private buildApiError(message: string, status: HttpStatus, data?: any): HttpException {
    return new HttpException(new ApiResponseDto(false, message, data), status);
  }

  // ---------------------------------------------------------------------------
  // Lookup endpoints
  // ---------------------------------------------------------------------------

  async getCountries() {
    const url = `${this.getBaseUrl()}/get-international-airtime-countries`;
    this.logger.log(`Fetching international airtime countries from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });
      return new ApiResponseDto(true, 'International airtime countries retrieved successfully', response.data?.content || {});
    } catch (error: any) {
      this.logger.error(`Error fetching international airtime countries: ${error.message}`);
      if (error.response) {
        const msg = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch countries';
        throw this.buildApiError(msg, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to fetch countries', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getProductTypes(code: string) {
    const url = `${this.getBaseUrl()}/get-international-airtime-product-types?code=${encodeURIComponent(code)}`;
    this.logger.log(`Fetching international airtime product types for code='${code}' from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });
      return new ApiResponseDto(true, 'International airtime product types retrieved successfully', response.data?.content || []);
    } catch (error: any) {
      this.logger.error(`Error fetching international airtime product types: ${error.message}`);
      if (error.response) {
        const msg = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch product types';
        throw this.buildApiError(msg, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to fetch product types', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getOperators(code: string, product_type_id: string) {
    const params = new URLSearchParams();
    params.set('code', code);
    params.set('product_type_id', product_type_id);
    const url = `${this.getBaseUrl()}/get-international-airtime-operators?${params.toString()}`;
    this.logger.log(`Fetching international airtime operators for code='${code}', product_type_id='${product_type_id}' from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });
      return new ApiResponseDto(true, 'International airtime operators retrieved successfully', response.data?.content || []);
    } catch (error: any) {
      this.logger.error(`Error fetching international airtime operators: ${error.message}`);
      if (error.response) {
        const msg = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch operators';
        throw this.buildApiError(msg, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to fetch operators', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getVariations(operator_id: string, product_type_id: string) {
    const params = new URLSearchParams();
    params.set('serviceID', 'foreign-airtime');
    params.set('operator_id', operator_id);
    params.set('product_type_id', product_type_id);
    const url = `${this.getBaseUrl()}/service-variations?${params.toString()}`;
    this.logger.log(`Fetching international airtime variations from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });

      if (!response.data?.content) {
        this.logger.warn(`Unexpected VTpass response for international airtime variations: ${JSON.stringify(response.data)}`);
      }

      const content = response.data?.content || {};
      const variations = content.variations || content.varations || [];

      this.logger.log(`Retrieved ${variations.length} international airtime variation(s)`);

      return new ApiResponseDto(true, 'International airtime variations retrieved successfully', {
        serviceName: content.ServiceName || 'International Airtime',
        serviceID: content.serviceID || 'foreign-airtime',
        convenienceFee: content.convinience_fee || '0 %',
        variations,
      });
    } catch (error: any) {
      this.logger.error(`Error fetching international airtime variations: ${error.message}`);
      if (error.response) {
        const msg = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch variations';
        throw this.buildApiError(msg, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to fetch variations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ---------------------------------------------------------------------------
  // Purchase + query
  // ---------------------------------------------------------------------------

  async purchase(userPayload: any, dto: PurchaseInternationalAirtimeDto) {
    const serviceID = 'foreign-airtime';
    const request_id = dto.request_id || this.generateVtpassRequestId();
    const url = `${this.getBaseUrl()}/pay`;

    this.logger.log(
      `Purchasing International Airtime: country=${dto.country_code}, operator=${dto.operator_id}, variation=${dto.variation_code}, phone=${dto.billersCode}, request_id=${request_id}`,
    );

    const payload: Record<string, any> = {
      request_id,
      serviceID,
      billersCode: dto.billersCode,
      variation_code: dto.variation_code,
      amount: dto.amount ?? 0,
      phone: dto.phone,
      operator_id: dto.operator_id,
      country_code: dto.country_code,
      product_type_id: dto.product_type_id,
    };

    const description = `International Airtime - ${dto.country_code} - operator=${dto.operator_id} - ${dto.billersCode}`;
    let createdTx: any;
    let vtpassAmount = dto.amount ?? 0;

    try {
      createdTx = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existing) return existing;

        const wallet = await tx.wallet.findUnique({ where: { user_id: userPayload.sub } });
        this.logger.log(`Wallet balance: ${wallet?.current_balance}`);
        if (!wallet || (vtpassAmount > 0 && Number(wallet.current_balance) < vtpassAmount)) {
          throw this.buildApiError('Insufficient wallet balance', HttpStatus.BAD_REQUEST);
        }

        const balance_before = Number(wallet.current_balance);
        const balance_after = balance_before - vtpassAmount;
        await tx.wallet.update({
          where: { user_id: userPayload.sub },
          data: {
            current_balance: balance_after,
            balance_before,
            balance_after,
            all_time_withdrawn: { increment: vtpassAmount },
          },
        });

        this.logger.log(`Wallet balance before: ${balance_before}, after: ${balance_after}`);

        return await tx.transactionHistory.create({
          data: {
            user_id: userPayload.sub,
            amount: vtpassAmount,
            provider: serviceID,
            transaction_type: 'airtime',
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
          } as any,
        });
      });

      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      const txContent = response.data?.content?.transactions || {};
      const responseCode = response.data?.code || '';
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      const isProcessing =
        (responseCode === '000' && (txStatus === 'pending' || txStatus === 'initiated')) ||
        responseCode === '099' ||
        responseDescription.includes('PROCESSING') ||
        responseDescription.includes('PENDING');
      const isDelivered = responseCode === '000' && txStatus === 'delivered';
      const isReversed = responseCode === '040' || txStatus === 'reversed';
      const isFailed =
        responseCode === '016' ||
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
          },
        },
      });

      if (shouldRefund) {
        await this.prisma.wallet.update({
          where: { user_id: userPayload.sub },
          data: { current_balance: { increment: vtpassAmount } },
        });
        this.logger.log(`Refunded ₦${vtpassAmount} to wallet for user ${userPayload.sub}`);
        if (shouldThrow) {
          throw this.buildApiError(errorMessage, HttpStatus.BAD_REQUEST);
        }
      }

      // Fire-and-forget: audit log + stats
      this.auditLogService
        .logTransaction(
          finalStatus === 'success' ? 'AIRTIME_PURCHASE' : finalStatus === 'failed' ? 'AIRTIME_PURCHASE_FAILED' : 'AIRTIME_PURCHASE',
          finalStatus === 'success' ? AuditStatus.SUCCESS : finalStatus === 'failed' ? AuditStatus.FAILURE : AuditStatus.PENDING,
          null,
          { amount: vtpassAmount, currency: 'NGN', balance_before: Number(createdTx.balance_before), balance_after: Number(createdTx.balance_after), transaction_ref: request_id },
          { user_id: userPayload.sub, resource_type: 'TransactionHistory', resource_id: createdTx.id, metadata: { serviceID, country_code: dto.country_code, operator_id: dto.operator_id, vtpass_code: responseCode }, description: `International airtime purchase - ${dto.country_code}` },
        )
        .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

      this.statsService.onTransactionCreated(vtpassAmount, finalStatus, 0).catch((e) => this.logger.warn(`Stats update failed: ${e.message}`));
      if (vtpassAmount > 0) {
        this.statsService.onWalletDebited(vtpassAmount).catch((e) => this.logger.warn(`Stats wallet debit failed: ${e.message}`));
      }

      if (isProcessing) {
        const formattedResponse = {
          id: createdTx.id,
          ...response.data,
          status: 'processing',
          message: 'Transaction is being processed. Use the query endpoint with request_id to check status.',
          wallet_balance: Number(createdTx.balance_after),
        };
        return new ApiResponseDto(true, 'Transaction is being processed', formattedResponse);
      }

      const formattedResponse: any = {
        id: createdTx.id,
        ...response.data,
        wallet_balance: Number(createdTx.balance_after),
      };

      if (finalStatus === 'success') {
        this.pushNotificationService
          .sendTransactionNotification(userPayload.sub, 'airtime', vtpassAmount, 'success', createdTx.id)
          .catch((e) => this.logger.warn(`Push notification failed: ${e.message}`));
      }

      this.logger.log('International airtime purchase request completed');
      return new ApiResponseDto(true, 'International airtime purchase successful', formattedResponse);
    } catch (error: any) {
      this.logger.error(`Error purchasing international airtime: ${error.message}`);

      try {
        const existingForUpdate = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existingForUpdate && existingForUpdate.status === 'pending') {
          await this.prisma.$transaction(async (tx) => {
            await tx.transactionHistory.update({
              where: { transaction_reference: request_id },
              data: {
                status: 'failed',
                meta_data: {
                  request_id,
                  payload: { ...(dto as any) },
                  vtpass_error: error.response?.data || error.message || 'Unknown error',
                },
              },
            });
            if (vtpassAmount > 0) {
              await tx.wallet.update({
                where: { user_id: userPayload.sub },
                data: { current_balance: { increment: vtpassAmount } },
              });
            }
          });
        }
      } catch (updateError: any) {
        this.logger.warn(`Could not update transaction status: ${updateError.message || updateError}`);
      }

      this.auditLogService
        .logTransaction('AIRTIME_PURCHASE_FAILED', AuditStatus.FAILURE, null,
          { amount: vtpassAmount, currency: 'NGN', transaction_ref: request_id },
          { user_id: userPayload.sub, error_message: error.message, metadata: { serviceID: 'foreign-airtime', country_code: dto.country_code, operator_id: dto.operator_id }, description: 'International airtime purchase failed' },
        )
        .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

      this.statsService.onTransactionCreated(vtpassAmount, 'failed', 0).catch((e) => this.logger.warn(`Stats update failed: ${e.message}`));

      if (error instanceof HttpException) throw error;
      if (error.response) {
        const msg = error.response.data?.response_description || error.response.data?.message || 'Failed to purchase international airtime';
        throw this.buildApiError(msg, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to purchase international airtime', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async queryTransaction(userPayload: any, request_id: string) {
    const url = `${this.getBaseUrl()}/requery`;
    this.logger.log(`Querying international airtime transaction: request_id=${request_id}`);

    const existingTx = await this.prisma.transactionHistory.findUnique({
      where: { transaction_reference: request_id },
    });

    if (existingTx && existingTx.user_id !== userPayload.sub) {
      throw this.buildApiError('Transaction not found', HttpStatus.NOT_FOUND);
    }

    try {
      const payload = { request_id };
      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      const txContent = response.data?.content?.transactions || {};
      const responseCode = response.data?.code || '';
      const txStatus = txContent.status?.toLowerCase() || '';

      if (existingTx && existingTx.status === 'pending') {
        let finalStatus: 'pending' | 'success' | 'failed' = 'pending';
        if (responseCode === '000' && txStatus === 'delivered') {
          finalStatus = 'success';
        } else if (
          responseCode === '016' ||
          responseCode === '040' ||
          txStatus === 'failed' ||
          txStatus === 'reversed'
        ) {
          finalStatus = 'failed';
        }

        const metaData = (existingTx.meta_data as any) || {};

        await this.prisma.transactionHistory.update({
          where: { transaction_reference: request_id },
          data: {
            status: finalStatus,
            transaction_number: txContent.transactionId?.toString() || existingTx.transaction_number,
            fee: typeof txContent.commission === 'number'
              ? txContent.commission
              : Number(txContent.commission) || existingTx.fee || 0,
            meta_data: {
              ...metaData,
              vtpass_response: response.data,
              vtpass_status: txStatus,
              vtpass_code: responseCode,
            },
          },
        });

        if (finalStatus === 'failed') {
          const refundAmount = existingTx.amount || 0;
          if (refundAmount > 0) {
            await this.prisma.wallet.update({
              where: { user_id: existingTx.user_id },
              data: { current_balance: { increment: Number(refundAmount) } },
            });
            this.logger.log(`Refunded ₦${refundAmount} to user ${existingTx.user_id}`);
          }
        }

        this.logger.log(`International airtime transaction ${request_id} updated to: ${finalStatus}`);
      }

      return new ApiResponseDto(true, 'Transaction query successful', response.data);
    } catch (error: any) {
      this.logger.error(`Error querying transaction: ${error.message}`);
      if (error instanceof HttpException) throw error;
      if (error.response) {
        const msg = error.response.data?.response_description || error.response.data?.message || 'Failed to query transaction';
        throw this.buildApiError(msg, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to query transaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}


import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { PurchaseInternationalAirtimeDto } from './dto/purchase-international-airtime.dto';
import { CashbackService } from 'src/common/cashback/cashback.service';
import { VtpassTransactionOrchestrator, generateVtpassRequestId } from '../vtpass-transaction.orchestrator';

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
    private readonly cashbackService: CashbackService,
    private readonly orchestrator: VtpassTransactionOrchestrator,
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
    const request_id = dto.request_id || generateVtpassRequestId();

    this.logger.log(
      `Purchasing International Airtime: country=${dto.country_code}, operator=${dto.operator_id}, variation=${dto.variation_code}, phone=${dto.billersCode}, request_id=${request_id}`,
    );

    // Resolve vtpassAmount from operator info or dto.amount
    const vtpassAmount = dto.amount ?? 0;

    const payload: Record<string, any> = {
      request_id,
      serviceID,
      billersCode: dto.billersCode,
      variation_code: dto.variation_code,
      amount: vtpassAmount,
      phone: dto.phone,
      operator_id: dto.operator_id,
      country_code: dto.country_code,
      product_type_id: dto.product_type_id,
    };

    const description = `International Airtime - ${dto.country_code} ${dto.phone}`;

    return this.orchestrator.executePurchase({
      transactionType: 'airtime',
      serviceLabel: 'International Airtime',
      auditAction: 'AIRTIME_PURCHASE',
      auditFailAction: 'AIRTIME_PURCHASE_FAILED',
      cashbackServiceType: 'international_airtime',
      userId: userPayload.sub,
      requestId: request_id,
      chargeAmount: vtpassAmount,
      useCashback: dto.use_cashback === true,
      vtpassPayload: payload,
      description,
      provider: serviceID,
      recipientIdentifier: dto.phone,
      auditMetadata: { serviceID, country_code: dto.country_code, operator_id: dto.operator_id },
    });
  }

  async requeryPendingTransaction(requestId: string): Promise<{ updated: boolean; status?: string }> {
    return this.orchestrator.requeryTransaction(requestId, {
      transactionType: 'airtime',
      serviceLabel: 'International Airtime',
      auditAction: 'AIRTIME_PURCHASE',
      auditFailAction: 'AIRTIME_PURCHASE_FAILED',
      cashbackServiceType: 'international_airtime',
    });
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
            commission: typeof txContent.commission === 'number'
              ? txContent.commission
              : Number(txContent.commission) || existingTx.commission || 0,
            meta_data: {
              ...metaData,
              vtpass_response: response.data,
              vtpass_status: txStatus,
              vtpass_code: responseCode,
            },
          },
        });

        if (finalStatus === 'failed') {
          const meta = (existingTx.meta_data as any) || {};
          const walletRefund = typeof meta.wallet_charged === 'number' ? meta.wallet_charged : Number(existingTx.amount || 0);
          const cashbackRefund = typeof meta.cashback_used === 'number' ? meta.cashback_used : 0;
          if (walletRefund > 0) {
            await this.prisma.wallet.update({
              where: { user_id: existingTx.user_id },
              data: { current_balance: { increment: walletRefund } },
            });
            this.logger.log(`Refunded ₦${walletRefund} to wallet for user ${existingTx.user_id}`);
          }
          if (cashbackRefund > 0) {
            this.cashbackService.refundCashback(existingTx.user_id, cashbackRefund).catch((e) => this.logger.warn(`Cashback refund failed: ${e.message}`));
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


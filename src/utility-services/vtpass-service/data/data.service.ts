import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PurchaseDataDto } from './dto/purchase-data.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { categorizeVariations } from '../variation-categorizer.helper';
import { VtpassTransactionOrchestrator, generateVtpassRequestId } from '../vtpass-transaction.orchestrator';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);
  private readonly credentials: ReturnType<typeof VtpassCredentialsHelper.getCredentials>;

  private readonly apiKey: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly orchestrator: VtpassTransactionOrchestrator,
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

  private getProviderLabelFromServiceId(serviceID: string): string {
    const map: Record<string, string> = {
      'mtn-data': 'MTN',
      'airtel-data': 'AIRTEL',
      'glo-data': 'GLO',
      'etisalat-data': '9MOBILE',
      'smile-direct': 'SMILE',
      'spectranet': 'SPECTRANET',
      'glo-sme-data': 'GLO',
    };
    return map[serviceID] || serviceID.toUpperCase();
  }

  private generateVtpassRequestId(): string {
    return generateVtpassRequestId();
  }


  async getProviderServiceIds(identifier: string = 'data') {
    const url = `${this.getBaseUrl()}/services?identifier=${encodeURIComponent(identifier)}`;
    this.logger.log(`Fetching VTpass service IDs for identifier='${identifier}' from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });

      if (!response.data?.content) {
        this.logger.warn(`Unexpected VTpass response for service IDs (${identifier}): ${JSON.stringify(response.data)}`);
      }

      this.logger.log('Service IDs retrieved successfully');
      return new ApiResponseDto(true, 'Service IDs retrieved successfully', response.data?.content || []);
    } catch (error: any) {
      this.logger.error(`Error fetching VTpass service IDs (${identifier}): ${error.message}`);
      if (error.response) {
        this.logger.error('VTpass API Error Response:', JSON.stringify({
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        }, null, 2));
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch service IDs';
        throw new HttpException(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      if (error.request) {
        this.logger.error('VTpass API Request Error: network/request issue — no response received');
      }
      throw new HttpException('Failed to fetch service IDs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Backward-compatible convenience method specifically for data
  async getDataProviderServiceIds() {
    return this.getProviderServiceIds('data');
  }

  async getVariationCodes(serviceID: string, userPayload?: any) {
    const url = `${this.getBaseUrl()}/service-variations?serviceID=${encodeURIComponent(serviceID)}`;
    this.logger.log(`Fetching variation codes for serviceID='${serviceID}' from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });

      // VTpass response structure: expect response_description and content
      if (!response.data?.content) {
        this.logger.warn(`Unexpected VTpass response for variation codes: ${JSON.stringify(response.data)}`);
      }

      const content = response.data?.content || {};
      const variations = content.variations || content.varations || [];

      // Return variations exactly as they come from VTpass (no markup applied)
      const transformed = variations.map((v: any) => ({ ...v }));

      // Categorize variations based on original prices/names
      const categorized = categorizeVariations(transformed);

      // Build response: counts (per category + total), then content, then categorized + original variations
      const counts = {
        All: categorized.All?.count || 0,
        Daily: categorized.Daily?.count || 0,
        Weekly: categorized.Weekly?.count || 0,
        Monthly: categorized.Monthly?.count || 0,
        Night: categorized.Night?.count || 0,
        Weekend: categorized.Weekend?.count || 0,
        Social: categorized.Social?.count || 0,
        SME: categorized.SME?.count || 0,
        Hynetflex: categorized.Hynetflex?.count || 0,
        'Broadband router': (categorized['Broadband router']?.count) || 0,
        Others: categorized.Others?.count || 0,
        total: transformed.length,
      } as any;
      const result = {
        counts,
        ...content,
        variations_categorized: categorized,
        // Use id-enriched variations for stable keys in clients
        variations: (categorized as any)._all_with_id || transformed,
      };

      this.logger.log(`Variation codes retrieved successfully for ${serviceID}`);
      return new ApiResponseDto(true, `Variation codes retrieved successfully for ${serviceID}`, result);
    } catch (error: any) {
      this.logger.error(`Error fetching variation codes for ${serviceID}: ${error.message}`);
      if (error.response) {
        try {
          this.logger.error('VTpass API Error Response: ' + JSON.stringify(error.response.data));
        } catch {}
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch variation codes';
        throw new HttpException(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      if (error.request) {
        this.logger.error('VTpass API Request Error: network/request issue');
      }
      throw new HttpException('Failed to fetch variation codes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async queryTransactionFromVtPass(userPayload: any, dto: QueryTransactionDto) {
    const url = `${this.getBaseUrl()}/requery`;
    this.logger.log(`Querying VTpass transaction: request_id=${dto.request_id}`);

    try {
      const payload = { request_id: dto.request_id };
      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });
      return new ApiResponseDto(true, 'Transaction status retrieved successfully', response.data);
    } catch (error: any) {
      this.logger.error(`Error querying transaction: ${error.message}`);
      if (error.response) {
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to query transaction';
        throw new HttpException(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to query transaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async purchaseDataFromVtPass(userPayload: any, dto: PurchaseDataDto) {
    const request_id = dto.request_id || this.generateVtpassRequestId();

    this.logger.log(`Purchasing data: serviceID=${dto.serviceID}, variation_code=${dto.variation_code}, billersCode=${dto.billersCode}, phone=${dto.phone}, request_id=${request_id}`);

    // Check for existing transaction (idempotency)
    const existingTx = await this.prisma.transactionHistory.findUnique({
      where: { transaction_reference: request_id }
    });

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userPayload.sub }
    });
    if (!existingUser) {
      throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
    }

    if (existingTx) {
      this.logger.log(`Found existing transaction with request_id=${request_id}, status=${existingTx.status}`);
      if (existingTx.status === 'success') {
        const cachedResponse = (existingTx.meta_data as any)?.vtpass_response;
        return new ApiResponseDto(true, 'Data purchase already completed', cachedResponse || {
          code: '000',
          response_description: 'TRANSACTION SUCCESSFUL',
          requestId: request_id,
          message: 'Transaction already completed'
        });
      }
      const statusMessage = existingTx.status === 'pending'
        ? 'Transaction is still processing'
        : 'Previous transaction attempt failed';
      const cachedResponse = (existingTx.meta_data as any)?.vtpass_response;
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

    // Resolve amount from variation codes if not provided
    let amount = dto.amount;
    if (!amount) {
      const variationResponse = await this.getVariationCodes(dto.serviceID);
      const variations = (variationResponse.data as any)?.variations || [];
      const variation = variations.find((v: any) => v.variation_code === dto.variation_code);
      if (variation) {
        amount = Number(variation.variation_amount);
        this.logger.log(`Amount determined from variation_code: ${amount}`);
      } else {
        throw new HttpException(`Variation code ${dto.variation_code} not found`, HttpStatus.BAD_REQUEST);
      }
    }

    // Compute markup
    const isFriendlyUser = Boolean((userPayload as any)?.is_friendly || (userPayload as any)?.friendlies);
    const generalPct = Number(process.env.DATA_MARKUP_PERCENT || 0);
    const friendlyPct = Number(process.env.DATA_MARKUP_PERCENT_FRIENDLIES || generalPct);
    const markupPercent = isFriendlyUser ? friendlyPct : generalPct;
    const vtpassAmount = Number(amount);
    const underThreshold = vtpassAmount < 300;
    const markupValue = underThreshold ? 0 : (vtpassAmount * markupPercent) / 100;
    const smipayAmount = Math.floor(underThreshold ? vtpassAmount : vtpassAmount + markupValue);

    const provider = this.getProviderLabelFromServiceId(dto.serviceID);
    const providerName = dto.serviceID.split('-')[0];
    const vtpassPayload = {
      request_id,
      serviceID: dto.serviceID,
      billersCode: dto.billersCode,
      variation_code: dto.variation_code,
      amount: vtpassAmount,
      phone: dto.billersCode.trim()
    };

    this.logger.log(`Payload: ${JSON.stringify(vtpassPayload)}`);

    return this.orchestrator.executePurchase({
      transactionType: 'data',
      serviceLabel: 'Data',
      auditAction: 'DATA_PURCHASE',
      auditFailAction: 'DATA_PURCHASE_FAILED',
      cashbackServiceType: 'data',
      userId: userPayload.sub,
      requestId: request_id,
      chargeAmount: smipayAmount,
      vtpassAmount,
      useCashback: dto.use_cashback === true,
      vtpassPayload,
      description: `${provider} DATA - ${dto.billersCode}`,
      provider: providerName,
      recipientIdentifier: dto.billersCode,
      extraTxFields: {
        vtpass_amount: vtpassAmount,
        smipay_amount: smipayAmount,
        markup_percent: markupPercent,
        markup_value: markupValue,
      },
      auditMetadata: { serviceID: dto.serviceID, billersCode: dto.billersCode, markup_value: markupValue },
      markupValue,
    });
  }

  async queryDataTransactionFromVtPass(userPayload: any, dto: QueryTransactionDto) {
    const url = `${this.getBaseUrl()}/api/requery`;

    this.logger.log(`Querying transaction status: request_id=${dto.request_id}`);

    try {
      const payload = {
        request_id: dto.request_id,
      };

      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      this.logger.log('Transaction status queried successfully');
      return new ApiResponseDto(true, 'Transaction status retrieved successfully', response.data);
    } catch (error: any) {
      this.logger.error(`Error querying transaction: ${error.message}`);
      if (error.response) {
        this.logger.error('VTpass API Error Response:', JSON.stringify({
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        }, null, 2));
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to query transaction';
        throw new HttpException(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      if (error.request) {
        this.logger.error('VTpass API Request Error: network/request issue — no response received');
      }
      throw new HttpException('Failed to query transaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Internal method to requery a transaction (called by cron service)
   * Updates transaction status based on VTpass response
   */
  async requeryPendingTransaction(requestId: string): Promise<{ updated: boolean; status?: string }> {
    return this.orchestrator.requeryTransaction(requestId, {
      transactionType: 'data',
      serviceLabel: 'Data',
      auditAction: 'DATA_PURCHASE',
      auditFailAction: 'DATA_PURCHASE_FAILED',
      cashbackServiceType: 'data',
    });
  }
}

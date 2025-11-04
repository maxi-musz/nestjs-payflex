import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PurchaseDataDto } from './dto/purchase-data.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { categorizeVariations } from '../variation-categorizer.helper';

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
        this.logger.error('VTpass API Request Error:', JSON.stringify(error.request, null, 2));
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

      // Apply markup and round down to nearest whole number for client display
      const isFriendlyUser = Boolean(userPayload?.is_friendly || userPayload?.friendlies);
      const generalPct = Number(process.env.DATA_MARKUP_PERCENT || 0);
      const friendlyPct = Number(process.env.DATA_MARKUP_PERCENT_FRIENDLIES || generalPct);
      const markupPercentForList = isFriendlyUser ? friendlyPct : generalPct;

      const transformed = variations.map((v: any) => {
        const vtpassAmount = Number(v.variation_amount);
        if (isNaN(vtpassAmount)) return v;
        const underThreshold = vtpassAmount < 300;
        const markupValue = underThreshold ? 0 : (vtpassAmount * markupPercentForList) / 100;
        const smipayAmountFloat = underThreshold ? vtpassAmount : vtpassAmount + markupValue;
        const roundedDown = Math.floor(smipayAmountFloat);
        const smipayAmountStr = roundedDown.toFixed(2);

        // Update variation_amount
        const updated: any = { ...v, variation_amount: smipayAmountStr, vtpass_amount: vtpassAmount.toFixed(2) };
        // Update name leading price pattern like "N100" → new value
        if (typeof v.name === 'string') {
          updated.name = v.name.replace(/^\s*N\s*[0-9,]+(?:\.\d{1,2})?\s*/i, `N${roundedDown} `);
        }
        return updated;
      });

      // Categorize variations based on transformed prices/names
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
    // Use provided request_id for idempotency, or generate new one
    const request_id = dto.request_id || this.generateVtpassRequestId();
    const url = `${this.getBaseUrl()}/pay`;

    this.logger.log(`Purchasing data: serviceID=${dto.serviceID}, variation_code=${dto.variation_code}, billersCode=${dto.billersCode}, phone=${dto.phone}, request_id=${request_id}`);

    // Check for existing transaction (idempotency)
    const existingTx = await this.prisma.transactionHistory.findUnique({
      where: { transaction_reference: request_id }
    });

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userPayload.sub }
    });

    if (existingTx) {
      // Transaction already exists - return cached result (idempotent)
      this.logger.log(`Found existing transaction with request_id=${request_id}, status=${existingTx.status}`);
      
      if (existingTx.status === 'success') {
        // Return cached successful result
        const cachedResponse = (existingTx.meta_data as any)?.vtpass_response;
        return new ApiResponseDto(true, 'Data purchase already completed', cachedResponse || {
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

    // Prepare markup vars for use across try/catch
    let vtpassAmount = 0;
    let smipayAmount = 0;
    let markupPercent = 0;
    let markupValue = 0;

    try {
      // Get variation amount if not provided
      let amount = dto.amount;
      if (!amount) {
        // Fetch variation codes to get the amount
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

      // Compute markup: prefer friendlies percentage if user is friendly
      const isFriendlyUser = Boolean((userPayload as any)?.is_friendly || (userPayload as any)?.friendlies);
      const generalPct = Number(process.env.DATA_MARKUP_PERCENT || 0);
      const friendlyPct = Number(process.env.DATA_MARKUP_PERCENT_FRIENDLIES || generalPct);
      markupPercent = isFriendlyUser ? friendlyPct : generalPct;
      vtpassAmount = Number(amount);
      const underThreshold = vtpassAmount < 300;
      markupValue = underThreshold ? 0 : (vtpassAmount * markupPercent) / 100;
      smipayAmount = Math.floor(underThreshold ? vtpassAmount : vtpassAmount + markupValue);

      let phone: string;
      if(process.env.NODE_ENV === 'development') {
        phone = "08011111111";
      } else {
        phone = dto.phone?.trim() || existingUser?.phone_number?.trim() || '';
      }

      const payload = {
        request_id,
        serviceID: dto.serviceID,
        billersCode: dto.billersCode,
        variation_code: dto.variation_code,
        amount: vtpassAmount,
        phone
      };

      this.logger.log(`Payload: ${JSON.stringify(payload)}`);

      // Wallet hold + create pending transaction atomically
      const provider = this.getProviderLabelFromServiceId(dto.serviceID);
      const description = `${provider} DATA - ${dto.billersCode}`;
      const createdTx = await this.prisma.$transaction(async (tx) => {
        // Prevent double-deduct: check existing by request_id
        const existing = await tx.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existing) return existing;

        const wallet = await tx.wallet.findUnique({ where: { user_id: userPayload.sub } });
        const amountNum = Number(smipayAmount);
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
          data: ({
            user_id: userPayload.sub,
            amount: amountNum,
            vtpass_amount: vtpassAmount,
            smipay_amount: smipayAmount,
            markup_percent: markupPercent,
            markup_value: markupValue,
            transaction_type: 'data',
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
          } as any)
        });
      });

      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      const txContent = response.data?.content?.transactions || {};
      const isSuccess = response.data?.code === '000' || response.data?.response_description === 'TRANSACTION SUCCESSFUL';
      const txStatus = txContent.status?.toLowerCase() || '';
      const isDelivered = txStatus === 'delivered';
      const finalSuccess = isSuccess && isDelivered;

      if (!finalSuccess) {
        // Extract error message from VTpass response
        const errorReason = response.data?.response_description || 
                           txContent.product_name || 
                           `Transaction failed with code: ${response.data?.code || 'unknown'}`;
        
        this.logger.warn(`VTpass purchase failed: ${errorReason}`, JSON.stringify(response.data));
      }

      await this.prisma.transactionHistory.update({
        where: { transaction_reference: request_id },
        data: {
          status: finalSuccess ? 'success' : 'failed',
          transaction_number: txContent.transactionId?.toString() || null,
          fee: typeof txContent.commission === 'number' ? txContent.commission : Number(txContent.commission) || 0,
          meta_data: {
            ...(createdTx.meta_data as any),
            vtpass_response: response.data,
          }
        }
      });

      // Refund on failure
      if (!finalSuccess) {
        await this.prisma.wallet.update({
          where: { user_id: userPayload.sub },
          data: { current_balance: { increment: Number(smipayAmount) } }
        });
        
        const errorMessage = response.data?.response_description || 
                           `Transaction failed. Status: ${txStatus || 'unknown'}`;
        throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
      }

      const formattedResponse = {
        id: createdTx.id,
        ...response.data,
      };

      this.logger.log('Data purchase request completed successfully');
      return new ApiResponseDto(true, 'Data purchase successful', formattedResponse);
    } catch (error: any) {
      this.logger.error(`Error purchasing data: ${error.message}`);
      
      // Update transaction status to failed and refund only if the pending transaction exists
      try {
        const existingForUpdate = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existingForUpdate) {
          const amount = Number(smipayAmount) || 0;
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
                    billersCode: dto.billersCode,
                    variation_code: dto.variation_code,
                    vtpass_amount: vtpassAmount,
                    smipay_amount: smipayAmount,
                    markup_percent: markupPercent,
                    markup_value: markupValue,
                    phone: dto.phone,
                  },
                  vtpass_error: (error.response?.data || error.message || 'Unknown error')
                } 
              }
            });
            if (amount > 0) {
              await tx.wallet.update({
                where: { user_id: userPayload.sub },
                data: { current_balance: { increment: Number(amount) } }
              });
            }
          });
        }
      } catch (updateError: any) {
        this.logger.warn(`Could not update transaction status: ${updateError.message || updateError}`);
      }
      
      if (error.response) {
        try {
          this.logger.error('VTpass API Error Response: ' + JSON.stringify(error.response.data));
        } catch {}
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to purchase data';
        throw new HttpException(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      if (error.request) {
        this.logger.error('VTpass API Request Error: network/request issue');
      }
      throw new HttpException('Failed to purchase data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
        this.logger.error('VTpass API Request Error:', JSON.stringify(error.request, null, 2));
      }
      throw new HttpException('Failed to query transaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

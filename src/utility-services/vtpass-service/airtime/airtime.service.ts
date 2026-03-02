import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PurchaseAirtimeDto } from './dto/purchase-airtime.dto';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { VtpassTransactionOrchestrator, generateVtpassRequestId } from '../vtpass-transaction.orchestrator';
import { validateCredentialsOnInit, validateBaseUrl } from './airtime.validators';

@Injectable()
export class AirtimeService {
  private readonly logger = new Logger(AirtimeService.name);
  private readonly credentials: ReturnType<typeof VtpassCredentialsHelper.getCredentials>;

  constructor(
    private readonly configService: ConfigService,
    private readonly orchestrator: VtpassTransactionOrchestrator,
  ) {
    this.credentials = VtpassCredentialsHelper.getCredentials(configService);

    this.logger.log(`VTpass mode: ${this.credentials.isDevelopment ? 'SANDBOX' : 'LIVE'} | Base URL: ${this.credentials.baseUrl || 'NOT SET'}`);
    validateCredentialsOnInit(
      { apiKey: this.credentials.apiKey, publicKey: this.credentials.publicKey, secretKey: this.credentials.secretKey, isDevelopment: this.credentials.isDevelopment },
      this.logger,
    );
  }

  private getBaseUrl(): string {
    return validateBaseUrl(this.credentials.baseUrl, this.credentials.isDevelopment);
  }

  private getGetHeaders() {
    return { 'api-key': this.credentials.apiKey, 'public-key': this.credentials.publicKey, 'Content-Type': 'application/json' };
  }

  async getAirtimeProviderServiceIds() {
    const url = `${this.getBaseUrl()}/services?identifier=airtime`;
    this.logger.log(`Fetching VTpass airtime service IDs from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });
      if (!response.data?.content) {
        this.logger.warn(`Unexpected VTpass response for airtime service IDs: ${JSON.stringify(response.data)}`);
      }
      this.logger.log('Airtime service IDs retrieved successfully');
      return new ApiResponseDto(true, 'Airtime service IDs retrieved successfully', response.data?.content || []);
    } catch (error: any) {
      this.logger.error(`Error fetching VTpass airtime service IDs: ${error.message}`);
      if (error.response) {
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch airtime service IDs';
        throw new HttpException(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to fetch airtime service IDs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async purchaseAirtime(userPayload: any, dto: PurchaseAirtimeDto) {
    const request_id = dto.request_id || generateVtpassRequestId();

    return this.orchestrator.executePurchase({
      transactionType: 'airtime',
      serviceLabel: 'Airtime',
      auditAction: 'AIRTIME_PURCHASE',
      auditFailAction: 'AIRTIME_PURCHASE_FAILED',
      cashbackServiceType: 'airtime',
      userId: userPayload.sub,
      requestId: request_id,
      chargeAmount: Number(dto.amount),
      useCashback: dto.use_cashback === true,
      vtpassPayload: { request_id, serviceID: dto.serviceID, amount: dto.amount, phone: dto.phone },
      description: `VTU ${dto.serviceID.toUpperCase()} to ${dto.phone}`,
      provider: dto.serviceID,
      recipientIdentifier: dto.phone,
      auditMetadata: { serviceID: dto.serviceID, phone: dto.phone },
    });
  }

  async requeryPendingTransaction(requestId: string): Promise<{ updated: boolean; status?: string }> {
    return this.orchestrator.requeryTransaction(requestId, {
      transactionType: 'airtime',
      serviceLabel: 'Airtime',
      auditAction: 'AIRTIME_PURCHASE',
      auditFailAction: 'AIRTIME_PURCHASE_FAILED',
      cashbackServiceType: 'airtime',
    });
  }
}

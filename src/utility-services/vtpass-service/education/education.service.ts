import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PurchaseEducationDto } from './dto/purchase-education.dto';
import { VerifyJambProfileDto } from './dto/verify-jamb-profile.dto';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { EmailService } from 'src/common/mailer/email.service';
import { CashbackService } from 'src/common/cashback/cashback.service';
import { VtpassTransactionOrchestrator, generateVtpassRequestId } from '../vtpass-transaction.orchestrator';
import { toUserFriendlyVtpassPurchaseError } from '../vtpass-user-facing-messages';
import { normalizeVtpassResponseCode, determineTransactionStatus } from '../airtime/airtime.validators';
import * as colors from 'colors';

@Injectable()
export class EducationService {
  private readonly logger = new Logger(EducationService.name);
  private readonly credentials: ReturnType<typeof VtpassCredentialsHelper.getCredentials>;

  private readonly apiKey: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly isDevelopment: boolean;

  private static readonly SERVICE_LABELS: Record<string, string> = {
    'waec-registration': 'WAEC Registration PIN',
    'waec': 'WAEC Result Checker PIN',
    'jamb': 'JAMB PIN Vending (UTME & Direct Entry)',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly cashbackService: CashbackService,
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

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildApiError(message: string, status: HttpStatus, data?: any): HttpException {
    return new HttpException(new ApiResponseDto(false, message, data), status);
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

  private getServiceLabel(serviceID: string): string {
    return EducationService.SERVICE_LABELS[serviceID] || serviceID.toUpperCase();
  }

  /**
   * Extract credentials (tokens, PINs, cards) from VTpass education responses.
   * Different products return them differently:
   *   - WAEC Registration: `tokens` array + `purchased_code`
   *   - WAEC Result Checker: `cards` array [{Serial, Pin}] + `purchased_code`
   *   - JAMB: `Pin` field + `purchased_code`
   */
  private extractCredentials(serviceID: string, responseData: any): Record<string, any> {
    const result: Record<string, any> = {};
    const purchasedCode = responseData?.purchased_code || '';

    if (serviceID === 'waec-registration') {
      const tokens = responseData?.tokens || [];
      result.tokens = tokens;
      result.purchased_code = purchasedCode;
      if (tokens.length > 0) {
        result.pin = tokens[0];
      } else if (purchasedCode) {
        const match = purchasedCode.match(/(?:Token|Pin)\s*[:：]\s*(.+)/i);
        result.pin = match ? match[1].trim() : purchasedCode;
      }
    } else if (serviceID === 'waec') {
      const cards = responseData?.cards || [];
      result.cards = cards;
      result.purchased_code = purchasedCode;
      if (cards.length > 0) {
        result.serial = cards[0].Serial || cards[0].serial || null;
        result.pin = cards[0].Pin || cards[0].pin || null;
      } else if (purchasedCode) {
        const serialMatch = purchasedCode.match(/Serial\s*(?:No)?[:：]\s*([^,]+)/i);
        const pinMatch = purchasedCode.match(/[Pp]in[:：]\s*(.+)/);
        result.serial = serialMatch ? serialMatch[1].trim() : null;
        result.pin = pinMatch ? pinMatch[1].trim() : null;
      }
    } else if (serviceID === 'jamb') {
      result.purchased_code = purchasedCode;
      const pinField = responseData?.Pin || '';
      if (pinField) {
        const match = pinField.match(/(?:Pin)\s*[:：]\s*(.+)/i);
        result.pin = match ? match[1].trim() : pinField;
      } else if (purchasedCode) {
        const match = purchasedCode.match(/(?:Pin)\s*[:：]\s*(.+)/i);
        result.pin = match ? match[1].trim() : purchasedCode;
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // 1. Get Variation Codes
  // ---------------------------------------------------------------------------

  async getVariationCodes(serviceID: string) {
    this.logger.log(colors.yellow("Purchasing Education Product"));
    this.logger.log(colors.cyan(`Fetching variation codes for serviceID='${serviceID}'`));

    if (!['waec-registration', 'waec', 'jamb'].includes(serviceID)) {
      throw this.buildApiError('Invalid serviceID. Must be waec-registration, waec, or jamb', HttpStatus.BAD_REQUEST);
    }

    const url = `${this.getBaseUrl()}/service-variations?serviceID=${encodeURIComponent(serviceID)}`;
    this.logger.log(`VTpass URL: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });

      if (!response.data?.content) {
        this.logger.warn(`Unexpected VTpass response for variation codes: ${JSON.stringify(response.data)}`);
      }

      const content = response.data?.content || {};
      const variations = content.variations || content.varations || [];

      this.logger.log(`Retrieved ${variations.length} variation(s) for ${serviceID}`);

      return new ApiResponseDto(true, 'Variation codes retrieved successfully', {
        serviceName: content.ServiceName || this.getServiceLabel(serviceID),
        serviceID: content.serviceID || serviceID,
        convenienceFee: content.convinience_fee || 'N0.00',
        variations,
      });
    } catch (error: any) {
      this.logger.error(`Error fetching variation codes: ${error.message}`);
      if (error instanceof HttpException) throw error;
      if (error.response) {
        const msg = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch variation codes';
        throw this.buildApiError(msg, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to fetch variation codes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Verify JAMB Profile ID
  // ---------------------------------------------------------------------------

  async verifyJambProfile(dto: VerifyJambProfileDto) {
    this.logger.log(colors.cyan(`Verifying JAMB profile: billersCode='${dto.billersCode}' type='${dto.type}'`));

    const url = `${this.getBaseUrl()}/merchant-verify`;

    try {
      const payload = {
        billersCode: dto.billersCode,
        serviceID: 'jamb',
        type: dto.type,
      };

      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      const content = response.data?.content || {};
      const customerName = content.Customer_Name || 'N/A';

      if (!content.Customer_Name) {
        this.logger.warn('JAMB profile verification returned no Customer_Name — may be invalid');
        throw this.buildApiError(
          'Could not verify JAMB Profile ID. Please check the Profile ID and try again.',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`JAMB profile verified — Customer: ${customerName}`);

      return new ApiResponseDto(true, 'JAMB profile verified successfully', response.data);
    } catch (error: any) {
      this.logger.error(`Error verifying JAMB profile: ${error.message}`);
      if (error instanceof HttpException) throw error;
      if (error.response) {
        const msg = error.response.data?.response_description || error.response.data?.message || 'Failed to verify JAMB profile';
        throw this.buildApiError(msg, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to verify JAMB profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Purchase Education Product
  // ---------------------------------------------------------------------------

  async purchase(userPayload: any, dto: PurchaseEducationDto) {
    const serviceLabel = this.getServiceLabel(dto.serviceID);
    this.logger.log(colors.cyan(`Education purchase: ${serviceLabel} | variation=${dto.variation_code} | phone=${dto.phone}`));

    const request_id = dto.request_id || generateVtpassRequestId();
    const quantity = dto.quantity || 1;

    // Resolve the amount from the variation codes (education products have fixed prices)
    let resolvedAmount: number;
    try {
      const variationsRes = await this.getVariationCodes(dto.serviceID);
      const variations: any[] = (variationsRes.data as any)?.variations || [];
      const matched = variations.find((v: any) => v.variation_code === dto.variation_code);

      if (!matched) {
        throw this.buildApiError(
          `Variation code '${dto.variation_code}' not found for ${serviceLabel}. Use the variations endpoint to get valid codes.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      resolvedAmount = Number(matched.variation_amount) * quantity;
      this.logger.log(`Resolved amount: ₦${matched.variation_amount} × ${quantity} = ₦${resolvedAmount}`);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw this.buildApiError('Could not resolve variation price', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Build VTpass payload
    const payload: Record<string, any> = {
      request_id,
      serviceID: dto.serviceID,
      variation_code: dto.variation_code,
      amount: resolvedAmount / quantity, // VTpass expects per-unit amount
      phone: dto.phone,
    };

    if (quantity > 1) {
      payload.quantity = quantity;
    }

    if (dto.serviceID === 'jamb') {
      if (!dto.billersCode) {
        throw this.buildApiError('billersCode (JAMB Profile ID) is required for JAMB purchases', HttpStatus.BAD_REQUEST);
      }
      payload.billersCode = dto.billersCode;
    }

    const description = `${serviceLabel} - ${dto.variation_code}${quantity > 1 ? ` × ${quantity}` : ''}`;

    this.logger.log(`VTpass payload: ${JSON.stringify({ ...payload, request_id: '***' })}`);

    return this.orchestrator.executePurchase({
      transactionType: 'education',
      serviceLabel: 'Education',
      auditAction: 'EDUCATION_PURCHASE',
      auditFailAction: 'EDUCATION_PURCHASE_FAILED',
      cashbackServiceType: 'education',
      userId: userPayload.sub,
      requestId: request_id,
      chargeAmount: resolvedAmount,
      useCashback: dto.use_cashback === true,
      vtpassPayload: payload,
      description,
      provider: dto.serviceID,
      recipientIdentifier: dto.billersCode || dto.phone || '',
      auditMetadata: { serviceID: dto.serviceID, variation_code: dto.variation_code },
      humanizeError: (msg) => this.humanizeVtpassError(msg, dto.serviceID),
      onProcessResponse: (vtpassResponse) => {
        const credentials = this.extractCredentials(dto.serviceID, vtpassResponse);
        return { credentials };
      },
      onSuccess: async (vtpassResponse, txRecord) => {
        try {
          const credentials = this.extractCredentials(dto.serviceID, vtpassResponse);
          const user = await this.prisma.user.findUnique({ where: { id: userPayload.sub }, select: { email: true, first_name: true } });
          if (user?.email) {
            const transactionDate = new Date().toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' });
            await this.emailService.sendEmail(
              user.email,
              `✅ ${serviceLabel} Purchase Successful`,
              this.buildEducationSuccessEmailHtml(
                user.first_name || 'Valued Customer',
                serviceLabel,
                dto.serviceID,
                dto.variation_code,
                resolvedAmount,
                txRecord.transaction_reference,
                transactionDate,
                quantity,
                credentials,
              ),
            );
          }
        } catch (e: any) {
          this.logger.error(`Failed to send education success email: ${e.message}`);
        }
      },
      onEnrichResponse: (vtpassResponse, extraMeta) => ({ credentials: extraMeta.credentials || {} }),
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Query Transaction
  // ---------------------------------------------------------------------------

  async queryTransaction(userPayload: any, request_id: string) {
    const url = `${this.getBaseUrl()}/requery`;
    this.logger.log(colors.cyan(`Querying education transaction: request_id=${request_id}`));

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
      const responseCodeStr = normalizeVtpassResponseCode(response.data?.code);
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      this.logger.log(
        `[Education Query] VTpass raw: code=${JSON.stringify(response.data?.code)}, ` +
        `normalized=${responseCodeStr}, txStatus=${txStatus}, desc="${responseDescription}"`,
      );

      if (existingTx && existingTx.status === 'pending') {
        const { finalStatus, shouldRefund } = determineTransactionStatus(
          responseCodeStr, txStatus, responseDescription, this.logger,
        );

        const metaData = (existingTx.meta_data as any) || {};
        const serviceID = metaData?.serviceID || existingTx.provider || '';
        const credentials = finalStatus === 'success' ? this.extractCredentials(serviceID, response.data) : {};

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
              vtpass_code: responseCodeStr,
              ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
            },
          },
        });

        if (shouldRefund && finalStatus === 'failed') {
          await this.orchestrator.applyVtpassFailureRefundOnce(
            request_id, existingTx.user_id,
            typeof metaData.wallet_charged === 'number' ? metaData.wallet_charged : Number(existingTx.amount || 0),
            typeof metaData.cashback_used === 'number' ? metaData.cashback_used : 0,
            'Education Query',
          );
        }

        this.logger.log(`Transaction ${request_id} updated to: ${finalStatus}`);
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

  // ---------------------------------------------------------------------------
  // 5. Requery Pending (for cron/background use)
  // ---------------------------------------------------------------------------

  async requeryPendingTransaction(requestId: string): Promise<{ updated: boolean; status?: string }> {
    return this.orchestrator.requeryTransaction(requestId, {
      transactionType: 'education',
      serviceLabel: 'Education',
      auditAction: 'EDUCATION_PURCHASE',
      auditFailAction: 'EDUCATION_PURCHASE_FAILED',
      cashbackServiceType: 'education',
      maxRequeryAttempts: 5,
      onSuccess: async (vtpassResponse, txRecord) => {
        try {
          const serviceID = (txRecord.meta_data as any)?.serviceID || txRecord.provider || '';
          const credentials = this.extractCredentials(serviceID, vtpassResponse);
          const user = await this.prisma.user.findUnique({ where: { id: txRecord.user_id }, select: { email: true, first_name: true } });
          if (user?.email) {
            const serviceLabel = this.getServiceLabel(serviceID);
            const meta = (txRecord.meta_data as any) || {};
            const transactionDate = new Date().toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' });
            await this.emailService.sendEmail(
              user.email,
              `✅ ${serviceLabel} Purchase Successful`,
              this.buildEducationSuccessEmailHtml(
                user.first_name || 'Valued Customer',
                serviceLabel,
                serviceID,
                meta.variation_code || '',
                Number(txRecord.amount || 0),
                txRecord.transaction_reference,
                transactionDate,
                meta.quantity || 1,
                credentials,
              ),
            );
          }
        } catch (e: any) {
          this.logger.error(`Failed to send education requery success email: ${e.message}`);
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Error humanizer
  // ---------------------------------------------------------------------------

  private humanizeVtpassError(raw: string, serviceID: string): string {
    const upper = raw.toUpperCase();
    const label = this.getServiceLabel(serviceID);

    if (upper.includes('PRODUCT IS NOT WHITELISTED')) {
      return `${label} is currently unavailable. Please try again later or contact support.`;
    }
    if (upper.includes('INVALID CREDENTIALS')) {
      return 'Service configuration error. Please contact support.';
    }
    if (upper.includes('INVALID') && upper.includes('PROFILE')) {
      return 'Invalid JAMB Profile ID. Please verify and try again.';
    }

    return toUserFriendlyVtpassPurchaseError(raw);
  }

  // ---------------------------------------------------------------------------
  // Email builder
  // ---------------------------------------------------------------------------

  private buildEducationSuccessEmailHtml(
    firstName: string,
    serviceLabel: string,
    serviceID: string,
    variationCode: string,
    amount: number,
    reference: string,
    date: string,
    quantity: number,
    credentials: Record<string, any>,
  ): string {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);

    let credentialsSection = '';

    if (serviceID === 'waec-registration') {
      const pin = credentials.pin || credentials.purchased_code || 'N/A';
      credentialsSection = `
        <tr><td style="padding:8px 0;color:#666;">Token/PIN</td><td style="padding:8px 0;font-weight:bold;font-size:16px;letter-spacing:1px;color:#1a7f37;">${pin}</td></tr>
      `;
    } else if (serviceID === 'waec') {
      const cards = credentials.cards || [];
      if (cards.length > 0) {
        const cardRows = cards.map((c: any, i: number) =>
          `<tr><td style="padding:8px 0;color:#666;">Card ${cards.length > 1 ? i + 1 : ''} Serial</td><td style="padding:8px 0;font-weight:bold;">${c.Serial || c.serial || 'N/A'}</td></tr>
           <tr><td style="padding:8px 0;color:#666;">Card ${cards.length > 1 ? i + 1 : ''} PIN</td><td style="padding:8px 0;font-weight:bold;font-size:16px;letter-spacing:1px;color:#1a7f37;">${c.Pin || c.pin || 'N/A'}</td></tr>`
        ).join('');
        credentialsSection = cardRows;
      } else {
        credentialsSection = `
          <tr><td style="padding:8px 0;color:#666;">Serial</td><td style="padding:8px 0;font-weight:bold;">${credentials.serial || 'N/A'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">PIN</td><td style="padding:8px 0;font-weight:bold;font-size:16px;letter-spacing:1px;color:#1a7f37;">${credentials.pin || 'N/A'}</td></tr>
        `;
      }
    } else if (serviceID === 'jamb') {
      const pin = credentials.pin || credentials.purchased_code || 'N/A';
      credentialsSection = `
        <tr><td style="padding:8px 0;color:#666;">JAMB PIN</td><td style="padding:8px 0;font-weight:bold;font-size:16px;letter-spacing:1px;color:#1a7f37;">${pin}</td></tr>
      `;
    }

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a7f37;">Education Purchase Successful</h2>
        <p>Hi ${firstName},</p>
        <p>Your education product purchase has been completed successfully.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px 0;color:#666;">Product</td><td style="padding:8px 0;font-weight:bold;">${serviceLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Plan</td><td style="padding:8px 0;font-weight:bold;">${variationCode}</td></tr>
          ${quantity > 1 ? `<tr><td style="padding:8px 0;color:#666;">Quantity</td><td style="padding:8px 0;font-weight:bold;">${quantity}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#666;">Amount</td><td style="padding:8px 0;font-weight:bold;">${formattedAmount}</td></tr>
          ${credentialsSection}
          <tr><td style="padding:8px 0;color:#666;">Reference</td><td style="padding:8px 0;">${reference}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Date</td><td style="padding:8px 0;">${date}</td></tr>
        </table>
        <p style="background:#f0fdf4;padding:12px;border-radius:8px;border:1px solid #bbf7d0;"><strong>Important:</strong> Please save or screenshot the PIN/credentials above. Keep this email for your records.</p>
        <p style="color:#999;font-size:12px;margin-top:30px;">This is an automated message from SmiPay. Do not reply to this email.</p>
      </div>
    `;
  }
}

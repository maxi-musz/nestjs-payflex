import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PurchaseEducationDto } from './dto/purchase-education.dto';
import { VerifyJambProfileDto } from './dto/verify-jamb-profile.dto';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { EmailService } from 'src/common/mailer/email.service';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';
import { StatsService } from 'src/common/stats/stats.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { CashbackService, PaymentSplit } from 'src/common/cashback/cashback.service';
import { ReferralService } from 'src/referral/referral.service';
import { FirstTxRewardService } from 'src/common/first-tx-reward/first-tx-reward.service';
import { AuditStatus } from '@prisma/client';
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
    private readonly auditLogService: AuditLogService,
    private readonly statsService: StatsService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly cashbackService: CashbackService,
    private readonly referralService: ReferralService,
    private readonly firstTxRewardService: FirstTxRewardService,
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

  private generateVtpassRequestId(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const dateStr =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}`;
    const rand = Math.random().toString(36).slice(2, 14);
    return `${dateStr}${rand}`;
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

    const request_id = dto.request_id || this.generateVtpassRequestId();
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

    const url = `${this.getBaseUrl()}/pay`;
    const description = `${serviceLabel} - ${dto.variation_code}${quantity > 1 ? ` × ${quantity}` : ''}`;

    this.logger.log(`VTpass payload: ${JSON.stringify({ ...payload, request_id: '***' })}`);

    let split: PaymentSplit = { walletCharge: resolvedAmount, cashbackCharge: 0, cashbackBefore: 0, cashbackAfter: 0 };
    split = await this.cashbackService.resolvePayment(userPayload.sub, resolvedAmount, dto.use_cashback === true);

    let createdTx: any;

    try {
      // Atomic: check idempotency, debit wallet, create transaction
      createdTx = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existing) return existing;

        const wallet = await tx.wallet.findUnique({ where: { user_id: userPayload.sub } });
        this.logger.log(`Wallet balance: ${wallet?.current_balance}`);
        if (!wallet || Number(wallet.current_balance) < split.walletCharge) {
          throw this.buildApiError('Insufficient wallet balance', HttpStatus.BAD_REQUEST);
        }

        const balance_before = Number(wallet.current_balance);
        const balance_after = balance_before - split.walletCharge;
        if (split.walletCharge > 0) {
          await tx.wallet.update({
            where: { user_id: userPayload.sub },
            data: {
              current_balance: balance_after,
              balance_before,
              balance_after,
              all_time_withdrawn: { increment: split.walletCharge },
            },
          });
        }
        this.logger.log(`Wallet balance before: ${balance_before}, after: ${balance_after}${split.cashbackCharge > 0 ? ` (₦${split.cashbackCharge} from cashback)` : ''}`);

        return await tx.transactionHistory.create({
          data: {
            user_id: userPayload.sub,
            amount: resolvedAmount,
            provider: dto.serviceID,
            transaction_type: 'education',
            credit_debit: 'debit',
            description,
            status: 'pending',
            recipient_mobile: dto.phone,
            payment_method: 'wallet',
            payment_channel: 'other',
            transaction_reference: request_id,
            balance_before,
            balance_after,
            meta_data: { ...payload, cashback_used: split.cashbackCharge, wallet_charged: split.walletCharge },
          } as any,
        });
      });

      // Call VTpass
      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      const txContent = response.data?.content?.transactions || {};
      const responseCode = response.data?.code || '';
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      // Status determination (same pattern as other services)
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

      // Extract credentials (tokens, PINs, cards)
      const credentials = this.extractCredentials(dto.serviceID, response.data);

      // Update transaction record
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
            credentials,
          },
        },
      });

      // Refund if needed
      if (shouldRefund) {
        if (split.walletCharge > 0) {
          await this.prisma.wallet.update({
            where: { user_id: userPayload.sub },
            data: { current_balance: { increment: split.walletCharge } },
          });
        }
        if (split.cashbackCharge > 0) {
          this.cashbackService.refundCashback(userPayload.sub, split.cashbackCharge).catch((e) => this.logger.warn(`Cashback refund failed: ${e.message}`));
        }
        this.logger.log(`Refunded ₦${split.walletCharge} to wallet${split.cashbackCharge > 0 ? `, ₦${split.cashbackCharge} to cashback` : ''} for user ${userPayload.sub}`);
        if (shouldThrow) {
          throw this.buildApiError(this.humanizeVtpassError(errorMessage, dto.serviceID), HttpStatus.BAD_REQUEST);
        }
      }

      // Fire-and-forget: audit log + stats
      this.auditLogService
        .logTransaction(
          finalStatus === 'success' ? 'EDUCATION_PURCHASE' : finalStatus === 'failed' ? 'EDUCATION_PURCHASE_FAILED' : 'EDUCATION_PURCHASE',
          finalStatus === 'success' ? AuditStatus.SUCCESS : finalStatus === 'failed' ? AuditStatus.FAILURE : AuditStatus.PENDING,
          null,
          { amount: resolvedAmount, currency: 'NGN', balance_before: Number(createdTx.balance_before), balance_after: Number(createdTx.balance_after), transaction_ref: request_id },
          { user_id: userPayload.sub, resource_type: 'TransactionHistory', resource_id: createdTx.id, metadata: { serviceID: dto.serviceID, variation_code: dto.variation_code, vtpass_code: responseCode } },
        )
        .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

      this.statsService.onTransactionCreated(resolvedAmount, finalStatus, 0).catch((e) => this.logger.warn(`Stats update failed: ${e.message}`));
      this.statsService.onWalletDebited(resolvedAmount).catch((e) => this.logger.warn(`Stats wallet debit failed: ${e.message}`));

      // Processing response
      if (isProcessing) {
        const formattedResponse = {
          id: createdTx.id,
          ...response.data,
          status: 'processing',
          message: 'Transaction is being processed. Use the query endpoint with request_id to check status.',
          wallet_balance: Number(createdTx.balance_after),
          credentials,
        };
        return new ApiResponseDto(true, 'Transaction is being processed', formattedResponse);
      }

      // Success response
      const formattedResponse: any = {
        id: createdTx.id,
        ...response.data,
        wallet_balance: Number(createdTx.balance_after),
        credentials,
      };

      if (finalStatus === 'success') {
        this.pushNotificationService
          .sendTransactionNotification(userPayload.sub, 'education', resolvedAmount, 'success', createdTx.id)
          .catch((e) => this.logger.warn(`Push notification failed: ${e.message}`));
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: userPayload.sub },
            select: { email: true, first_name: true },
          });

          if (user?.email) {
            const transactionDate = new Date().toLocaleString('en-NG', {
              dateStyle: 'long',
              timeStyle: 'short',
            });

            await this.emailService.sendEmail(
              user.email,
              `✅ ${serviceLabel} Purchase Successful`,
              this.buildEducationSuccessEmailHtml(
                user.first_name || 'Valued Customer',
                serviceLabel,
                dto.serviceID,
                dto.variation_code,
                resolvedAmount,
                request_id,
                transactionDate,
                quantity,
                credentials,
              ),
            );
          }
        } catch (emailError: any) {
          this.logger.error(`Failed to send education purchase success email: ${emailError.message}`);
        }

        this.cashbackService
          .processCashback({ userId: userPayload.sub, amount: resolvedAmount, serviceType: 'education', transactionRef: request_id })
          .catch((e) => this.logger.warn(`Cashback processing failed: ${e.message}`));

        this.referralService
          .checkAndTriggerReward(userPayload.sub, resolvedAmount)
          .catch((e) => this.logger.warn(`Referral reward check failed: ${e.message}`));

        this.firstTxRewardService
          .checkAndReward({ userId: userPayload.sub, amount: resolvedAmount, transactionType: 'education', transactionRef: request_id })
          .catch((e) => this.logger.warn(`First-tx reward check failed: ${e.message}`));
      }

      this.logger.log('Education purchase request completed');
      return new ApiResponseDto(true, 'Education purchase successful', formattedResponse);
    } catch (error: any) {
      this.logger.error(`Error purchasing education product: ${error.message}`);

      try {
        const existingForUpdate = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existingForUpdate && existingForUpdate.status === 'pending') {
          const meta = (existingForUpdate.meta_data as any) || {};
          const walletRefund = typeof meta.wallet_charged === 'number' ? meta.wallet_charged : resolvedAmount;
          const cashbackRefund = typeof meta.cashback_used === 'number' ? meta.cashback_used : 0;
          await this.prisma.transactionHistory.update({
            where: { transaction_reference: request_id },
            data: {
              status: 'failed',
              meta_data: {
                ...meta,
                request_id,
                payload: { ...(dto as any) },
                vtpass_error: error.response?.data || error.message || 'Unknown error',
              },
            },
          });
          if (walletRefund > 0) {
            await this.prisma.wallet.update({
              where: { user_id: userPayload.sub },
              data: { current_balance: { increment: walletRefund } },
            });
          }
          if (cashbackRefund > 0) {
            this.cashbackService.refundCashback(userPayload.sub, cashbackRefund).catch((e) => this.logger.warn(`Cashback refund failed: ${e.message}`));
          }
        }
      } catch (updateError: any) {
        this.logger.warn(`Could not update transaction status: ${updateError.message || updateError}`);
      }

      this.auditLogService
        .logTransaction('EDUCATION_PURCHASE_FAILED', AuditStatus.FAILURE, null,
          { amount: resolvedAmount, currency: 'NGN', transaction_ref: request_id },
          { user_id: userPayload.sub, error_message: error.message, metadata: { serviceID: dto.serviceID, variation_code: dto.variation_code } },
        )
        .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

      this.statsService.onTransactionCreated(resolvedAmount, 'failed', 0).catch((e) => this.logger.warn(`Stats update failed: ${e.message}`));

      if (error instanceof HttpException) throw error;
      if (error.response) {
        const rawMessage = error.response.data?.response_description || error.response.data?.message || 'Failed to purchase education product';
        throw this.buildApiError(this.humanizeVtpassError(rawMessage, dto.serviceID), error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to purchase education product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
        const serviceID = metaData?.serviceID || existingTx.provider || '';
        const credentials = finalStatus === 'success' ? this.extractCredentials(serviceID, response.data) : {};

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
              ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
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

  async requeryPendingTransaction(requestId: string) {
    const url = `${this.getBaseUrl()}/requery`;
    this.logger.log(`[Cron] Requerying education transaction: ${requestId}`);

    try {
      const transaction = await this.prisma.transactionHistory.findUnique({
        where: { transaction_reference: requestId },
      });

      if (!transaction || transaction.status !== 'pending') {
        this.logger.log(`[Cron] Transaction ${requestId} not pending or not found, skipping`);
        return { updated: false };
      }

      const metaData = (transaction.meta_data as any) || {};
      const requeryCount = metaData.requery_count || 0;
      if (requeryCount >= 5) {
        this.logger.warn(`[Cron] Transaction ${requestId} has been requeried ${requeryCount} times, skipping`);
        return { updated: false };
      }

      const transactionAge = Date.now() - transaction.createdAt.getTime();
      const maxAge = 30 * 60 * 1000;
      if (transactionAge > maxAge) {
        this.logger.warn(`[Cron] Transaction ${requestId} is too old (${Math.round(transactionAge / 60000)} minutes), skipping`);
        return { updated: false };
      }

      const payload = { request_id: requestId };
      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      const txContent = response.data?.content?.transactions || {};
      const responseCode = response.data?.code || '';
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      const isDelivered = responseCode === '000' && txStatus === 'delivered';
      const isReversed = responseCode === '040' || txStatus === 'reversed';
      const isFailed = responseCode === '016' || (responseCode === '000' && txStatus === 'failed');
      const isProcessing =
        (responseCode === '000' && (txStatus === 'pending' || txStatus === 'initiated')) ||
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

      const serviceID = metaData?.serviceID || transaction.provider || '';
      const credentials = finalStatus === 'success' ? this.extractCredentials(serviceID, response.data) : {};

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
              ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
            },
          },
        });

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

      if (finalStatus !== 'pending') {
        this.auditLogService
          .logTransaction(
            finalStatus === 'success' ? 'EDUCATION_PURCHASE' : 'EDUCATION_PURCHASE_FAILED',
            finalStatus === 'success' ? AuditStatus.SUCCESS : AuditStatus.FAILURE,
            null,
            { amount: transaction.amount || 0, currency: 'NGN', transaction_ref: requestId },
            { user_id: transaction.user_id, resource_type: 'TransactionHistory', resource_id: transaction.id, description: `[Cron requery] Education transaction resolved to ${finalStatus}` },
          )
          .catch((e) => this.logger.warn(`[Cron] Audit log failed: ${e.message}`));

        this.statsService
          .onTransactionStatusChanged('pending', finalStatus, transaction.amount || 0, 0)
          .catch((e) => this.logger.warn(`[Cron] Stats update failed: ${e.message}`));

        if (finalStatus === 'success') {
          this.pushNotificationService
            .sendTransactionNotification(transaction.user_id, 'education', transaction.amount || 0, 'success', transaction.id)
            .catch((e) => this.logger.warn(`[Cron] Push notification failed: ${e.message}`));

          this.cashbackService
            .processCashback({ userId: transaction.user_id, amount: Number(transaction.amount || 0), serviceType: 'education', transactionRef: requestId })
            .catch((e) => this.logger.warn(`[Cron] Cashback processing failed: ${e.message}`));

          this.referralService
            .checkAndTriggerReward(transaction.user_id, Number(transaction.amount || 0))
            .catch((e) => this.logger.warn(`[Cron] Referral reward check failed: ${e.message}`));

          this.firstTxRewardService
            .checkAndReward({ userId: transaction.user_id, amount: Number(transaction.amount || 0), transactionType: 'education', transactionRef: requestId })
            .catch((e) => this.logger.warn(`[Cron] First-tx reward check failed: ${e.message}`));
        }
      }

      return { updated: true, status: finalStatus };
    } catch (error: any) {
      this.logger.error(`[Cron] Error querying transaction ${requestId}: ${error.message}`);
      return { updated: false };
    }
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
    if (upper.includes('INSUFFICIENT')) {
      return 'Service provider balance is low. Please try again later.';
    }
    if (upper.includes('INVALID') && upper.includes('PROFILE')) {
      return 'Invalid JAMB Profile ID. Please verify and try again.';
    }

    return `Provider error: ${raw}`;
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

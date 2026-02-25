import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PurchaseElectricityDto } from './dto/purchase-electricity.dto';
import { VerifyMeterDto } from './dto/verify-meter.dto';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { EmailService } from 'src/common/mailer/email.service';
import * as colors from 'colors';

@Injectable()
export class ElectricityService {
  private readonly logger = new Logger(ElectricityService.name);
  private readonly credentials: ReturnType<typeof VtpassCredentialsHelper.getCredentials>;

  private readonly apiKey: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly isDevelopment: boolean;

  private static readonly DISCO_LABELS: Record<string, string> = {
    'ikeja-electric': 'IKEDC (Ikeja Electric)',
    'eko-electric': 'EKEDC (Eko Electric)',
    'kano-electric': 'KEDCO (Kano Electric)',
    'portharcourt-electric': 'PHED (Port Harcourt Electric)',
    'jos-electric': 'JED (Jos Electric)',
    'ibadan-electric': 'IBEDC (Ibadan Electric)',
    'kaduna-electric': 'KAEDCO (Kaduna Electric)',
    'abuja-electric': 'AEDC (Abuja Electric)',
    'enugu-electric': 'EEDC (Enugu Electric)',
    'benin-electric': 'BEDC (Benin Electric)',
    'aba-electric': 'ABA (Aba Electric)',
    'yola-electric': 'YEDC (Yola Electric)',
  };

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
   * Different discos return the electricity token in different response fields.
   * This normalizes extraction across all 12 providers.
   */
  private extractToken(responseData: any): string | null {
    const raw =
      responseData.token ||
      responseData.Token ||
      responseData.mainToken ||
      responseData.purchased_code ||
      null;

    if (!raw || typeof raw !== 'string') return null;

    const cleaned = raw
      .replace(/^Token\s*:\s*/i, '')
      .replace(/^token:\s*/i, '')
      .trim();

    return cleaned || null;
  }

  private getDiscoLabel(serviceID: string): string {
    return ElectricityService.DISCO_LABELS[serviceID] || serviceID.toUpperCase();
  }

  /**
   * List electricity distribution companies (discos)
   */
  async getElectricityProviderServiceIds() {
    this.logger.log(colors.cyan(`Getting electricity provider service IDs`));
    const identifier = 'electricity-bill';
    const url = `${this.getBaseUrl()}/services?identifier=${encodeURIComponent(identifier)}`;
    this.logger.log(`Fetching VTpass electricity service IDs for identifier='${identifier}' from: ${url}`);

    try {
      const response = await axios.get(url, { headers: this.getGetHeaders() });

      if (!response.data?.content) {
        this.logger.warn(`Unexpected VTpass response for electricity service IDs: ${JSON.stringify(response.data)}`);
      }

      this.logger.log('Electricity service IDs retrieved successfully');
      return new ApiResponseDto(true, 'Electricity service IDs retrieved successfully', response.data?.content || []);
    } catch (error: any) {
      this.logger.error(`Error fetching VTpass electricity service IDs: ${error.message}`);
      if (error.response) {
        try { this.logger.error('VTpass API Error Response: ' + JSON.stringify(error.response.data)); } catch {}
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to fetch electricity service IDs';
        throw this.buildApiError(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      if (error.request) {
        this.logger.error('VTpass API Request Error: network/request issue');
      }
      throw this.buildApiError('Failed to fetch electricity service IDs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Verify a prepaid or postpaid meter number before purchase
   */
  async verifyMeter(dto: VerifyMeterDto) {
    const url = `${this.getBaseUrl()}/merchant-verify`;
    this.logger.log(`Verifying meter: billersCode='${dto.billersCode}' serviceID='${dto.serviceID}' type='${dto.type}'`);

    try {
      const payload = {
        billersCode: dto.billersCode,
        serviceID: dto.serviceID,
        type: dto.type,
      };
      const response = await axios.post(url, payload, { headers: this.getPostHeaders() });

      if (response.data?.content?.WrongBillersCode) {
        throw this.buildApiError('Invalid meter number. Please check and try again.', HttpStatus.BAD_REQUEST);
      }

      const content = response.data?.content || {};
      const customerName = content.Customer_Name || 'N/A';
      const minPurchase = content.Min_Purchase_Amount || 'N/A';
      const serviceBand = content.Service_Band || 'N/A';
      this.logger.log(`Meter verified — Customer: ${customerName}, Min_Purchase_Amount: ${minPurchase}, Service_Band: ${serviceBand}`);

      return new ApiResponseDto(true, 'Meter verified successfully', response.data);
    } catch (error: any) {
      this.logger.error(`Error verifying meter: ${error.message}`);
      if (error instanceof HttpException) throw error;
      if (error.response) {
        const message = error.response.data?.response_description || error.response.data?.message || 'Failed to verify meter number';
        throw this.buildApiError(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to verify meter number', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Query transaction status and auto-update + refund if needed
   */
  async queryTransaction(userPayload: any, request_id: string) {
    const url = `${this.getBaseUrl()}/requery`;
    this.logger.log(`Querying electricity transaction: request_id=${request_id}`);

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

        if (finalStatus !== 'pending') {
          await this.prisma.$transaction(async (tx) => {
            await tx.transactionHistory.update({
              where: { transaction_reference: request_id },
              data: {
                status: finalStatus,
                transaction_number: txContent.transactionId?.toString() || existingTx.transaction_number,
                meta_data: {
                  ...(existingTx.meta_data as any),
                  vtpass_requery: response.data,
                  vtpass_status: txStatus,
                  vtpass_code: responseCode,
                },
              },
            });

            if (finalStatus === 'failed') {
              await tx.wallet.update({
                where: { user_id: userPayload.sub },
                data: { current_balance: { increment: Number(existingTx.amount) } },
              });
              this.logger.log(`Refunded ${existingTx.amount} for failed electricity tx ${request_id}`);
            }
          });
        }
      }

      const token = this.extractToken(response.data);
      const responseWithToken = {
        ...response.data,
        ...(token ? { electricity_token: token } : {}),
      };

      return new ApiResponseDto(true, 'Transaction status retrieved successfully', responseWithToken);
    } catch (error: any) {
      this.logger.error(`Error querying electricity transaction: ${error.message}`);
      if (error.response) {
        const message =
          error.response.data?.response_description ||
          error.response.data?.message ||
          'Failed to query transaction';
        throw this.buildApiError(message, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to query transaction status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Purchase electricity (prepaid token vending or postpaid bill payment)
   */
  async purchase(userPayload: any, dto: PurchaseElectricityDto) {
    const request_id = dto.request_id || this.generateVtpassRequestId();
    const url = `${this.getBaseUrl()}/pay`;
    const discoLabel = this.getDiscoLabel(dto.serviceID);
    this.logger.log(`Purchasing electricity: serviceID=${dto.serviceID}, billersCode=${dto.billersCode}, type=${dto.variation_code}, amount=${dto.amount}, request_id=${request_id}`);

    const existingTx = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
    if (existingTx) {
      if (existingTx.status === 'success') {
        const cachedResponse = (existingTx.meta_data as any)?.vtpass_response;
        return new ApiResponseDto(true, 'Electricity purchase already completed', cachedResponse || { requestId: request_id });
      }
      const cachedResponse = (existingTx.meta_data as any)?.vtpass_response;
      return new ApiResponseDto(
        false,
        existingTx.status === 'pending' ? 'Transaction is still processing' : 'Previous transaction attempt failed',
        cachedResponse || { requestId: request_id, status: existingTx.status },
      );
    }

    const amountNum = Number(dto.amount);

    try {
      const payload = {
        request_id,
        serviceID: dto.serviceID,
        billersCode: dto.billersCode,
        variation_code: dto.variation_code,
        amount: amountNum,
        phone: dto.phone,
      };

      const description = `${discoLabel} ${dto.variation_code.toUpperCase()}`;
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

        this.logger.log(`Wallet balance before: ${balance_before}, after: ${balance_after}`);

        return await tx.transactionHistory.create({
          data: {
            user_id: userPayload.sub,
            amount: amountNum,
            provider: dto.serviceID,
            transaction_type: 'electricity',
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

      const token = dto.variation_code === 'prepaid' ? this.extractToken(response.data) : null;

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
            ...(token ? { electricity_token: token } : {}),
          },
        },
      });

      if (shouldRefund) {
        await this.prisma.wallet.update({
          where: { user_id: userPayload.sub },
          data: { current_balance: { increment: amountNum } },
        });
        this.logger.log(`Refunded ₦${amountNum} to wallet for user ${userPayload.sub}`);
        if (shouldThrow) {
          throw this.buildApiError(this.humanizeVtpassError(errorMessage, dto.serviceID), HttpStatus.BAD_REQUEST);
        }
      }

      if (isProcessing) {
        const formattedResponse = {
          id: createdTx.id,
          ...response.data,
          status: 'processing',
          message: 'Transaction is being processed. Use the query endpoint with request_id to check status.',
          wallet_balance: Number(createdTx.balance_after),
          ...(token ? { electricity_token: token } : {}),
        };
        return new ApiResponseDto(true, 'Transaction is being processed', formattedResponse);
      }

      const formattedResponse: any = {
        id: createdTx.id,
        ...response.data,
        wallet_balance: Number(createdTx.balance_after),
      };

      if (token) {
        formattedResponse.electricity_token = token;
      }

      if (finalStatus === 'success') {
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
              `✅ ${discoLabel} Electricity Payment Successful - ₦${amountNum.toLocaleString()}`,
              this.buildElectricitySuccessEmailHtml(
                user.first_name || 'Valued Customer',
                discoLabel,
                dto.billersCode,
                dto.variation_code,
                amountNum,
                request_id,
                transactionDate,
                token,
              ),
            );
            this.logger.log(`Success email sent to ${user.email} for electricity purchase`);
          }
        } catch (emailError: any) {
          this.logger.error(`Failed to send electricity purchase success email: ${emailError.message}`);
        }
      }

      this.logger.log('Electricity purchase request completed');
      return new ApiResponseDto(true, 'Electricity purchase successful', formattedResponse);
    } catch (error: any) {
      this.logger.error(`Error purchasing electricity: ${error.message}`);
      try {
        const existingForUpdate = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existingForUpdate) {
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
            await tx.wallet.update({
              where: { user_id: userPayload.sub },
              data: { current_balance: { increment: amountNum } },
            });
          });
        }
      } catch (updateError: any) {
        this.logger.warn(`Could not update transaction status: ${updateError.message || updateError}`);
      }
      if (error instanceof HttpException) throw error;
      if (error.response) {
        const rawMessage = error.response.data?.response_description || error.response.data?.message || 'Failed to purchase electricity';
        const friendlyMessage = this.humanizeVtpassError(rawMessage, dto.serviceID);
        throw this.buildApiError(friendlyMessage, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw this.buildApiError('Failed to purchase electricity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Internal method to requery a pending transaction (called by cron service)
   */
  async requeryPendingTransaction(requestId: string): Promise<{ updated: boolean; status?: string }> {
    const url = `${this.getBaseUrl()}/requery`;
    this.logger.log(`[Cron] Querying pending electricity transaction: request_id=${requestId}`);

    try {
      const transaction = await this.prisma.transactionHistory.findUnique({
        where: { transaction_reference: requestId },
      });

      if (!transaction) {
        this.logger.warn(`[Cron] Transaction not found: ${requestId}`);
        return { updated: false };
      }

      if (transaction.status === 'success') {
        this.logger.log(`[Cron] Transaction ${requestId} already successful, skipping`);
        return { updated: false, status: 'success' };
      }

      if (transaction.status === 'failed') {
        this.logger.log(`[Cron] Transaction ${requestId} already failed, skipping`);
        return { updated: false, status: 'failed' };
      }

      const metaData = (transaction.meta_data as any) || {};
      const requeryCount = metaData.requery_count || 0;
      const maxRequeryAttempts = 3;

      if (requeryCount >= maxRequeryAttempts) {
        this.logger.warn(`[Cron] Transaction ${requestId} exceeded max requery attempts (${maxRequeryAttempts}), skipping`);
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
      return { updated: false };
    }
  }

  private humanizeVtpassError(raw: string, serviceID: string): string {
    const upper = raw.toUpperCase();
    const disco = this.getDiscoLabel(serviceID);

    if (upper.includes('BELOW MINIMUM AMOUNT')) {
      return `Amount is below the minimum allowed by ${disco}. Please verify your meter first — the response includes the minimum purchase amount for your meter.`;
    }
    if (upper.includes('ABOVE MAXIMUM AMOUNT')) {
      return `Amount exceeds the maximum allowed by ${disco}. Please reduce the amount and try again.`;
    }
    if (upper.includes('INVALID METER') || upper.includes('WRONG BILLERS')) {
      return `Invalid meter number. Please verify your meter number and try again.`;
    }
    if (upper.includes('PRODUCT IS NOT WHITELISTED')) {
      return `${disco} is currently unavailable. Please try again later or contact support.`;
    }
    if (upper.includes('INVALID CREDENTIALS')) {
      return `Service configuration error. Please contact support.`;
    }

    return `Provider error: ${raw}`;
  }

  private buildElectricitySuccessEmailHtml(
    firstName: string,
    discoLabel: string,
    meterNumber: string,
    meterType: string,
    amount: number,
    reference: string,
    date: string,
    token: string | null,
  ): string {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);

    const tokenSection = token
      ? `<tr><td style="padding:8px 0;color:#666;">Electricity Token</td><td style="padding:8px 0;font-weight:bold;font-size:18px;letter-spacing:2px;color:#1a7f37;">${token}</td></tr>`
      : '';

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a7f37;">Electricity Payment Successful</h2>
        <p>Hi ${firstName},</p>
        <p>Your electricity payment has been completed successfully.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px 0;color:#666;">Provider</td><td style="padding:8px 0;font-weight:bold;">${discoLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Meter Number</td><td style="padding:8px 0;font-weight:bold;">${meterNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Meter Type</td><td style="padding:8px 0;font-weight:bold;">${meterType.toUpperCase()}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Amount</td><td style="padding:8px 0;font-weight:bold;">${formattedAmount}</td></tr>
          ${tokenSection}
          <tr><td style="padding:8px 0;color:#666;">Reference</td><td style="padding:8px 0;">${reference}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Date</td><td style="padding:8px 0;">${date}</td></tr>
        </table>
        ${token ? '<p style="background:#f0fdf4;padding:12px;border-radius:8px;border:1px solid #bbf7d0;"><strong>Important:</strong> Please load the token above on your meter. Keep this email for your records.</p>' : ''}
        <p style="color:#999;font-size:12px;margin-top:30px;">This is an automated message from SmiPay. Do not reply to this email.</p>
      </div>
    `;
  }
}

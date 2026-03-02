import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PurchaseAirtimeDto } from './dto/purchase-airtime.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VtpassCredentialsHelper } from '../vtpass-credentials.helper';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';
import { StatsService } from 'src/common/stats/stats.service';
import { CashbackService, PaymentSplit } from 'src/common/cashback/cashback.service';
import { ReferralService } from 'src/referral/referral.service';
import { FirstTxRewardService } from 'src/common/first-tx-reward/first-tx-reward.service';
import { AuditStatus } from '@prisma/client';
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
    private readonly auditLogService: AuditLogService,
    private readonly statsService: StatsService,
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

    // default split — full amount from wallet, 0 from cashback
    let split: PaymentSplit = { walletCharge: Number(dto.amount), cashbackCharge: 0, cashbackBefore: 0, cashbackAfter: 0 };
    // Tracks whether we've already refunded in the main try-block
    // so we don't accidentally refund again in the catch block.
    let walletRefundedInTryBlock = false;
    let cashbackRefundedInTryBlock = false;

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
      const maskedHeaders = {
        ...headers,
        'secret-key': maskKey(headers['secret-key']),
        'api-key': maskKey(headers['api-key']),
      };
      this.logger.log(`Headers: ${JSON.stringify(maskedHeaders)}`);
      this.logger.log(`URL: ${url}`);

      // if user opted in, deduct what we can from cashback first
      split = await this.cashbackService.resolvePayment(userPayload.sub, Number(dto.amount), dto.use_cashback === true);

      // wallet hold + create pending transaction atomically
      const description = `VTU ${dto.serviceID.toUpperCase()} to ${dto.phone}`;
      const createdTx = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.transactionHistory.findUnique({ where: { transaction_reference: request_id } });
        if (existing) return existing;

        const wallet = await tx.wallet.findFirst({ where: { user_id: userPayload.sub } });
        const amountNum = Number(dto.amount);

        this.logger.log(`Wallet lookup for user ${userPayload.sub}: ${wallet ? `found (id: ${wallet.id}, balance: ${wallet.current_balance})` : 'NOT FOUND'}`);

        if (!wallet) {
          this.logger.error(`User wallet not found for user ${userPayload.sub}`);
          throw new HttpException('User wallet not found in database', HttpStatus.BAD_REQUEST);
        }

        const balance_before = Number(wallet.current_balance);

        // only deduct the wallet portion (could be 0 if cashback covered it all)
        if (split.walletCharge > 0) {
          this.logger.log(`Balance check: ${wallet.current_balance} >= ${split.walletCharge} → ${balance_before >= split.walletCharge ? 'OK' : 'INSUFFICIENT'}`);
          validateWalletBalance(balance_before, split.walletCharge);
        }

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
            meta_data: {
              ...payload,
              cashback_used: split.cashbackCharge,
              wallet_charged: split.walletCharge,
            },
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
        this.logger.warn(
          `Airtime VTpass indicates refund required. walletCharge=${split.walletCharge}, cashbackCharge=${split.cashbackCharge}, ` +
          `status=${finalStatus}, code=${responseCode}, txStatus=${txStatus}`,
        );

        if (split.walletCharge > 0) {
          await this.prisma.wallet.update({
            where: { user_id: userPayload.sub },
            data: { current_balance: { increment: split.walletCharge } }
          });
          walletRefundedInTryBlock = true;
          const walletAfterRefund = await this.prisma.wallet.findFirst({
            where: { user_id: userPayload.sub },
          });
          this.logger.warn(
            `Airtime wallet refunded in main flow. amount=${split.walletCharge}, ` +
            `walletRefundedInTryBlock=${walletRefundedInTryBlock}, ` +
            `wallet_balance_now=${walletAfterRefund?.current_balance}`,
          );
        }
        // return cashback portion to cashback wallet
        if (split.cashbackCharge > 0) {
          await this.cashbackService.refundCashback(userPayload.sub, split.cashbackCharge);
          cashbackRefundedInTryBlock = true;
          const cashbackWalletAfter = await this.prisma.cashbackWallet.findUnique({
            where: { user_id: userPayload.sub },
          });
          this.logger.warn(
            `Airtime cashback refunded in main flow. amount=${split.cashbackCharge}, ` +
            `cashbackRefundedInTryBlock=${cashbackRefundedInTryBlock}, ` +
            `cashback_balance_now=${cashbackWalletAfter?.current_balance}`,
          );
        }
        
        if (shouldThrow) {
          this.logger.error(`VTpass response: code=${responseCode}, status=${txStatus}, description="${responseDescription}"`);
          throw new HttpException(`Provider error: ${errorMessage}`, HttpStatus.BAD_REQUEST);
        }
      }

      // Fire-and-forget: audit log + stats
      this.auditLogService
        .logTransaction(
          finalStatus === 'success' ? 'AIRTIME_PURCHASE' : finalStatus === 'failed' ? 'AIRTIME_PURCHASE_FAILED' : 'AIRTIME_PURCHASE',
          finalStatus === 'success' ? AuditStatus.SUCCESS : finalStatus === 'failed' ? AuditStatus.FAILURE : AuditStatus.PENDING,
          null,
          {
            amount: Number(dto.amount),
            currency: 'NGN',
            balance_before: Number(createdTx.balance_before),
            balance_after: Number(createdTx.balance_after),
            transaction_ref: request_id,
          },
          {
            user_id: userPayload.sub,
            resource_type: 'TransactionHistory',
            resource_id: createdTx.id,
            metadata: { serviceID: dto.serviceID, phone: dto.phone, vtpass_code: responseCode },
          },
        )
        .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

      this.statsService
        .onTransactionCreated(Number(dto.amount), finalStatus, 0)
        .catch((e) => this.logger.warn(`Stats update failed: ${e.message}`));

      this.statsService
        .onWalletDebited(Number(dto.amount))
        .catch((e) => this.logger.warn(`Stats wallet debit failed: ${e.message}`));

      // cashback + referral reward on successful purchase
      if (finalStatus === 'success') {
        this.cashbackService
          .processCashback({ userId: userPayload.sub, amount: Number(dto.amount), serviceType: 'airtime', transactionRef: request_id })
          .catch((e) => this.logger.warn(`Cashback processing failed: ${e.message}`));

        this.referralService
          .checkAndTriggerReward(userPayload.sub, Number(dto.amount))
          .catch((e) => this.logger.warn(`Referral reward check failed: ${e.message}`));

        this.firstTxRewardService
          .checkAndReward({ userId: userPayload.sub, amount: Number(dto.amount), transactionType: 'airtime', transactionRef: request_id })
          .catch((e) => this.logger.warn(`First-tx reward check failed: ${e.message}`));
      }

      // If processing, return success response with pending status info
      if (finalStatus === 'pending') {
        const formattedResponse = {
          id: createdTx.id,
          ...response.data,
          status: 'processing',
          message: 'Transaction is being processed. Status will be updated via webhook.',
          wallet_balance: Number(createdTx.balance_after),
        };
        return new ApiResponseDto(true, 'Transaction is being processed', formattedResponse);
      }

      const formattedResponse = {
        id: createdTx.id,
        ...response.data,
        wallet_balance: Number(createdTx.balance_after),
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
          // Transaction was created (wallet was debited) — only refund if we already
          // refunded in the main try-block (VTpass explicitly returned Failed/Reversed).
          // For No Response, Timeout, or other errors we don't know the outcome —
          // keep as pending, do NOT refund, let cron requery reconcile.
          if (walletRefundedInTryBlock) {
            // We already refunded in try block (VTpass said failed). Just mark failed.
            await this.prisma.transactionHistory.update({
              where: { transaction_reference: request_id },
              data: { status: 'failed', meta_data: errorMeta },
            });
            this.logger.warn(
              `Airtime catch-block: VTpass already indicated failed. Marking tx failed, no refund (already done in try).`,
            );
          } else {
            // No definitive Failed from VTpass (e.g. network error, timeout, no response).
            // Keep as pending — do NOT refund. Cron requery will reconcile.
            await this.prisma.transactionHistory.update({
              where: { transaction_reference: request_id },
              data: {
                status: 'pending',
                meta_data: {
                  ...(existingTx.meta_data as any),
                  ...errorMeta,
                  catch_block_reason: 'No definitive VTpass response. Kept pending for requery.',
                },
              },
            });
            this.logger.warn(
              `Airtime catch-block: No definitive VTpass response (network/timeout/error). ` +
              `Keeping tx PENDING for requery. NO REFUND.`,
            );
          }

          // Final balance confirmation for debugging
          const [finalWallet, finalCashback] = await Promise.all([
            this.prisma.wallet.findFirst({ where: { user_id: userPayload.sub } }),
            this.prisma.cashbackWallet.findUnique({ where: { user_id: userPayload.sub } }),
          ]);
          this.logger.warn(
            `Airtime tx ${request_id} — FINAL BALANCES: wallet=${finalWallet?.current_balance}, cashback=${finalCashback?.current_balance}`,
          );
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

      // Fire-and-forget: audit failure
      this.auditLogService
        .logTransaction(
          'AIRTIME_PURCHASE_FAILED',
          AuditStatus.FAILURE,
          null,
          {
            amount: Number(dto.amount),
            currency: 'NGN',
            transaction_ref: request_id,
          },
          {
            user_id: userPayload.sub,
            error_message: error.message,
            metadata: { serviceID: dto.serviceID, phone: dto.phone },
          },
        )
        .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

      this.statsService
        .onTransactionCreated(Number(dto.amount), 'failed', 0)
        .catch((e) => this.logger.warn(`Stats update failed: ${e.message}`));

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

      // Fire-and-forget: audit + stats for status change
      if (finalStatus !== 'pending') {
        this.auditLogService
          .logTransaction(
            finalStatus === 'success' ? 'AIRTIME_PURCHASE' : 'AIRTIME_PURCHASE_FAILED',
            finalStatus === 'success' ? AuditStatus.SUCCESS : AuditStatus.FAILURE,
            null,
            {
              amount: transaction.amount || 0,
              currency: 'NGN',
              transaction_ref: requestId,
            },
            {
              user_id: transaction.user_id,
              resource_type: 'TransactionHistory',
              resource_id: transaction.id,
              description: `[Cron requery] Airtime transaction resolved to ${finalStatus}`,
            },
          )
          .catch((e) => this.logger.warn(`[Cron] Audit log failed: ${e.message}`));

        this.statsService
          .onTransactionStatusChanged('pending', finalStatus, transaction.amount || 0, 0)
          .catch((e) => this.logger.warn(`[Cron] Stats update failed: ${e.message}`));

        if (finalStatus === 'success') {
          this.pushNotificationService
            .sendTransactionNotification(transaction.user_id, 'airtime', transaction.amount || 0, 'success', transaction.id)
            .catch((e) => this.logger.warn(`[Cron] Push notification failed: ${e.message}`));

          this.cashbackService
            .processCashback({ userId: transaction.user_id, amount: Number(transaction.amount || 0), serviceType: 'airtime', transactionRef: requestId })
            .catch((e) => this.logger.warn(`[Cron] Cashback processing failed: ${e.message}`));

          this.referralService
            .checkAndTriggerReward(transaction.user_id, Number(transaction.amount || 0))
            .catch((e) => this.logger.warn(`[Cron] Referral reward check failed: ${e.message}`));

          this.firstTxRewardService
            .checkAndReward({ userId: transaction.user_id, amount: Number(transaction.amount || 0), transactionType: 'airtime', transactionRef: requestId })
            .catch((e) => this.logger.warn(`[Cron] First-tx reward check failed: ${e.message}`));
        }
      }

      return { updated: true, status: finalStatus };
    } catch (error: any) {
      this.logger.error(`[Cron] Error querying transaction ${requestId}: ${error.message}`);
      // Don't throw - just log and return
      return { updated: false };
    }
  }
}




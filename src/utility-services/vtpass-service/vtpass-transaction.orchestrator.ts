import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { CashbackService, PaymentSplit } from 'src/common/cashback/cashback.service';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';
import { StatsService } from 'src/common/stats/stats.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { ReferralService } from 'src/referral/referral.service';
import { FirstTxRewardService } from 'src/common/first-tx-reward/first-tx-reward.service';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { AuditAction, AuditStatus, Prisma } from '@prisma/client';
import { VtpassCredentialsHelper } from './vtpass-credentials.helper';
import {
  determineTransactionStatus,
  generateVtpassRequestId,
  normalizeVtpassResponseCode,
  shouldRequeryTransaction,
} from './airtime/airtime.validators';
import { toUserFriendlyVtpassPurchaseError } from './vtpass-user-facing-messages';
import { VtpassFailureCooldownService } from './vtpass-failure-cooldown.service';

// ─── Public types ───────────────────────────────────────────────────────────

export { generateVtpassRequestId };

export interface VtpassPurchaseConfig {
  transactionType: string;
  serviceLabel: string;
  auditAction: string;
  auditFailAction: string;
  cashbackServiceType: string;

  userId: string;
  requestId: string;
  chargeAmount: number;
  vtpassAmount?: number;
  useCashback: boolean;

  vtpassPayload: Record<string, any>;

  description: string;
  provider: string;
  recipientIdentifier: string;
  extraTxFields?: Record<string, any>;
  auditMetadata?: Record<string, any>;
  markupValue?: number;

  onSuccess?: (vtpassResponse: any, txRecord: any) => Promise<void>;
  onProcessResponse?: (vtpassResponse: any) => Record<string, any> | null;
  onEnrichResponse?: (vtpassResponse: any, extraMeta: Record<string, any>) => Record<string, any>;
  humanizeError?: (rawMessage: string) => string;
}

export interface VtpassRequeryConfig {
  transactionType: string;
  serviceLabel: string;
  auditAction: string;
  auditFailAction: string;
  cashbackServiceType: string;
  maxRequeryAttempts?: number;
  maxAgeMinutes?: number;
  onSuccess?: (vtpassResponse: any, txRecord: any) => Promise<void>;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class VtpassTransactionOrchestrator {
  private readonly logger = new Logger(VtpassTransactionOrchestrator.name);
  private readonly credentials: ReturnType<typeof VtpassCredentialsHelper.getCredentials>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly vtpassFailureCooldown: VtpassFailureCooldownService,
    private readonly cashbackService: CashbackService,
    private readonly auditLogService: AuditLogService,
    private readonly statsService: StatsService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly referralService: ReferralService,
    private readonly firstTxRewardService: FirstTxRewardService,
  ) {
    this.credentials = VtpassCredentialsHelper.getCredentials(configService);
  }

  private getBaseUrl(): string {
    const { baseUrl, isDevelopment } = this.credentials;
    if (!baseUrl) {
      const key = isDevelopment ? 'VT_PASS_SANDBOX_API_URL' : 'VT_PASS_LIVE_API_URL';
      throw new HttpException(`VTpass base URL not configured. Set ${key}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return baseUrl.replace(/\/+$/, '');
  }

  private getPostHeaders() {
    const { apiKey, secretKey } = this.credentials;
    if (!secretKey) {
      throw new HttpException('VTpass secret key is not configured.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { 'api-key': apiKey, 'secret-key': secretKey, 'Content-Type': 'application/json' };
  }

  /**
   * Idempotent failure refund: cron requery and the purchase handler can both run close together.
   * Without a single flag + merge of meta_data, step 8 could wipe vtpass_failure_refund_applied and
   * the purchase path would credit the wallet a second time.
   */
  private async applyVtpassFailureRefundOnce(
    requestId: string,
    userId: string,
    walletRefund: number,
    cashbackRefund: number,
    serviceLabel: string,
  ): Promise<{ appliedThisRun: boolean; wasAlreadyComplete: boolean }> {
    const run = async (): Promise<{ appliedThisRun: boolean; wasAlreadyComplete: boolean }> => {
      return this.prisma.$transaction(
        async (tx) => {
          const row = await tx.transactionHistory.findUnique({
            where: { transaction_reference: requestId },
          });
          if (!row) {
            this.logger.warn(`[${serviceLabel}] Refund skip: no tx row for ${requestId}`);
            return { appliedThisRun: false, wasAlreadyComplete: false };
          }
          const meta = (row.meta_data as Record<string, unknown>) || {};
          if (meta['vtpass_failure_refund_applied'] === true) {
            this.logger.warn(
              `[${serviceLabel}] Failure refund already applied for ${requestId}; skipping duplicate credit`,
            );
            // Wallet was restored earlier, but the row may still show post-debit snapshots; align for admin / APIs.
            const wRef = Number(meta['vtpass_failure_wallet_refund_amount']) || 0;
            const cRef = Number(meta['vtpass_failure_cashback_refund_amount']) || 0;
            const patch: { balance_after?: number; cashback_balance_after?: number } = {};
            if (wRef > 0 && row.balance_before != null) {
              patch.balance_after = Number(row.balance_before);
            }
            if (cRef > 0 && row.cashback_balance_before != null) {
              patch.cashback_balance_after = Number(row.cashback_balance_before);
            }
            if (Object.keys(patch).length > 0) {
              await tx.transactionHistory.update({
                where: { transaction_reference: requestId },
                data: patch,
              });
            }
            return { appliedThisRun: false, wasAlreadyComplete: true };
          }
          if (walletRefund > 0) {
            await tx.wallet.update({
              where: { user_id: userId },
              data: { current_balance: { increment: walletRefund } },
            });
          }
          if (cashbackRefund > 0) {
            try {
              await tx.cashbackWallet.update({
                where: { user_id: userId },
                data: {
                  current_balance: { increment: cashbackRefund },
                  all_time_withdrawn: { decrement: cashbackRefund },
                },
              });
            } catch (e: any) {
              if (e?.code === 'P2025') {
                this.logger.warn(`[${serviceLabel}] Cashback wallet missing for refund ${requestId}`);
              } else {
                throw e;
              }
            }
          }
          await tx.transactionHistory.update({
            where: { transaction_reference: requestId },
            data: {
              meta_data: {
                ...meta,
                vtpass_failure_refund_applied: true,
                vtpass_failure_wallet_refund_amount: walletRefund,
                vtpass_failure_cashback_refund_amount: cashbackRefund,
                vtpass_failure_refund_at: new Date().toISOString(),
              } as any,
              // Pending row stored post-debit snapshots; after refund the net effect on wallet is zero — match pre-debit.
              ...(walletRefund > 0 && row.balance_before != null
                ? { balance_after: Number(row.balance_before) }
                : {}),
              ...(cashbackRefund > 0 && row.cashback_balance_before != null
                ? { cashback_balance_after: Number(row.cashback_balance_before) }
                : {}),
            },
          });
          return { appliedThisRun: true, wasAlreadyComplete: false };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        },
      );
    };

    try {
      return await run();
    } catch (e: any) {
      if (e?.code === 'P2034') {
        this.logger.warn(`[${serviceLabel}] Serializable retry for refund ${requestId}`);
        return run();
      }
      throw e;
    }
  }

  // ─── Main purchase flow ─────────────────────────────────────────────────

  async executePurchase(config: VtpassPurchaseConfig): Promise<ApiResponseDto<any>> {
    const {
      transactionType, serviceLabel, auditAction, auditFailAction, cashbackServiceType,
      userId, requestId, chargeAmount, useCashback, vtpassPayload,
      description, provider, recipientIdentifier, extraTxFields, auditMetadata, markupValue,
    } = config;
    const url = `${this.getBaseUrl()}/pay`;

    this.logger.log(`[${serviceLabel}] Purchase: requestId=${requestId}, charge=${chargeAmount}, userId=${userId}`);

    // ── 1. Idempotency ──────────────────────────────────────────────────
    const existingTx = await this.prisma.transactionHistory.findUnique({
      where: { transaction_reference: requestId },
    });
    if (existingTx) {
      this.logger.log(`[${serviceLabel}] Existing tx: requestId=${requestId}, status=${existingTx.status}`);
      if (existingTx.status === 'success') {
        const cached = (existingTx.meta_data as any)?.vtpass_response;
        return new ApiResponseDto(true, `${serviceLabel} purchase already completed`, cached || { requestId, code: '000' });
      }
      const msg = existingTx.status === 'pending' ? 'Transaction is still processing' : 'Previous transaction attempt failed';
      const cached = (existingTx.meta_data as any)?.vtpass_response;
      return new ApiResponseDto(false, msg, cached || { requestId, status: existingTx.status });
    }

    await this.vtpassFailureCooldown.assertNotInFailureCooldown(userId);

    // ── 2. State trackers ───────────────────────────────────────────────
    let split: PaymentSplit = { walletCharge: chargeAmount, cashbackCharge: 0, cashbackBefore: 0, cashbackAfter: 0 };
    let walletRefundedInTryBlock = false;
    let cashbackRefundedInTryBlock = false;

    try {
      // ── 3. Cashback resolution ──────────────────────────────────────
      split = await this.cashbackService.resolvePayment(userId, chargeAmount, useCashback);

      // ── 4. Atomic wallet debit + pending tx ─────────────────────────
      const createdTx = await this.prisma.$transaction(async (tx) => {
        const dup = await tx.transactionHistory.findUnique({ where: { transaction_reference: requestId } });
        if (dup) return dup;

        const wallet = await tx.wallet.findUnique({ where: { user_id: userId } });
        if (!wallet) {
          throw new HttpException('User wallet not found in database', HttpStatus.BAD_REQUEST);
        }

        const balance_before = Number(wallet.current_balance);
        if (split.walletCharge > 0 && balance_before < split.walletCharge) {
          throw new HttpException('Insufficient wallet balance', HttpStatus.BAD_REQUEST);
        }
        const balance_after = balance_before - split.walletCharge;

        if (split.walletCharge > 0) {
          await tx.wallet.update({
            where: { user_id: userId },
            data: { current_balance: balance_after, balance_before, balance_after, all_time_withdrawn: { increment: split.walletCharge } },
          });
        }

        this.logger.log(`[${serviceLabel}] Wallet: before=${balance_before}, after=${balance_after}${split.cashbackCharge > 0 ? ` (₦${split.cashbackCharge} cashback)` : ''}`);

        return await tx.transactionHistory.create({
          data: {
            user_id: userId,
            amount: chargeAmount,
            provider,
            transaction_type: transactionType,
            credit_debit: 'debit',
            description,
            status: 'pending',
            recipient_mobile: recipientIdentifier,
            payment_method: 'wallet',
            payment_channel: 'other',
            transaction_reference: requestId,
            balance_before,
            balance_after,
            cashback_balance_before: split.cashbackBefore,
            cashback_used: split.cashbackCharge,
            cashback_balance_after: split.cashbackAfter,
            meta_data: { ...vtpassPayload, cashback_used: split.cashbackCharge, wallet_charged: split.walletCharge },
            ...extraTxFields,
          } as any,
        });
      });

      // ── 5. POST to VTpass ───────────────────────────────────────────
      const response = await axios.post(url, vtpassPayload, { headers: this.getPostHeaders() });

      const txContent = response.data?.content?.transactions || {};
      const responseCodeStr = normalizeVtpassResponseCode(response.data?.code);
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      // ── 6. Determine status ─────────────────────────────────────────
      const { finalStatus, shouldRefund, shouldThrow, errorMessage } = determineTransactionStatus(
        responseCodeStr,
        txStatus,
        responseDescription,
        this.logger,
      );

      // ── 7. Service-specific response processing ─────────────────────
      const extraMeta: Record<string, any> = config.onProcessResponse?.(response.data) || {};

      const commissionFromVtpass =
        typeof txContent.commission === 'number' ? txContent.commission : Number(txContent.commission) || 0;
      const commissionPersist = finalStatus === 'success' ? commissionFromVtpass : 0;

      // ── 8. Update tx record (merge DB meta — never clobber cron/refund flags) ──
      const latestRow = await this.prisma.transactionHistory.findUnique({
        where: { transaction_reference: requestId },
        select: { meta_data: true },
      });
      const prevMeta = (latestRow?.meta_data as Record<string, any>) || {};

      await this.prisma.transactionHistory.update({
        where: { transaction_reference: requestId },
        data: {
          status: finalStatus,
          transaction_number: txContent.transactionId?.toString() || null,
          commission: commissionPersist,
          // Persist selected critical fields into dedicated columns when present in extraMeta
          ...(typeof (extraMeta as any).electricity_token === 'string' && (extraMeta as any).electricity_token
            ? { electricity_token: (extraMeta as any).electricity_token }
            : {}),
          meta_data: {
            ...prevMeta,
            vtpass_response: response.data,
            vtpass_status: txStatus,
            vtpass_code: responseCodeStr,
            ...extraMeta,
          },
        },
      });

      // ── 9. Refund on definitive failure (idempotent) ───────────────
      if (shouldRefund) {
        this.logger.warn(`[${serviceLabel}] Refund required: wallet=${split.walletCharge}, cashback=${split.cashbackCharge}, status=${finalStatus}`);
        const refundResult = await this.applyVtpassFailureRefundOnce(
          requestId,
          userId,
          split.walletCharge,
          split.cashbackCharge,
          serviceLabel,
        );
        walletRefundedInTryBlock =
          split.walletCharge > 0 && (refundResult.appliedThisRun || refundResult.wasAlreadyComplete);
        cashbackRefundedInTryBlock =
          split.cashbackCharge > 0 && (refundResult.appliedThisRun || refundResult.wasAlreadyComplete);
        if (shouldThrow) {
          const msg = config.humanizeError
            ? config.humanizeError(errorMessage)
            : toUserFriendlyVtpassPurchaseError(errorMessage);
          throw new HttpException(msg, HttpStatus.BAD_REQUEST);
        }
      }

      // ── 10. Audit + Stats ───────────────────────────────────────────
      const auditStatusEnum = finalStatus === 'success' ? AuditStatus.SUCCESS : finalStatus === 'failed' ? AuditStatus.FAILURE : AuditStatus.PENDING;
      const mainWalletRestoredAfterFailure =
        finalStatus === 'failed' && shouldRefund && split.walletCharge > 0;
      const auditBalanceAfter = mainWalletRestoredAfterFailure
        ? Number(createdTx.balance_before)
        : Number(createdTx.balance_after);
      this.auditLogService
        .logTransaction(
          (finalStatus === 'failed' ? auditFailAction : auditAction) as AuditAction,
          auditStatusEnum,
          null,
          {
            amount: chargeAmount,
            currency: 'NGN',
            balance_before: Number(createdTx.balance_before),
            balance_after: auditBalanceAfter,
            transaction_ref: requestId,
          },
          { user_id: userId, resource_type: 'TransactionHistory', resource_id: createdTx.id, metadata: auditMetadata || {} },
        )
        .catch((e) => this.logger.warn(`[${serviceLabel}] Audit log failed: ${e.message}`));

      const vtpassCommission = finalStatus === 'success' ? commissionFromVtpass : 0;
      this.statsService
        .onTransactionCreated(chargeAmount, finalStatus, markupValue || 0, vtpassCommission)
        .catch((e) => this.logger.warn(`[${serviceLabel}] Stats failed: ${e.message}`));
      // Match actual wallet movement: debit was split.walletCharge; refunds restore wallet so net debit is zero.
      if (split.walletCharge > 0 && !shouldRefund) {
        this.statsService
          .onWalletDebited(split.walletCharge)
          .catch((e) => this.logger.warn(`[${serviceLabel}] Stats wallet debit failed: ${e.message}`));
      }

      // ── 11. Success rewards + callback ──────────────────────────────
      if (finalStatus === 'success') {
        const cashbackResult = await this.cashbackService
          .processCashback({ userId, amount: chargeAmount, serviceType: cashbackServiceType as any, transactionRef: requestId })
          .catch((e) => {
            this.logger.warn(`[${serviceLabel}] Cashback reward failed: ${e.message}`);
            return { credited: false, cashbackAmount: 0 };
          });
        if (cashbackResult.credited && cashbackResult.cashbackAmount > 0) {
          await this.prisma.transactionHistory.update({
            where: { transaction_reference: requestId },
            data: { cashback_earned: cashbackResult.cashbackAmount },
          });
        }
        this.referralService
          .checkAndTriggerReward(userId, chargeAmount)
          .catch((e) => this.logger.warn(`[${serviceLabel}] Referral reward failed: ${e.message}`));
        this.firstTxRewardService
          .checkAndReward({ userId, amount: chargeAmount, transactionType: transactionType as any, transactionRef: requestId })
          .catch((e) => this.logger.warn(`[${serviceLabel}] First-tx reward failed: ${e.message}`));
        this.pushNotificationService
          .sendTransactionNotification(userId, transactionType, chargeAmount, 'success', createdTx.id)
          .catch((e) => this.logger.warn(`[${serviceLabel}] Push notification failed: ${e.message}`));

        if (config.onSuccess) {
          config.onSuccess(response.data, createdTx).catch((e: any) => this.logger.warn(`[${serviceLabel}] onSuccess callback failed: ${e.message}`));
        }
      }

      // ── 12. Format response ─────────────────────────────────────────
      const walletBalanceForResponse = mainWalletRestoredAfterFailure
        ? Number(createdTx.balance_before)
        : Number(createdTx.balance_after);
      const formattedResponse: any = { id: createdTx.id, ...response.data, wallet_balance: walletBalanceForResponse };
      if (config.onEnrichResponse) {
        Object.assign(formattedResponse, config.onEnrichResponse(response.data, extraMeta));
      }

      if (finalStatus === 'pending') {
        return new ApiResponseDto(true, 'Transaction is being processed', {
          ...formattedResponse,
          status: 'processing',
          message: 'Transaction is being processed. Status will be updated via webhook.',
        });
      }

      this.logger.log(`[${serviceLabel}] Purchase completed successfully`);
      return new ApiResponseDto(true, `${serviceLabel} purchase successful`, formattedResponse);
    } catch (error: any) {
      // ── Catch block ─────────────────────────────────────────────────
      this.logger.error(`[${serviceLabel}] Error: ${error.message}`);

      try {
        const existingForUpdate = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: requestId } });
        const errorMeta = {
          request_id: requestId,
          payload: vtpassPayload,
          vtpass_error: error.response?.data || error.message || 'Unknown error',
        };

        if (existingForUpdate) {
          const curMeta = (existingForUpdate.meta_data as Record<string, unknown>) || {};
          const failureRefundDone = curMeta['vtpass_failure_refund_applied'] === true;
          if (walletRefundedInTryBlock || failureRefundDone) {
            await this.prisma.transactionHistory.update({
              where: { transaction_reference: requestId },
              data: { status: 'failed', meta_data: { ...curMeta, ...errorMeta } },
            });
            this.logger.warn(
              `[${serviceLabel}] catch: Tx marked failed (refund already applied in try, requery, or parallel path).`,
            );
          } else {
            await this.prisma.transactionHistory.update({
              where: { transaction_reference: requestId },
              data: {
                status: 'pending',
                meta_data: {
                  ...curMeta,
                  ...errorMeta,
                  catch_block_reason: 'No definitive VTpass response. Kept pending for requery.',
                },
              },
            });
            this.logger.warn(`[${serviceLabel}] catch: No definitive VTpass response. Keeping tx PENDING for requery. NO REFUND.`);
          }
        } else {
          // Tx was never created — wallet was never debited. Refund cashback if it was deducted.
          if (split.cashbackCharge > 0 && !cashbackRefundedInTryBlock) {
            await this.cashbackService.refundCashback(userId, split.cashbackCharge);
            this.logger.warn(`[${serviceLabel}] catch: Refunded ₦${split.cashbackCharge} cashback (tx never created, wallet never debited).`);
          }
          await this.prisma.transactionHistory.create({
            data: {
              user_id: userId,
              amount: chargeAmount,
              provider,
              transaction_type: transactionType as any,
              credit_debit: 'debit',
              description,
              status: 'failed',
              recipient_mobile: recipientIdentifier,
              payment_method: 'wallet',
              payment_channel: 'other',
              transaction_reference: requestId,
              balance_before: 0,
              balance_after: 0,
              cashback_balance_before: split.cashbackBefore,
              cashback_used: split.cashbackCharge,
              cashback_balance_after: split.cashbackAfter,
              meta_data: errorMeta,
            },
          });
          this.logger.log(`[${serviceLabel}] Failed tx ${requestId} recorded (no wallet debit occurred)`);
        }
      } catch (updateError: any) {
        this.logger.error(`[${serviceLabel}] Failed to record tx failure: ${updateError.message}`);
      }

      this.auditLogService
        .logTransaction(auditFailAction as AuditAction, AuditStatus.FAILURE, null,
          { amount: chargeAmount, currency: 'NGN', transaction_ref: requestId },
          { user_id: userId, error_message: error.message, metadata: auditMetadata || {} },
        )
        .catch((e) => this.logger.warn(`[${serviceLabel}] Audit log failed: ${e.message}`));
      this.statsService.onTransactionCreated(chargeAmount, 'failed', 0).catch((e) => this.logger.warn(`[${serviceLabel}] Stats failed: ${e.message}`));

      if (error instanceof HttpException) throw error;
      if (error.response) {
        const rawMsg =
          error.response.data?.response_description ||
          error.response.data?.message ||
          `Failed to purchase ${serviceLabel.toLowerCase()}`;
        const msg = config.humanizeError
          ? config.humanizeError(rawMsg)
          : toUserFriendlyVtpassPurchaseError(rawMsg);
        throw new HttpException(msg, error.response.status || HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(`Failed to purchase ${serviceLabel.toLowerCase()}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Requery flow (used by cron) ──────────────────────────────────────

  async requeryTransaction(requestId: string, config: VtpassRequeryConfig): Promise<{ updated: boolean; status?: string }> {
    const { serviceLabel, auditAction, auditFailAction, cashbackServiceType, maxRequeryAttempts, maxAgeMinutes } = config;
    const url = `${this.getBaseUrl()}/requery`;
    this.logger.log(`[Cron][${serviceLabel}] Requerying: requestId=${requestId}`);

    try {
      const transaction = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: requestId } });
      if (!transaction) { this.logger.warn(`[Cron][${serviceLabel}] Tx not found: ${requestId}`); return { updated: false }; }
      if (transaction.status === 'success') return { updated: false, status: 'success' };
      if (transaction.status === 'failed') return { updated: false, status: 'failed' };

      const metaData = (transaction.meta_data as any) || {};
      const requeryCount = metaData.requery_count || 0;
      const age = Date.now() - transaction.createdAt.getTime();
      const check = shouldRequeryTransaction(age, requeryCount, maxRequeryAttempts ?? 3, maxAgeMinutes ?? 30);
      if (!check.shouldRequery) {
        this.logger.warn(`[Cron][${serviceLabel}] Skipped ${requestId}: ${check.reason}`);
        return { updated: false };
      }

      const response = await axios.post(url, { request_id: requestId }, { headers: this.getPostHeaders() });
      const txContent = response.data?.content?.transactions || {};
      const responseCodeStr = normalizeVtpassResponseCode(response.data?.code);
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      const { finalStatus, shouldRefund } = determineTransactionStatus(
        responseCodeStr,
        txStatus,
        responseDescription,
        this.logger,
      );

      const newCommission =
        finalStatus === 'success'
          ? typeof txContent.commission === 'number'
            ? txContent.commission
            : Number(txContent.commission) || 0
          : finalStatus === 'failed'
            ? 0
            : typeof transaction.commission === 'number'
              ? transaction.commission
              : Number(transaction.commission) || 0;

      await this.prisma.$transaction(async (tx) => {
        await tx.transactionHistory.update({
          where: { transaction_reference: requestId },
          data: {
            status: finalStatus,
            transaction_number: txContent.transactionId?.toString() || transaction.transaction_number,
            commission: newCommission,
            meta_data: {
              ...metaData,
              vtpass_response: response.data,
              vtpass_status: txStatus,
              vtpass_code: responseCodeStr,
              requery_count: requeryCount + 1,
              last_requery_at: new Date().toISOString(),
            },
          },
        });
      });

      if (shouldRefund && finalStatus === 'failed') {
        const walletRefund =
          typeof metaData.wallet_charged === 'number' ? metaData.wallet_charged : Number(transaction.amount || 0);
        const cashbackRefund = typeof metaData.cashback_used === 'number' ? metaData.cashback_used : 0;
        const refundRes = await this.applyVtpassFailureRefundOnce(
          requestId,
          transaction.user_id,
          walletRefund,
          cashbackRefund,
          `[Cron][${serviceLabel}]`,
        );
        if (refundRes.appliedThisRun) {
          this.logger.log(
            `[Cron][${serviceLabel}] Refunded wallet=${walletRefund} cashback=${cashbackRefund} for ${transaction.user_id}`,
          );
        }
      }

      if (finalStatus !== 'pending') {
        const auditStatusEnum = finalStatus === 'success' ? AuditStatus.SUCCESS : AuditStatus.FAILURE;
        this.auditLogService
          .logTransaction((finalStatus === 'success' ? auditAction : auditFailAction) as AuditAction, auditStatusEnum, null,
            { amount: transaction.amount || 0, currency: 'NGN', transaction_ref: requestId },
            { user_id: transaction.user_id, resource_type: 'TransactionHistory', resource_id: transaction.id, description: `[Cron] ${serviceLabel} tx resolved to ${finalStatus}` },
          )
          .catch((e) => this.logger.warn(`[Cron][${serviceLabel}] Audit failed: ${e.message}`));

        const markupVal = typeof transaction.markup_value === 'number' ? transaction.markup_value : 0;
        const commissionVal =
          finalStatus === 'success'
            ? typeof txContent.commission === 'number'
              ? txContent.commission
              : Number(txContent.commission) || 0
            : 0;
        this.statsService.onTransactionStatusChanged('pending', finalStatus, transaction.amount || 0, markupVal, commissionVal)
          .catch((e) => this.logger.warn(`[Cron][${serviceLabel}] Stats failed: ${e.message}`));

        if (finalStatus === 'success') {
          const amount = Number(transaction.amount || 0);
          this.pushNotificationService
            .sendTransactionNotification(transaction.user_id, config.transactionType, amount, 'success', transaction.id)
            .catch((e) => this.logger.warn(`[Cron][${serviceLabel}] Push failed: ${e.message}`));
          this.cashbackService
            .processCashback({ userId: transaction.user_id, amount, serviceType: cashbackServiceType as any, transactionRef: requestId })
            .catch((e) => this.logger.warn(`[Cron][${serviceLabel}] Cashback failed: ${e.message}`));
          this.referralService
            .checkAndTriggerReward(transaction.user_id, amount)
            .catch((e) => this.logger.warn(`[Cron][${serviceLabel}] Referral failed: ${e.message}`));
          this.firstTxRewardService
            .checkAndReward({ userId: transaction.user_id, amount, transactionType: config.transactionType as any, transactionRef: requestId })
            .catch((e) => this.logger.warn(`[Cron][${serviceLabel}] First-tx failed: ${e.message}`));

          if (config.onSuccess) {
            config.onSuccess(response.data, transaction).catch((e: any) => this.logger.warn(`[Cron][${serviceLabel}] onSuccess failed: ${e.message}`));
          }
        }
      }

      return { updated: true, status: finalStatus };
    } catch (error: any) {
      this.logger.error(`[Cron][${serviceLabel}] Error requerying ${requestId}: ${error.message}`);
      return { updated: false };
    }
  }
}

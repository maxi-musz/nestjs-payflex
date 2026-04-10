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
import { WalletIntegrityService } from 'src/common/wallet-integrity/wallet-integrity.service';
import { roundNgn } from 'src/common/money/round-ngn';

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
    private readonly walletIntegrity: WalletIntegrityService,
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

  // Refunds wallet + cashback for a failed tx. Uses Serializable isolation + a meta_data flag
  // (vtpass_failure_refund_applied) to guarantee the refund only happens once, even if both
  // executePurchase and the cron requery try to refund the same tx at the same time.
  async applyVtpassFailureRefundOnce(
    requestId: string,
    userId: string,
    walletRefundRaw: number,
    cashbackRefundRaw: number,
    serviceLabel: string,
  ): Promise<{ appliedThisRun: boolean; wasAlreadyComplete: boolean }> {
    const walletRefund = roundNgn(walletRefundRaw);
    const cashbackRefund = roundNgn(cashbackRefundRaw);
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

          // If another path already refunded this tx, just fix the balance snapshots on the row
          if (meta['vtpass_failure_refund_applied'] === true) {
            this.logger.warn(
              `[${serviceLabel}] Failure refund already applied for ${requestId}; skipping duplicate credit`,
            );
            const wRef = roundNgn(Number(meta['vtpass_failure_wallet_refund_amount']) || 0);
            const cRef = roundNgn(Number(meta['vtpass_failure_cashback_refund_amount']) || 0);
            const patch: { balance_after?: number; cashback_balance_after?: number } = {};
            // Reset balance_after to balance_before since the net wallet change after refund is zero
            if (wRef > 0 && row.balance_before != null) {
              patch.balance_after = roundNgn(Number(row.balance_before));
            }
            if (cRef > 0 && row.cashback_balance_before != null) {
              patch.cashback_balance_after = roundNgn(Number(row.cashback_balance_before));
            }
            if (Object.keys(patch).length > 0) {
              await tx.transactionHistory.update({
                where: { transaction_reference: requestId },
                data: patch,
              });
            }
            return { appliedThisRun: false, wasAlreadyComplete: true };
          }

          // Credit the main wallet back (reverses the debit from step 4)
          if (walletRefund > 0) {
            await tx.wallet.update({
              where: { user_id: userId },
              data: {
                current_balance: { increment: walletRefund },
                all_time_withdrawn: { decrement: walletRefund },
              },
            });
          }

          // Credit the cashback wallet back (P2025 = wallet row doesn't exist, non-fatal)
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

          // Set the refund flag + amounts in meta_data, and fix balance snapshots on the tx row.
          // Spreads ...meta so we don't clobber vtpass_response or requery_count written elsewhere.
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
              // After refund, net wallet effect is zero — so balance_after should match balance_before
              ...(walletRefund > 0 && row.balance_before != null
                ? { balance_after: roundNgn(Number(row.balance_before)) }
                : {}),
              ...(cashbackRefund > 0 && row.cashback_balance_before != null
                ? { cashback_balance_after: roundNgn(Number(row.cashback_balance_before)) }
                : {}),
            },
          });
          return { appliedThisRun: true, wasAlreadyComplete: false };
        },
        {
          // Serializable prevents two concurrent callers from both seeing flag=false and both crediting
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        },
      );
    };

    try {
      return await run();
    } catch (e: any) {
      // P2034 = Serializable conflict — another tx touched the same row. Retry once.
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
      userId, requestId, chargeAmount: chargeRaw, useCashback, vtpassPayload,
      description, provider, recipientIdentifier, extraTxFields, auditMetadata, markupValue,
    } = config;
    const chargeAmount = roundNgn(chargeRaw);
    const url = `${this.getBaseUrl()}/pay`;

    this.logger.log(`[${serviceLabel}] Purchase: requestId=${requestId}, charge=${chargeAmount}, userId=${userId}`);

    // ── 1. Idempotency — if this requestId already exists, return the cached result instead of re-processing
    const existingTx = await this.prisma.transactionHistory.findUnique({
      where: { transaction_reference: requestId },
    });
    if (existingTx) {
      this.logger.log(`[${serviceLabel}] Existing tx: requestId=${requestId}, status=${existingTx.status}`);
      if (existingTx.status === 'success') {
        const cached = (existingTx.meta_data as any)?.vtpass_response;
        return new ApiResponseDto(true, `${serviceLabel} purchase already completed`, cached || { requestId, code: '000' });
      }
      // Pending or failed — tell the client without re-charging
      const msg = existingTx.status === 'pending' ? 'Transaction is still processing' : 'Previous transaction attempt failed';
      const cached = (existingTx.meta_data as any)?.vtpass_response;
      return new ApiResponseDto(false, msg, cached || { requestId, status: existingTx.status });
    }

    // Block users with too many recent failures (prevents rapid retry abuse)
    await this.vtpassFailureCooldown.assertNotInFailureCooldown(userId);
    // Verify wallet balance is consistent with tx history (anti-fraud sanity check)
    await this.walletIntegrity.assertWalletIntegrityForPurchase(userId);

    // ── 2. State trackers — these flags tell the catch block whether a refund already happened
    let split: PaymentSplit = { walletCharge: chargeAmount, cashbackCharge: 0, cashbackBefore: 0, cashbackAfter: 0 };
    let walletRefundedInTryBlock = false;
    let cashbackRefundedInTryBlock = false;

    try {
      // ── 3. Cashback resolution — splits chargeAmount into walletCharge + cashbackCharge
      split = await this.cashbackService.resolvePayment(userId, chargeAmount, useCashback);

      // ── 4. Atomic wallet debit + create PENDING tx row (all-or-nothing inside a Prisma transaction)
      const createdTx = await this.prisma.$transaction(async (tx) => {
        // Second idempotency check inside the transaction to catch race conditions
        const dup = await tx.transactionHistory.findUnique({ where: { transaction_reference: requestId } });
        if (dup) return dup;

        const wallet = await tx.wallet.findUnique({ where: { user_id: userId } });
        if (!wallet) {
          throw new HttpException('User wallet not found in database', HttpStatus.BAD_REQUEST);
        }

        const balance_before = roundNgn(Number(wallet.current_balance));
        if (split.walletCharge > 0 && balance_before < split.walletCharge) {
          throw new HttpException('Insufficient wallet balance', HttpStatus.BAD_REQUEST);
        }
        const balance_after = roundNgn(balance_before - split.walletCharge);

        // Debit the user's wallet
        if (split.walletCharge > 0) {
          await tx.wallet.update({
            where: { user_id: userId },
            data: { current_balance: balance_after, balance_before, balance_after, all_time_withdrawn: { increment: split.walletCharge } },
          });
        }

        this.logger.log(`[${serviceLabel}] Wallet: before=${balance_before}, after=${balance_after}${split.cashbackCharge > 0 ? ` (₦${split.cashbackCharge} cashback)` : ''}`);

        // Create the tx row as 'pending' — it stays pending until VTpass responds
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

      // ── 5. POST to VTpass /pay — this is where the actual purchase happens on VTpass's side
      const response = await axios.post(url, vtpassPayload, { headers: this.getPostHeaders() });

      // Extract VTpass response fields we need for status determination
      const txContent = response.data?.content?.transactions || {};
      const responseCodeStr = normalizeVtpassResponseCode(response.data?.code);
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      this.logger.log(
        `[${serviceLabel}] VTpass raw: code=${JSON.stringify(response.data?.code)}, ` +
        `normalized=${responseCodeStr}, txStatus=${txStatus}, desc="${responseDescription}"`,
      );

      // ── 6. Determine if tx succeeded, failed, or is still pending based on VTpass response codes
      // code=000 + status=delivered → success | code=016 → failed | code=099 → still processing
      const { finalStatus, shouldRefund, shouldThrow, errorMessage } = determineTransactionStatus(
        responseCodeStr,
        txStatus,
        responseDescription,
        this.logger,
      );

      // ── 7. Let the vertical service extract service-specific fields (e.g. electricity token, units)
      const extraMeta: Record<string, any> = config.onProcessResponse?.(response.data) || {};

      // Only persist commission if the tx actually succeeded
      const commissionFromVtpass = roundNgn(
        typeof txContent.commission === 'number' ? txContent.commission : Number(txContent.commission) || 0,
      );
      const commissionPersist = finalStatus === 'success' ? commissionFromVtpass : 0;

      // ── 8. Update tx row with VTpass result. Re-reads meta_data first so we MERGE (not overwrite)
      //    — this prevents clobbering refund flags if the cron requery wrote them between step 4 and now
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
          // If electricity service returned a token, persist it to its own column for easy querying
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

      // ── 9. If VTpass definitively failed/reversed, refund the wallet (idempotent — safe to call twice)
      if (shouldRefund) {
        this.logger.warn(`[${serviceLabel}] Refund required: wallet=${split.walletCharge}, cashback=${split.cashbackCharge}, status=${finalStatus}`);
        const refundResult = await this.applyVtpassFailureRefundOnce(
          requestId,
          userId,
          split.walletCharge,
          split.cashbackCharge,
          serviceLabel,
        );
        // Track whether refund happened so the catch block doesn't try again
        walletRefundedInTryBlock =
          split.walletCharge > 0 && (refundResult.appliedThisRun || refundResult.wasAlreadyComplete);
        cashbackRefundedInTryBlock =
          split.cashbackCharge > 0 && (refundResult.appliedThisRun || refundResult.wasAlreadyComplete);
        // Throw after refunding so the user sees a clean error (catch block will record it)
        if (shouldThrow) {
          const msg = config.humanizeError
            ? config.humanizeError(errorMessage)
            : toUserFriendlyVtpassPurchaseError(errorMessage);
          throw new HttpException(msg, HttpStatus.BAD_REQUEST);
        }
      }

      // ── 10. Audit log + stats (fire-and-forget — failures here don't affect the user)
      const auditStatusEnum = finalStatus === 'success' ? AuditStatus.SUCCESS : finalStatus === 'failed' ? AuditStatus.FAILURE : AuditStatus.PENDING;
      // If we refunded, the actual balance_after = balance_before (net zero), not the post-debit value
      const mainWalletRestoredAfterFailure =
        finalStatus === 'failed' && shouldRefund && split.walletCharge > 0;
      const auditBalanceAfter = mainWalletRestoredAfterFailure
        ? roundNgn(Number(createdTx.balance_before))
        : roundNgn(Number(createdTx.balance_after));
      this.auditLogService
        .logTransaction(
          (finalStatus === 'failed' ? auditFailAction : auditAction) as AuditAction,
          auditStatusEnum,
          null,
          {
            amount: chargeAmount,
            currency: 'NGN',
            balance_before: roundNgn(Number(createdTx.balance_before)),
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
      // Only count as a real debit in stats if the money actually left the wallet (not refunded)
      if (split.walletCharge > 0 && !shouldRefund) {
        this.statsService
          .onWalletDebited(split.walletCharge)
          .catch((e) => this.logger.warn(`[${serviceLabel}] Stats wallet debit failed: ${e.message}`));
      }

      // ── 11. On success: award cashback, check referral bonus, first-tx bonus, push notification
      if (finalStatus === 'success') {
        // Calculate and credit cashback reward for this purchase
        const cashbackResult = await this.cashbackService
          .processCashback({ userId, amount: chargeAmount, serviceType: cashbackServiceType as any, transactionRef: requestId })
          .catch((e) => {
            this.logger.warn(`[${serviceLabel}] Cashback reward failed: ${e.message}`);
            return { credited: false, cashbackAmount: 0 };
          });
        // Record the earned cashback on the tx row so it shows in the user's transaction history
        if (cashbackResult.credited && cashbackResult.cashbackAmount > 0) {
          await this.prisma.transactionHistory.update({
            where: { transaction_reference: requestId },
            data: { cashback_earned: cashbackResult.cashbackAmount },
          });
        }
        // All of these are fire-and-forget — none should block or fail the purchase response
        this.referralService
          .checkAndTriggerReward(userId, chargeAmount)
          .catch((e) => this.logger.warn(`[${serviceLabel}] Referral reward failed: ${e.message}`));
        this.firstTxRewardService
          .checkAndReward({ userId, amount: chargeAmount, transactionType: transactionType as any, transactionRef: requestId })
          .catch((e) => this.logger.warn(`[${serviceLabel}] First-tx reward failed: ${e.message}`));
        this.pushNotificationService
          .sendTransactionNotification(userId, transactionType, chargeAmount, 'success', createdTx.id)
          .catch((e) => this.logger.warn(`[${serviceLabel}] Push notification failed: ${e.message}`));

        // Vertical-specific callback (e.g. electricity service might save token details here)
        if (config.onSuccess) {
          config.onSuccess(response.data, createdTx).catch((e: any) => this.logger.warn(`[${serviceLabel}] onSuccess callback failed: ${e.message}`));
        }
      }

      // ── 12. Build and return the API response to the client
      // Show the pre-debit balance if wallet was refunded, otherwise show post-debit balance
      const walletBalanceForResponse = mainWalletRestoredAfterFailure
        ? roundNgn(Number(createdTx.balance_before))
        : roundNgn(Number(createdTx.balance_after));
      const formattedResponse: any = { id: createdTx.id, ...response.data, wallet_balance: walletBalanceForResponse };
      // Let the vertical service add extra fields to the response (e.g. electricity token)
      if (config.onEnrichResponse) {
        Object.assign(formattedResponse, config.onEnrichResponse(response.data, extraMeta));
      }

      // If VTpass is still processing, tell the client to wait — cron requery will resolve it later
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
      // ── CATCH BLOCK — handles errors from any step above (network timeout, VTpass 5xx, HttpException from step 9, etc.)
      this.logger.error(`[${serviceLabel}] Error: ${error.message}`);

      try {
        // Check if the tx row was created in step 4 before the error happened
        const existingForUpdate = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: requestId } });
        const errorMeta = {
          request_id: requestId,
          payload: vtpassPayload,
          vtpass_error: error.response?.data || error.message || 'Unknown error',
        };

        if (existingForUpdate) {
          const curMeta = (existingForUpdate.meta_data as Record<string, unknown>) || {};
          const failureRefundDone = curMeta['vtpass_failure_refund_applied'] === true;

          // BRANCH 1: Tx exists AND wallet was already refunded (in step 9, or by cron requery)
          // → Safe to mark as 'failed' because the user's money is back
          if (walletRefundedInTryBlock || failureRefundDone) {
            await this.prisma.transactionHistory.update({
              where: { transaction_reference: requestId },
              data: { status: 'failed', meta_data: { ...curMeta, ...errorMeta } },
            });
            this.logger.warn(
              `[${serviceLabel}] catch: Tx marked failed (refund already applied in try, requery, or parallel path).`,
            );
          } else {
            // BRANCH 2: Tx exists but NO refund happened — we don't know if VTpass processed it or not.
            // Preserve terminal status if step 8 already resolved the tx before the error was thrown.
            const safeStatus = (existingForUpdate.status === 'success' || existingForUpdate.status === 'failed')
              ? existingForUpdate.status
              : 'pending';
            await this.prisma.transactionHistory.update({
              where: { transaction_reference: requestId },
              data: {
                status: safeStatus,
                meta_data: {
                  ...curMeta,
                  ...errorMeta,
                  catch_block_reason: safeStatus === 'pending'
                    ? 'No definitive VTpass response. Kept pending for requery.'
                    : `Preserved existing '${safeStatus}' status despite late error.`,
                },
              },
            });
            this.logger.warn(`[${serviceLabel}] catch: Tx status set to '${safeStatus}' (no refund in catch). ${safeStatus === 'pending' ? 'Will requery.' : 'Terminal status preserved.'}`);
          }
        } else {
          // BRANCH 3: Tx row was never created — error happened before or during step 4's Prisma tx.
          // Wallet was never debited (atomic tx rolled back), so just refund cashback if it was deducted.
          if (split.cashbackCharge > 0 && !cashbackRefundedInTryBlock) {
            await this.cashbackService.refundCashback(userId, split.cashbackCharge);
            this.logger.warn(`[${serviceLabel}] catch: Refunded ₦${split.cashbackCharge} cashback (tx never created, wallet never debited).`);
          }
          // Record a failed tx row for audit trail even though no wallet debit happened
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

      // Log the failure in audit + stats regardless of which branch above ran
      this.auditLogService
        .logTransaction(auditFailAction as AuditAction, AuditStatus.FAILURE, null,
          { amount: chargeAmount, currency: 'NGN', transaction_ref: requestId },
          { user_id: userId, error_message: error.message, metadata: auditMetadata || {} },
        )
        .catch((e) => this.logger.warn(`[${serviceLabel}] Audit log failed: ${e.message}`));
      this.statsService.onTransactionCreated(chargeAmount, 'failed', 0).catch((e) => this.logger.warn(`[${serviceLabel}] Stats failed: ${e.message}`));

      // Re-throw HttpExceptions as-is (e.g. from step 9 after refund); convert axios errors to user-friendly messages
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

  // ─── Requery flow — called by cron to resolve pending VTpass transactions ────
  // Polls VTpass /requery endpoint to check if a pending tx has been delivered or failed.
  // If resolved: updates the tx row, refunds on failure, awards rewards on success.
  async requeryTransaction(requestId: string, config: VtpassRequeryConfig): Promise<{ updated: boolean; status?: string }> {
    const { serviceLabel, auditAction, auditFailAction, cashbackServiceType, maxRequeryAttempts, maxAgeMinutes } = config;
    const url = `${this.getBaseUrl()}/requery`;
    this.logger.log(`[Cron][${serviceLabel}] Requerying: requestId=${requestId}`);

    try {
      // Only requery pending transactions — skip if already resolved
      const transaction = await this.prisma.transactionHistory.findUnique({ where: { transaction_reference: requestId } });
      if (!transaction) { this.logger.warn(`[Cron][${serviceLabel}] Tx not found: ${requestId}`); return { updated: false }; }
      if (transaction.status === 'success') return { updated: false, status: 'success' };
      if (transaction.status === 'failed') return { updated: false, status: 'failed' };

      // Guard: don't requery too many times or if the tx is too old
      const metaData = (transaction.meta_data as any) || {};
      const requeryCount = metaData.requery_count || 0;
      const age = Date.now() - transaction.createdAt.getTime();
      const check = shouldRequeryTransaction(age, requeryCount, maxRequeryAttempts ?? 3, maxAgeMinutes ?? 30);
      if (!check.shouldRequery) {
        this.logger.warn(`[Cron][${serviceLabel}] Skipped ${requestId}: ${check.reason}`);
        return { updated: false };
      }

      // Ask VTpass what happened with this transaction
      const response = await axios.post(url, { request_id: requestId }, { headers: this.getPostHeaders() });
      const txContent = response.data?.content?.transactions || {};
      const responseCodeStr = normalizeVtpassResponseCode(response.data?.code);
      const txStatus = txContent.status?.toLowerCase() || '';
      const responseDescription = response.data?.response_description || '';

      this.logger.log(
        `[Cron][${serviceLabel}] VTpass requery raw: code=${JSON.stringify(response.data?.code)}, ` +
        `normalized=${responseCodeStr}, txStatus=${txStatus}, desc="${responseDescription}"`,
      );

      const { finalStatus, shouldRefund } = determineTransactionStatus(
        responseCodeStr,
        txStatus,
        responseDescription,
        this.logger,
      );

      // Commission logic: use VTpass value on success, zero on failure, keep existing if still pending
      const newCommission = roundNgn(
        finalStatus === 'success'
          ? typeof txContent.commission === 'number'
            ? txContent.commission
            : Number(txContent.commission) || 0
          : finalStatus === 'failed'
            ? 0
            : typeof transaction.commission === 'number'
              ? transaction.commission
              : Number(transaction.commission) || 0,
      );

      // Update the tx row with the requery result and bump the requery_count
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

      // If VTpass confirmed failure, refund the wallet (idempotent — safe if executePurchase already refunded)
      if (shouldRefund && finalStatus === 'failed') {
        // Prefer the exact wallet_charged/cashback_used from meta_data; fall back to tx amount
        const walletRefund = roundNgn(
          typeof metaData.wallet_charged === 'number' ? metaData.wallet_charged : Number(transaction.amount || 0),
        );
        const cashbackRefund = roundNgn(
          typeof metaData.cashback_used === 'number' ? metaData.cashback_used : 0,
        );
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

      // If the tx is no longer pending, fire audit/stats and (on success) rewards + notifications
      if (finalStatus !== 'pending') {
        const auditStatusEnum = finalStatus === 'success' ? AuditStatus.SUCCESS : AuditStatus.FAILURE;
        this.auditLogService
          .logTransaction((finalStatus === 'success' ? auditAction : auditFailAction) as AuditAction, auditStatusEnum, null,
            { amount: transaction.amount || 0, currency: 'NGN', transaction_ref: requestId },
            { user_id: transaction.user_id, resource_type: 'TransactionHistory', resource_id: transaction.id, description: `[Cron] ${serviceLabel} tx resolved to ${finalStatus}` },
          )
          .catch((e) => this.logger.warn(`[Cron][${serviceLabel}] Audit failed: ${e.message}`));

        // Update stats to transition this tx from pending → final status
        const markupVal = typeof transaction.markup_value === 'number' ? transaction.markup_value : 0;
        const commissionVal = roundNgn(
          finalStatus === 'success'
            ? typeof txContent.commission === 'number'
              ? txContent.commission
              : Number(txContent.commission) || 0
            : 0,
        );
        this.statsService.onTransactionStatusChanged('pending', finalStatus, transaction.amount || 0, markupVal, commissionVal)
          .catch((e) => this.logger.warn(`[Cron][${serviceLabel}] Stats failed: ${e.message}`));

        // Same success rewards as executePurchase step 11 — for transactions that resolved late via cron
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
      // Cron errors are swallowed — the job will retry on the next cron tick
      this.logger.error(`[Cron][${serviceLabel}] Error requerying ${requestId}: ${error.message}`);
      return { updated: false };
    }
  }
}

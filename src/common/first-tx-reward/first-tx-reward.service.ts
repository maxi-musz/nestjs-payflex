import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FirstTxRewardConfig } from '@prisma/client';

interface ConfigCache {
  config: FirstTxRewardConfig | null;
  expiresAt: number;
}

@Injectable()
export class FirstTxRewardService {
  private readonly logger = new Logger(FirstTxRewardService.name);

  private cache: ConfigCache | null = null;
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  // ─── Cache layer ─────────────────────────────────────────────

  private async getConfig(): Promise<FirstTxRewardConfig | null> {
    const now = Date.now();

    if (this.cache && now < this.cache.expiresAt) {
      return this.cache.config;
    }

    const config = await this.prisma.firstTxRewardConfig.findUnique({
      where: { id: 'first_tx_reward_config' },
    });

    this.cache = { config, expiresAt: now + FirstTxRewardService.CACHE_TTL_MS };
    return config;
  }

  invalidateCache(): void {
    this.cache = null;
    this.logger.log('First-tx reward config cache invalidated');
  }

  // ─── Check & reward after a successful transaction ──────────

  /**
   * Call from ANY service after a successful transaction.
   * Safe to fire-and-forget — never throws.
   *
   * Only rewards the user ONCE, ever. All eligibility checks
   * (config active, budget, recipient cap, date window, tx type,
   * min amount, KYC) are enforced here.
   */
  async checkAndReward(params: {
    userId: string;
    amount: number;
    transactionType: string;
    transactionRef: string;
  }): Promise<{ rewarded: boolean; rewardAmount: number; reason?: string }> {
    const { userId, amount, transactionType, transactionRef } = params;

    try {
      const config = await this.getConfig();

      if (!config || !config.is_active) {
        return { rewarded: false, rewardAmount: 0, reason: 'program_disabled' };
      }

      // date window check
      const now = new Date();
      if (config.start_date && now < config.start_date) {
        return { rewarded: false, rewardAmount: 0, reason: 'before_start_date' };
      }
      if (config.end_date && now > config.end_date) {
        return { rewarded: false, rewardAmount: 0, reason: 'after_end_date' };
      }

      // eligible transaction type check
      const eligibleTypes = config.eligible_transaction_types as string[];
      if (!Array.isArray(eligibleTypes) || !eligibleTypes.includes(transactionType)) {
        return { rewarded: false, rewardAmount: 0, reason: 'ineligible_tx_type' };
      }

      // minimum amount check
      if (amount < config.min_transaction_amount) {
        return { rewarded: false, rewardAmount: 0, reason: 'below_minimum' };
      }

      // already received? (fast path — unique constraint on user_id)
      const alreadyReceived = await this.prisma.firstTxRewardHistory.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });
      if (alreadyReceived) {
        return { rewarded: false, rewardAmount: 0, reason: 'already_received' };
      }

      // has the user done any previous successful transaction? (must be their FIRST)
      const previousTx = await this.prisma.transactionHistory.count({
        where: {
          user_id: userId,
          status: 'success',
          transaction_type: { in: eligibleTypes as any },
          transaction_reference: { not: transactionRef },
        },
      });
      if (previousTx > 0) {
        return { rewarded: false, rewardAmount: 0, reason: 'not_first_transaction' };
      }

      // KYC check (optional)
      if (config.require_kyc) {
        const kyc = await this.prisma.kycVerification.findUnique({
          where: { userId },
          select: { is_verified: true },
        });
        if (!kyc || !kyc.is_verified) {
          return { rewarded: false, rewardAmount: 0, reason: 'kyc_not_verified' };
        }
      }

      // recipient cap check
      if (config.max_recipients !== null) {
        const recipientCount = await this.prisma.firstTxRewardHistory.count();
        if (recipientCount >= config.max_recipients) {
          return { rewarded: false, rewardAmount: 0, reason: 'recipient_cap_reached' };
        }
      }

      // budget cap check
      if (config.budget_limit !== null) {
        const totalGiven = await this.prisma.firstTxRewardHistory.aggregate({
          _sum: { reward_amount: true },
        });
        const spent = totalGiven._sum.reward_amount || 0;
        if (spent + config.reward_amount > config.budget_limit) {
          return { rewarded: false, rewardAmount: 0, reason: 'budget_exhausted' };
        }
      }

      // all checks passed — issue the reward atomically
      const rewardTxRef = `FTX-${userId.substring(0, 8).toUpperCase()}-${Date.now()}`;

      const result = await this.prisma.$transaction(async (tx) => {
        // double-check inside the transaction (race condition guard)
        const exists = await tx.firstTxRewardHistory.findUnique({
          where: { user_id: userId },
          select: { id: true },
        });
        if (exists) return null;

        const wallet = await tx.wallet.findUnique({
          where: { user_id: userId },
          select: { id: true, current_balance: true },
        });
        if (!wallet) return null;

        const balanceBefore = wallet.current_balance;
        const balanceAfter = balanceBefore + config.reward_amount;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            current_balance: { increment: config.reward_amount },
            all_time_fuunding: { increment: config.reward_amount },
          },
        });

        await tx.transactionHistory.create({
          data: {
            user_id: userId,
            amount: config.reward_amount,
            transaction_type: 'first_tx_bonus',
            credit_debit: 'credit',
            description: 'First transaction bonus — Welcome reward for completing your first transaction!',
            status: 'success',
            currency_type: 'ngn',
            payment_method: 'wallet',
            payment_channel: 'smipay_tag',
            transaction_reference: rewardTxRef,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
          },
        });

        await tx.firstTxRewardHistory.create({
          data: {
            user_id: userId,
            reward_amount: config.reward_amount,
            transaction_ref: rewardTxRef,
            source_transaction_ref: transactionRef,
            source_transaction_type: transactionType,
            source_amount: amount,
          },
        });

        return { rewardAmount: config.reward_amount };
      });

      if (!result) {
        return { rewarded: false, rewardAmount: 0, reason: 'already_received' };
      }

      this.logger.log(
        `First-tx reward: ${userId} earned ₦${result.rewardAmount} (triggered by ${transactionType} of ₦${amount})`,
      );
      return { rewarded: true, rewardAmount: result.rewardAmount };
    } catch (error: any) {
      this.logger.error(`First-tx reward failed for ${userId}: ${error.message}`);
      return { rewarded: false, rewardAmount: 0, reason: 'internal_error' };
    }
  }
}

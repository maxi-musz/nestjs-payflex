import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CashbackServiceType, CashbackConfig, CashbackRule } from '@prisma/client';
import { roundNgn } from 'src/common/money/round-ngn';

export interface PaymentSplit {
  walletCharge: number;
  cashbackCharge: number;
  cashbackBefore: number;
  cashbackAfter: number;
}

// what we keep in memory so we don't hit the db on every single purchase
interface ConfigCache {
  config: CashbackConfig | null;
  rules: Map<CashbackServiceType, CashbackRule>;
  expiresAt: number;
}

@Injectable()
export class CashbackService {
  private readonly logger = new Logger(CashbackService.name);

  // config + rules barely change — cache them in memory, refresh every 60s
  private cache: ConfigCache | null = null;
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  // ─── Cache layer ─────────────────────────────────────────────

  /**
   * Returns config + the rule for a specific service from cache.
   * Fetches from DB only if the cache is empty or expired.
   * One DB call fetches config + ALL rules at once, then serves
   * from memory until the TTL expires.
   */
  private async getConfigAndRule(serviceType: CashbackServiceType) {
    const now = Date.now();

    if (!this.cache || now > this.cache.expiresAt) {
      // one round trip: config + all 7 rules in parallel
      const [config, rules] = await Promise.all([
        this.prisma.cashbackConfig.findUnique({ where: { id: 'cashback_config' } }),
        this.prisma.cashbackRule.findMany(),
      ]);

      const ruleMap = new Map<CashbackServiceType, CashbackRule>();
      for (const r of rules) ruleMap.set(r.service_type, r);

      this.cache = { config, rules: ruleMap, expiresAt: now + CashbackService.CACHE_TTL_MS };
    }

    return {
      config: this.cache.config,
      rule: this.cache.rules.get(serviceType) ?? null,
    };
  }

  /**
   * Call this after admin updates config or rules so changes take effect
   * immediately instead of waiting up to 60s.
   */
  invalidateCache(): void {
    this.cache = null;
    this.logger.log('Cashback config cache invalidated');
  }

  // ─── Active rates (for frontend display) ────────────────────

  /**
   * Returns the cashback percentage for every service type.
   * Served from memory — no DB call unless the cache expired.
   * Frontend uses this to show "2% cashback" badges on quick links.
   */
  async getActiveRates(): Promise<{ service: string; percentage: number; is_active: boolean }[]> {
    const allTypes: CashbackServiceType[] = [
      'airtime', 'data', 'cable', 'electricity', 'education', 'betting', 'international_airtime',
    ];

    // warm the cache if needed (uses the same shared cache)
    await this.getConfigAndRule(allTypes[0]);

    const config = this.cache?.config;
    if (!config || !config.is_active) {
      return allTypes.map((s) => ({ service: s, percentage: 0, is_active: false }));
    }

    return allTypes.map((serviceType) => {
      const rule = this.cache!.rules.get(serviceType);

      if (rule && rule.is_active) {
        return { service: serviceType, percentage: rule.percentage, is_active: true };
      }
      if (rule && !rule.is_active) {
        return { service: serviceType, percentage: 0, is_active: false };
      }
      // no rule — falls back to default percentage
      return { service: serviceType, percentage: config.default_percentage, is_active: true };
    });
  }

  // ─── Process cashback after a purchase ───────────────────────

  /**
   * Call from ANY service after a successful purchase.
   *
   * Example:
   *   this.cashbackService.processCashback({
   *     userId: 'user-uuid',
   *     amount: 1000,
   *     serviceType: 'airtime',
   *     transactionRef: '20260226-airtime-abc123',
   *   });
   *
   * Never throws — silently skips if anything is off.
   */
  async processCashback(params: {
    userId: string;
    amount: number;
    serviceType: CashbackServiceType;
    transactionRef: string;
  }): Promise<{ credited: boolean; cashbackAmount: number; reason?: string }> {
    const { userId, amount: amountRaw, serviceType, transactionRef } = params;
    const amount = roundNgn(amountRaw);

    try {
      // served from memory most of the time — only hits DB once every 60s
      const { config, rule } = await this.getConfigAndRule(serviceType);

      if (!config || !config.is_active) {
        return { credited: false, cashbackAmount: 0, reason: 'program_disabled' };
      }

      let percentage: number;
      let maxCashback: number;
      let minAmount: number;

      if (rule && rule.is_active) {
        percentage = rule.percentage;
        maxCashback = rule.max_cashback_amount ?? config.max_cashback_per_transaction;
        minAmount = rule.min_transaction_amount ?? config.min_transaction_amount;
      } else if (rule && !rule.is_active) {
        return { credited: false, cashbackAmount: 0, reason: 'service_rule_disabled' };
      } else {
        percentage = config.default_percentage;
        maxCashback = config.max_cashback_per_transaction;
        minAmount = config.min_transaction_amount;
      }

      if (amount < minAmount) {
        return { credited: false, cashbackAmount: 0, reason: 'below_minimum' };
      }
      if (percentage <= 0) {
        return { credited: false, cashbackAmount: 0, reason: 'zero_percentage' };
      }

      let cashbackAmount = roundNgn(amount * (percentage / 100));
      if (cashbackAmount > maxCashback) cashbackAmount = roundNgn(maxCashback);

      // daily cap + wallet credit + history — one transaction, one round trip
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const result = await this.prisma.$transaction(async (tx) => {
        const todayTotal = await tx.cashbackHistory.aggregate({
          where: { user_id: userId, status: 'credited', createdAt: { gte: startOfDay } },
          _sum: { amount: true },
        });

        const earnedToday = todayTotal._sum.amount || 0;
        const remainingDaily = config.max_cashback_per_day - earnedToday;

        if (remainingDaily <= 0) return { credited: false, finalAmount: 0, reason: 'daily_cap_reached' };

        let finalAmount = cashbackAmount;
        if (finalAmount > remainingDaily) {
          finalAmount = roundNgn(remainingDaily);
        }

        await tx.cashbackWallet.upsert({
          where: { user_id: userId },
          create: { user_id: userId, current_balance: finalAmount, all_time_earned: finalAmount },
          update: { current_balance: { increment: finalAmount }, all_time_earned: { increment: finalAmount } },
        });

        await tx.cashbackHistory.create({
          data: {
            user_id: userId,
            amount: finalAmount,
            service_type: serviceType,
            transaction_ref: transactionRef,
            percentage_applied: percentage,
            source_amount: amount,
            status: 'credited',
          },
        });

        return { credited: true, finalAmount, reason: undefined };
      });

      if (!result.credited) {
        return { credited: false, cashbackAmount: 0, reason: result.reason };
      }

      this.logger.log(
        `Cashback: ${userId} earned ₦${result.finalAmount} (${percentage}% of ₦${amount}) for ${serviceType}`,
      );
      return { credited: true, cashbackAmount: result.finalAmount };
    } catch (error: any) {
      this.logger.error(`Cashback failed for ${transactionRef}: ${error.message}`);
      return { credited: false, cashbackAmount: 0, reason: 'internal_error' };
    }
  }

  // ─── Split Payment: cashback + main wallet ───────────────────

  /**
   * Call BEFORE deducting from the main wallet.
   *
   * If useCashback is false (or user has no cashback), walletCharge = full
   * amount and everything works exactly as before.
   *
   * Read + deduct in one transaction to prevent race conditions.
   */
  async resolvePayment(
    userId: string,
    totalAmount: number,
    useCashback: boolean,
  ): Promise<PaymentSplit> {
    const total = roundNgn(totalAmount);
    const noSplit: PaymentSplit = {
      walletCharge: total,
      cashbackCharge: 0,
      cashbackBefore: 0,
      cashbackAfter: 0,
    };

    if (!useCashback) return noSplit;

    try {
      const split = await this.prisma.$transaction(async (tx) => {
        const cbWallet = await tx.cashbackWallet.findUnique({ where: { user_id: userId } });

        if (!cbWallet || cbWallet.current_balance <= 0) return null;

        const cashbackBefore = roundNgn(Number(cbWallet.current_balance));
        const cashbackCharge = roundNgn(Math.min(cashbackBefore, total));
        const walletCharge = roundNgn(total - cashbackCharge);
        const cashbackAfter = roundNgn(cashbackBefore - cashbackCharge);

        await tx.cashbackWallet.update({
          where: { user_id: userId },
          data: {
            current_balance: cashbackAfter,
            all_time_withdrawn: { increment: cashbackCharge },
          },
        });

        return { walletCharge, cashbackCharge, cashbackBefore, cashbackAfter } as PaymentSplit;
      });

      if (!split) return noSplit;

      this.logger.log(
        `Payment split for ${userId}: ₦${split.cashbackCharge} cashback + ₦${split.walletCharge} wallet (cb: ${split.cashbackBefore} → ${split.cashbackAfter})`,
      );
      return split;
    } catch (error: any) {
      this.logger.error(`resolvePayment failed for ${userId}: ${error.message}`);
      return noSplit;
    }
  }

  /**
   * Refund cashback if the purchase fails AFTER resolvePayment already deducted.
   * Safe to call with 0.
   */
  async refundCashback(userId: string, cashbackCharge: number): Promise<void> {
    const amt = roundNgn(cashbackCharge);
    if (amt <= 0) return;

    try {
      await this.prisma.cashbackWallet.update({
        where: { user_id: userId },
        data: {
          current_balance: { increment: amt },
          all_time_withdrawn: { decrement: amt },
        },
      });
      this.logger.log(`Refunded ₦${amt} cashback to ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to refund cashback for ${userId}: ${error.message}`);
    }
  }
}

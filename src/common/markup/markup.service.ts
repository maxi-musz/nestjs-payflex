import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CashbackServiceType, MarkupConfig, MarkupRule } from '@prisma/client';

export interface EffectiveMarkup {
  markupPercent: number;
  minAmountToApply: number;
}

interface MarkupCache {
  config: MarkupConfig | null;
  rules: Map<CashbackServiceType, MarkupRule>;
  expiresAt: number;
}

/**
 * Service for resolving effective markup per service (data, airtime, cable, etc.).
 * Used by VTU flows to add margin on top of provider prices.
 * Only uses admin-configured markup (DB). No env fallback — if no config or config off, markup is off.
 */
@Injectable()
export class MarkupService {
  private readonly logger = new Logger(MarkupService.name);
  private cache: MarkupCache | null = null;
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  private async getConfigAndRules(): Promise<{ config: MarkupConfig | null; rules: Map<CashbackServiceType, MarkupRule> }> {
    const now = Date.now();
    if (this.cache && now <= this.cache.expiresAt) {
      return { config: this.cache.config, rules: this.cache.rules };
    }

    const [config, rules] = await Promise.all([
      this.prisma.markupConfig.findUnique({ where: { id: 'markup_config' } }),
      this.prisma.markupRule.findMany(),
    ]);

    const ruleMap = new Map<CashbackServiceType, MarkupRule>();
    for (const r of rules) ruleMap.set(r.service_type, r);

    this.cache = { config, rules: ruleMap, expiresAt: now + MarkupService.CACHE_TTL_MS };
    return { config, rules: ruleMap };
  }

  invalidateCache(): void {
    this.cache = null;
    this.logger.log('Markup config cache invalidated');
  }

  /**
   * Returns effective markup for a service and optional user (for friendlies).
   * Only uses DB config. If no config or markup is off, returns 0% (no markup).
   */
  async getEffectiveMarkup(
    serviceType: CashbackServiceType,
    userPayload?: { is_friendly?: boolean; friendlies?: boolean },
  ): Promise<EffectiveMarkup> {
    const { config, rules } = await this.getConfigAndRules();

    if (!config || !config.is_active) {
      return { markupPercent: 0, minAmountToApply: 0 };
    }

    const rule = rules.get(serviceType);
    const isFriendly = Boolean(userPayload?.is_friendly ?? userPayload?.friendlies);

    if (rule && rule.is_active) {
      const pct = isFriendly && rule.percentage_friendlies != null
        ? rule.percentage_friendlies
        : rule.percentage;
      const minAmount = rule.min_amount_to_apply_markup ?? config.min_amount_to_apply_markup ?? 0;
      return { markupPercent: pct, minAmountToApply: minAmount ?? 0 };
    }

    const pct = isFriendly && config.default_percentage_friendlies != null
      ? config.default_percentage_friendlies
      : config.default_percentage;
    const minAmount = config.min_amount_to_apply_markup ?? 0;
    return { markupPercent: pct, minAmountToApply: minAmount ?? 0 };
  }
}

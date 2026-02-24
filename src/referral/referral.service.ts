import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../common/stats/stats.service';
import { AuditLogService } from '../common/audit-log/audit-log.service';
import { AuditAction, AuditStatus, ReferralStatus, Prisma } from '@prisma/client';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import * as colors from 'colors';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly audit: AuditLogService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // VALIDATE — Check referral code before registration
  // ──────────────────────────────────────────────────────────

  async validateReferralCode(code: string): Promise<{ valid: boolean; referrer_name?: string }> {
    const referrer = await this.prisma.user.findFirst({
      where: { smipay_tag: { equals: code, mode: 'insensitive' } },
      select: { id: true, first_name: true, smipay_tag: true, account_status: true },
    });

    if (!referrer || referrer.account_status !== 'active') {
      return { valid: false };
    }

    const config = await this.getConfig();
    if (!config.is_active) {
      return { valid: false };
    }

    const existingCount = await this.prisma.referral.count({
      where: { referrer_id: referrer.id },
    });
    if (existingCount >= config.max_referrals_per_user) {
      return { valid: false };
    }

    return {
      valid: true,
      referrer_name: referrer.first_name ?? referrer.smipay_tag ?? undefined,
    };
  }

  // ──────────────────────────────────────────────────────────
  // CREATE — Called during registration after user is created
  // ──────────────────────────────────────────────────────────

  async createReferral(params: {
    referralCode: string;
    refereeUserId: string;
    refereePhoneNumber: string;
    registrationProgressId?: string;
  }): Promise<void> {
    try {
      const config = await this.getConfig();
      if (!config.is_active) {
        this.logger.log(colors.yellow('Referral program is disabled, skipping'));
        return;
      }

      const referrer = await this.prisma.user.findFirst({
        where: { smipay_tag: { equals: params.referralCode, mode: 'insensitive' } },
        select: { id: true, smipay_tag: true },
      });

      if (!referrer) {
        this.logger.warn(colors.yellow(`Referral code ${params.referralCode} not found, skipping`));
        return;
      }

      if (referrer.id === params.refereeUserId) {
        this.logger.warn(colors.yellow('Self-referral attempt blocked'));
        return;
      }

      const existing = await this.prisma.referral.findFirst({
        where: {
          OR: [
            { referee_user_id: params.refereeUserId },
            { referee_phone_number: params.refereePhoneNumber, referrer_id: referrer.id },
          ],
        },
      });
      if (existing) {
        this.logger.warn(colors.yellow('Duplicate referral, skipping'));
        return;
      }

      await this.prisma.referral.create({
        data: {
          referrer_id: referrer.id,
          referee_phone_number: params.refereePhoneNumber,
          referee_user_id: params.refereeUserId,
          referral_code_used: params.referralCode,
          status: ReferralStatus.pending,
          referee_registered: true,
          referee_registered_at: new Date(),
          registration_progress_id: params.registrationProgressId ?? null,
        },
      });

      this.stats.onReferralCreated();
      this.logger.log(colors.green(`Referral created: ${params.referralCode} → ${params.refereePhoneNumber}`));

      // If reward trigger is "registration", issue rewards immediately
      if (config.reward_trigger === 'registration') {
        const referral = await this.prisma.referral.findFirst({
          where: { referee_user_id: params.refereeUserId, referrer_id: referrer.id },
        });
        if (referral) {
          await this.issueRewards(referral.id);
        }
      }
    } catch (error) {
      this.logger.error(colors.red(`Failed to create referral: ${error.message}`), error.stack);
    }
  }

  // ──────────────────────────────────────────────────────────
  // TRIGGER CHECK — Called after transaction completes
  // ──────────────────────────────────────────────────────────

  async checkAndTriggerReward(userId: string, transactionAmount: number): Promise<void> {
    try {
      const config = await this.getConfig();
      if (!config.is_active || config.reward_trigger !== 'first_transaction') return;

      if (transactionAmount < config.min_transaction_amount) return;

      const referral = await this.prisma.referral.findFirst({
        where: {
          referee_user_id: userId,
          status: ReferralStatus.pending,
          referee_first_tx: false,
          is_active: true,
        },
      });

      if (!referral) return;

      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          referee_first_tx: true,
          referee_first_tx_at: new Date(),
          status: ReferralStatus.eligible,
        },
      });

      this.logger.log(colors.green(`Referral ${referral.id} eligible — first tx by user ${userId}`));
      await this.issueRewards(referral.id);
    } catch (error) {
      this.logger.error(colors.red(`Referral reward check failed: ${error.message}`), error.stack);
    }
  }

  // ──────────────────────────────────────────────────────────
  // ISSUE REWARDS — Credit both wallets
  // ──────────────────────────────────────────────────────────

  async issueRewards(referralId: string): Promise<void> {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        referrer: { select: { id: true, first_name: true, smipay_tag: true, wallet: { select: { id: true, current_balance: true } } } },
        referee: { select: { id: true, first_name: true, smipay_tag: true, wallet: { select: { id: true, current_balance: true } } } },
      },
    });

    if (!referral || !referral.referrer || !referral.referee) return;
    if (referral.referrer_reward_given && referral.referee_reward_given) return;
    if (referral.manually_rejected) return;

    const config = await this.getConfig();
    const referrerWallet = referral.referrer.wallet;
    const refereeWallet = referral.referee.wallet;

    if (!referrerWallet || !refereeWallet) {
      this.logger.warn(colors.yellow('One or both wallets missing, cannot issue reward'));
      return;
    }

    const now = new Date();
    const txRefBase = `REF-${referral.id.substring(0, 8).toUpperCase()}-${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      // Credit referrer
      if (!referral.referrer_reward_given && config.referrer_reward_amount > 0) {
        await tx.wallet.update({
          where: { id: referrerWallet.id },
          data: {
            current_balance: { increment: config.referrer_reward_amount },
            all_time_fuunding: { increment: config.referrer_reward_amount },
          },
        });

        await tx.transactionHistory.create({
          data: {
            user_id: referral.referrer_id,
            amount: config.referrer_reward_amount,
            transaction_type: 'referral_bonus',
            credit_debit: 'credit',
            description: `Referral bonus — ${referral.referee?.first_name || 'Friend'} joined using your code`,
            status: 'success',
            currency_type: 'ngn',
            payment_method: 'wallet',
            payment_channel: 'smipay_tag',
            transaction_reference: `${txRefBase}-REFERRER`,
            balance_before: referrerWallet.current_balance,
            balance_after: referrerWallet.current_balance + config.referrer_reward_amount,
          },
        });
      }

      // Credit referee
      if (!referral.referee_reward_given && config.referee_reward_amount > 0 && referral.referee) {
        await tx.wallet.update({
          where: { id: refereeWallet.id },
          data: {
            current_balance: { increment: config.referee_reward_amount },
            all_time_fuunding: { increment: config.referee_reward_amount },
          },
        });

        await tx.transactionHistory.create({
          data: {
            user_id: referral.referee.id,
            amount: config.referee_reward_amount,
            transaction_type: 'referral_bonus',
            credit_debit: 'credit',
            description: `Welcome bonus — You joined with ${referral.referrer?.first_name || 'a friend'}'s referral`,
            status: 'success',
            currency_type: 'ngn',
            payment_method: 'wallet',
            payment_channel: 'smipay_tag',
            transaction_reference: `${txRefBase}-REFEREE`,
            balance_before: refereeWallet.current_balance,
            balance_after: refereeWallet.current_balance + config.referee_reward_amount,
          },
        });
      }

      // Update referral record
      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: ReferralStatus.rewarded,
          referrer_reward_given: true,
          referrer_reward_amount: config.referrer_reward_amount,
          referrer_reward_given_at: now,
          referrer_reward_tx_ref: `${txRefBase}-REFERRER`,
          referee_reward_given: true,
          referee_reward_amount: config.referee_reward_amount,
          referee_reward_given_at: now,
          referee_reward_tx_ref: `${txRefBase}-REFEREE`,
        },
      });
    });

    this.logger.log(colors.green(
      `Rewards issued for referral ${referralId}: ` +
      `referrer ₦${config.referrer_reward_amount} → ${referral.referrer.smipay_tag}, ` +
      `referee ₦${config.referee_reward_amount} → ${referral.referee?.smipay_tag}`,
    ));
  }

  // ──────────────────────────────────────────────────────────
  // USER-FACING — My referrals
  // ──────────────────────────────────────────────────────────

  async getMyReferralInfo(userId: string): Promise<ApiResponseDto<any>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { smipay_tag: true, first_name: true },
    });

    if (!user?.smipay_tag) {
      throw new BadRequestException('No referral code available');
    }

    const config = await this.getConfig();

    const referrals = await this.prisma.referral.findMany({
      where: { referrer_id: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        referrer_reward_given: true,
        referrer_reward_amount: true,
        referrer_reward_given_at: true,
        referee_registered_at: true,
        referee_first_tx: true,
        createdAt: true,
        referee: {
          select: { first_name: true, profile_image: { select: { secure_url: true } } },
        },
      },
    });

    const totalEarned = referrals
      .filter((r) => r.referrer_reward_given)
      .reduce((sum, r) => sum + (r.referrer_reward_amount ?? 0), 0);

    return new ApiResponseDto(true, 'Referral info fetched', {
      my_referral_code: user.smipay_tag,
      share_message: `Join me on Smipay! Use my referral code "${user.smipay_tag}" when you sign up and we both earn rewards. Download: https://smipay.app/download`,
      program: {
        is_active: config.is_active,
        referrer_reward: config.referrer_reward_amount,
        referee_reward: config.referee_reward_amount,
        reward_trigger: config.reward_trigger,
        max_referrals: config.max_referrals_per_user,
      },
      stats: {
        total_referrals: referrals.length,
        completed: referrals.filter((r) => r.status === 'rewarded').length,
        pending: referrals.filter((r) => r.status === 'pending' || r.status === 'eligible').length,
        total_earned: totalEarned,
      },
      referrals: referrals.map((r) => ({
        id: r.id,
        friend_name: r.referee?.first_name ?? 'Friend',
        friend_avatar: r.referee?.profile_image?.secure_url ?? null,
        status: r.status,
        reward_earned: r.referrer_reward_given ? r.referrer_reward_amount : null,
        joined_at: r.referee_registered_at,
        completed_first_tx: r.referee_first_tx,
        created_at: r.createdAt,
      })),
    });
  }

  // ──────────────────────────────────────────────────────────
  // ADMIN — List all referrals with analytics
  // ──────────────────────────────────────────────────────────

  async adminListReferrals(query: {
    page?: number;
    limit?: number;
    status?: ReferralStatus;
    referrer_id?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponseDto<any>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ReferralWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.referrer_id) where.referrer_id = query.referrer_id;
    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) where.createdAt.gte = new Date(query.date_from);
      if (query.date_to) where.createdAt.lte = new Date(query.date_to);
    }
    if (query.search) {
      where.OR = [
        { referral_code_used: { contains: query.search, mode: 'insensitive' } },
        { referee_phone_number: { contains: query.search } },
        { referrer: { smipay_tag: { contains: query.search, mode: 'insensitive' } } },
        { referrer: { email: { contains: query.search, mode: 'insensitive' } } },
        { referee: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(todayStart);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      referrals,
      total,
      totalAll,
      byStatus,
      today,
      thisWeek,
      thisMonth,
      totalRewarded,
      totalRewardVolume,
      config,
    ] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: {
            select: { id: true, first_name: true, last_name: true, email: true, smipay_tag: true, profile_image: { select: { secure_url: true } } },
          },
          referee: {
            select: { id: true, first_name: true, last_name: true, email: true, smipay_tag: true, phone_number: true, profile_image: { select: { secure_url: true } } },
          },
        },
      }),
      this.prisma.referral.count({ where }),
      this.prisma.referral.count(),
      this.prisma.referral.groupBy({ by: ['status'], _count: true }),
      this.prisma.referral.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.referral.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.referral.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.referral.count({ where: { status: 'rewarded' } }),
      this.prisma.referral.aggregate({
        _sum: { referrer_reward_amount: true, referee_reward_amount: true },
        where: { referrer_reward_given: true },
      }),
      this.getConfig(),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) statusMap[s.status] = s._count;

    const totalPaidOut =
      (totalRewardVolume._sum.referrer_reward_amount ?? 0) +
      (totalRewardVolume._sum.referee_reward_amount ?? 0);

    return new ApiResponseDto(true, 'Referrals fetched', {
      analytics: {
        overview: {
          total_referrals: totalAll,
          today,
          this_week: thisWeek,
          this_month: thisMonth,
          total_rewarded: totalRewarded,
          total_paid_out: totalPaidOut,
        },
        by_status: statusMap,
        config: {
          is_active: config.is_active,
          referrer_reward: config.referrer_reward_amount,
          referee_reward: config.referee_reward_amount,
          reward_trigger: config.reward_trigger,
          max_per_user: config.max_referrals_per_user,
          expiry_days: config.referral_expiry_days,
          min_tx_amount: config.min_transaction_amount,
        },
      },
      referrals,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  }

  // ──────────────────────────────────────────────────────────
  // ADMIN — Update config
  // ──────────────────────────────────────────────────────────

  async adminUpdateConfig(
    adminId: string,
    data: {
      is_active?: boolean;
      referrer_reward_amount?: number;
      referee_reward_amount?: number;
      reward_trigger?: string;
      max_referrals_per_user?: number;
      referral_expiry_days?: number;
      min_transaction_amount?: number;
    },
    req?: any,
  ): Promise<ApiResponseDto<any>> {
    const config = await this.prisma.referralConfig.upsert({
      where: { id: 'referral_config' },
      create: {
        ...data,
        updated_by: adminId,
      } as any,
      update: {
        ...data,
        updated_by: adminId,
      },
    });

    if (req) {
      this.audit.logAdmin(AuditAction.REFERRAL_CONFIG_UPDATE, AuditStatus.SUCCESS, adminId, req, {
        description: 'Referral config updated',
        resource_type: 'ReferralConfig',
        resource_id: 'referral_config',
        new_values: data,
      });
    }

    return new ApiResponseDto(true, 'Referral config updated', config);
  }

  // ──────────────────────────────────────────────────────────
  // ADMIN — Manual approve/reject reward
  // ──────────────────────────────────────────────────────────

  async adminManualReward(referralId: string, adminId: string, req?: any): Promise<ApiResponseDto<any>> {
    const referral = await this.prisma.referral.findUnique({ where: { id: referralId } });
    if (!referral) throw new BadRequestException('Referral not found');
    if (referral.referrer_reward_given && referral.referee_reward_given) {
      throw new BadRequestException('Rewards already issued');
    }
    if (referral.manually_rejected) {
      throw new BadRequestException('Referral was rejected');
    }

    await this.prisma.referral.update({
      where: { id: referralId },
      data: { manually_approved: true, manually_approved_by: adminId },
    });

    await this.issueRewards(referralId);

    if (req) {
      this.audit.logAdmin(AuditAction.REFERRAL_MANUAL_APPROVE, AuditStatus.SUCCESS, adminId, req, {
        description: `Manually approved referral reward ${referralId}`,
        resource_type: 'Referral',
        resource_id: referralId,
      });
    }

    return new ApiResponseDto(true, 'Reward issued manually', { referral_id: referralId });
  }

  async adminRejectReferral(referralId: string, reason: string, adminId: string, req?: any): Promise<ApiResponseDto<any>> {
    const referral = await this.prisma.referral.findUnique({ where: { id: referralId } });
    if (!referral) throw new BadRequestException('Referral not found');

    const updated = await this.prisma.referral.update({
      where: { id: referralId },
      data: {
        manually_rejected: true,
        rejection_reason: reason,
        status: ReferralStatus.rejected,
        is_active: false,
      },
    });

    if (req) {
      this.audit.logAdmin(AuditAction.REFERRAL_MANUAL_REJECT, AuditStatus.SUCCESS, adminId, req, {
        description: `Rejected referral ${referralId}: ${reason}`,
        resource_type: 'Referral',
        resource_id: referralId,
      });
    }

    return new ApiResponseDto(true, 'Referral rejected', updated);
  }

  // ──────────────────────────────────────────────────────────
  // ADMIN — Top referrers leaderboard
  // ──────────────────────────────────────────────────────────

  async adminTopReferrers(limit: number = 20): Promise<ApiResponseDto<any>> {
    const topReferrers = await this.prisma.referral.groupBy({
      by: ['referrer_id'],
      _count: true,
      orderBy: { _count: { referrer_id: 'desc' } },
      take: limit,
    });

    const userIds = topReferrers.map((r) => r.referrer_id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true, first_name: true, last_name: true, email: true, smipay_tag: true,
        profile_image: { select: { secure_url: true } },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Get reward totals per referrer
    const rewardTotals = await this.prisma.referral.groupBy({
      by: ['referrer_id'],
      _sum: { referrer_reward_amount: true },
      where: { referrer_id: { in: userIds }, referrer_reward_given: true },
    });
    const rewardMap = new Map(rewardTotals.map((r) => [r.referrer_id, r._sum.referrer_reward_amount ?? 0]));

    return new ApiResponseDto(true, 'Top referrers fetched', {
      leaderboard: topReferrers.map((r) => ({
        user: userMap.get(r.referrer_id) ?? { id: r.referrer_id },
        referral_count: r._count,
        total_earned: rewardMap.get(r.referrer_id) ?? 0,
      })),
    });
  }

  // ──────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────

  private async getConfig() {
    let config = await this.prisma.referralConfig.findUnique({
      where: { id: 'referral_config' },
    });
    if (!config) {
      config = await this.prisma.referralConfig.create({
        data: {
          id: 'referral_config',
          is_active: true,
          referrer_reward_amount: 200,
          referee_reward_amount: 100,
          reward_trigger: 'first_transaction',
          max_referrals_per_user: 50,
          referral_expiry_days: 90,
          min_transaction_amount: 100,
        },
      });
    }
    return config;
  }
}

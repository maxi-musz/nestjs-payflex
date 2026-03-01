import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';
import { FirstTxRewardService } from 'src/common/first-tx-reward/first-tx-reward.service';
import { AuditAction, AuditStatus } from '@prisma/client';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { UpdateFirstTxRewardConfigDto } from './dto/first-tx-reward.dto';

@Injectable()
export class AdminFirstTxRewardService {
  private readonly logger = new Logger(AdminFirstTxRewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly firstTxRewardService: FirstTxRewardService,
  ) {}

  // ─── Config ──────────────────────────────────────────────────

  async getConfig(): Promise<ApiResponseDto<any>> {
    const config = await this.prisma.firstTxRewardConfig.upsert({
      where: { id: 'first_tx_reward_config' },
      create: {},
      update: {},
    });

    const recipientCount = await this.prisma.firstTxRewardHistory.count();

    const totalGiven = await this.prisma.firstTxRewardHistory.aggregate({
      _sum: { reward_amount: true },
    });

    return new ApiResponseDto(true, 'First-tx reward config fetched', {
      config,
      stats: {
        total_recipients: recipientCount,
        total_given: totalGiven._sum.reward_amount || 0,
        budget_remaining:
          config.budget_limit !== null
            ? Math.max(0, config.budget_limit - (totalGiven._sum.reward_amount || 0))
            : null,
        recipient_slots_remaining:
          config.max_recipients !== null
            ? Math.max(0, config.max_recipients - recipientCount)
            : null,
      },
    });
  }

  async updateConfig(
    adminId: string,
    dto: UpdateFirstTxRewardConfigDto,
    req?: any,
  ): Promise<ApiResponseDto<any>> {
    const updateData: any = { updated_by: adminId };

    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
    if (dto.reward_amount !== undefined) updateData.reward_amount = dto.reward_amount;
    if (dto.min_transaction_amount !== undefined) updateData.min_transaction_amount = dto.min_transaction_amount;
    if (dto.eligible_transaction_types !== undefined) updateData.eligible_transaction_types = dto.eligible_transaction_types;
    if (dto.budget_limit !== undefined) updateData.budget_limit = dto.budget_limit;
    if (dto.max_recipients !== undefined) updateData.max_recipients = dto.max_recipients;
    if (dto.require_kyc !== undefined) updateData.require_kyc = dto.require_kyc;

    if (dto.start_date !== undefined) {
      updateData.start_date = dto.start_date ? new Date(dto.start_date) : null;
    }
    if (dto.end_date !== undefined) {
      updateData.end_date = dto.end_date ? new Date(dto.end_date) : null;
    }

    const config = await this.prisma.firstTxRewardConfig.upsert({
      where: { id: 'first_tx_reward_config' },
      create: updateData,
      update: updateData,
    });

    if (req) {
      this.audit.logAdmin(
        AuditAction.FIRST_TX_REWARD_CONFIG_UPDATE,
        AuditStatus.SUCCESS,
        adminId,
        req,
        {
          description: 'First-tx reward config updated',
          resource_type: 'FirstTxRewardConfig',
          resource_id: 'first_tx_reward_config',
          new_values: dto,
        },
      );
    }

    this.firstTxRewardService.invalidateCache();
    this.logger.log(`First-tx reward config updated by admin ${adminId}`);
    return new ApiResponseDto(true, 'First-tx reward config updated', config);
  }

  // ─── Analytics ───────────────────────────────────────────────

  async getAnalytics(): Promise<ApiResponseDto<any>> {
    const config = await this.prisma.firstTxRewardConfig.findUnique({
      where: { id: 'first_tx_reward_config' },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const weekAgo = new Date(startOfDay);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(startOfDay);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      totalRecipients,
      totalGiven,
      todayRecipients,
      todayGiven,
      weekRecipients,
      monthRecipients,
      byTxType,
    ] = await Promise.all([
      this.prisma.firstTxRewardHistory.count(),
      this.prisma.firstTxRewardHistory.aggregate({ _sum: { reward_amount: true } }),
      this.prisma.firstTxRewardHistory.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.firstTxRewardHistory.aggregate({
        where: { createdAt: { gte: startOfDay } },
        _sum: { reward_amount: true },
      }),
      this.prisma.firstTxRewardHistory.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.firstTxRewardHistory.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.firstTxRewardHistory.groupBy({
        by: ['source_transaction_type'],
        _count: true,
        _sum: { reward_amount: true },
        orderBy: { _count: { source_transaction_type: 'desc' } },
      }),
    ]);

    const totalSpent = totalGiven._sum.reward_amount || 0;

    return new ApiResponseDto(true, 'First-tx reward analytics fetched', {
      config,
      analytics: {
        overview: {
          total_recipients: totalRecipients,
          total_given: totalSpent,
          budget_remaining:
            config?.budget_limit !== null && config?.budget_limit !== undefined
              ? Math.max(0, config.budget_limit - totalSpent)
              : null,
          recipient_slots_remaining:
            config?.max_recipients !== null && config?.max_recipients !== undefined
              ? Math.max(0, config.max_recipients - totalRecipients)
              : null,
        },
        today: {
          recipients: todayRecipients,
          amount_given: todayGiven._sum.reward_amount || 0,
        },
        this_week: { recipients: weekRecipients },
        this_month: { recipients: monthRecipients },
        by_trigger_type: byTxType.map((s) => ({
          transaction_type: s.source_transaction_type,
          count: s._count,
          total_amount: s._sum.reward_amount || 0,
        })),
      },
    });
  }

  // ─── History ─────────────────────────────────────────────────

  async getHistory(query: {
    user_id?: string;
    source_transaction_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponseDto<any>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.user_id) where.user_id = query.user_id;
    if (query.source_transaction_type) where.source_transaction_type = query.source_transaction_type;
    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) where.createdAt.gte = new Date(query.date_from);
      if (query.date_to) where.createdAt.lte = new Date(query.date_to);
    }

    const [history, total] = await Promise.all([
      this.prisma.firstTxRewardHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.firstTxRewardHistory.count({ where }),
    ]);

    return new ApiResponseDto(true, 'First-tx reward history fetched', {
      history,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  }
}

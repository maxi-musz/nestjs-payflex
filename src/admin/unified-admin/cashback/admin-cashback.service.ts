import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';
import { CashbackService } from 'src/common/cashback/cashback.service';
import { AuditAction, AuditStatus, CashbackServiceType } from '@prisma/client';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import {
  UpdateCashbackConfigDto,
  CreateCashbackRuleDto,
  UpdateCashbackRuleDto,
} from './dto/cashback.dto';

@Injectable()
export class AdminCashbackService {
  private readonly logger = new Logger(AdminCashbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly cashbackService: CashbackService,
  ) {}

  // ─── Config ──────────────────────────────────────────────────

  async getConfig(): Promise<ApiResponseDto<any>> {
    // upsert so the first call ever seeds the defaults
    const config = await this.prisma.cashbackConfig.upsert({
      where: { id: 'cashback_config' },
      create: {},
      update: {},
    });

    // pull all rules alongside so admin sees everything in one go
    const rules = await this.prisma.cashbackRule.findMany({ orderBy: { service_type: 'asc' } });

    return new ApiResponseDto(true, 'Cashback config fetched', { config, rules });
  }

  async updateConfig(
    adminId: string,
    dto: UpdateCashbackConfigDto,
    req?: any,
  ): Promise<ApiResponseDto<any>> {
    const config = await this.prisma.cashbackConfig.upsert({
      where: { id: 'cashback_config' },
      create: { ...dto, updated_by: adminId } as any,
      update: { ...dto, updated_by: adminId },
    });

    // pull rules too so the frontend gets the full picture back
    const rules = await this.prisma.cashbackRule.findMany({ orderBy: { service_type: 'asc' } });

    if (req) {
      this.audit.logAdmin(AuditAction.CASHBACK_CONFIG_UPDATE, AuditStatus.SUCCESS, adminId, req, {
        description: 'Cashback config updated',
        resource_type: 'CashbackConfig',
        resource_id: 'cashback_config',
        new_values: dto,
      });
    }

    this.cashbackService.invalidateCache();
    this.logger.log(`Cashback config updated by admin ${adminId}`);
    return new ApiResponseDto(true, 'Cashback config updated', { config, rules });
  }

  // ─── Rules (per-service cashback %) ──────────────────────────

  async createRule(
    adminId: string,
    dto: CreateCashbackRuleDto,
    req?: any,
  ): Promise<ApiResponseDto<any>> {
    // one rule per service type
    const exists = await this.prisma.cashbackRule.findUnique({
      where: { service_type: dto.service_type },
    });
    if (exists) {
      throw new BadRequestException(
        `Rule for "${dto.service_type}" already exists. Use the update endpoint instead.`,
      );
    }

    const rule = await this.prisma.cashbackRule.create({
      data: { ...dto, updated_by: adminId },
    });

    if (req) {
      this.audit.logAdmin(AuditAction.CASHBACK_RULE_CREATE, AuditStatus.SUCCESS, adminId, req, {
        description: `Cashback rule created for ${dto.service_type}`,
        resource_type: 'CashbackRule',
        resource_id: rule.id,
        new_values: dto,
      });
    }

    this.cashbackService.invalidateCache();
    this.logger.log(`Cashback rule created for ${dto.service_type} — ${dto.percentage}%`);
    return new ApiResponseDto(true, 'Cashback rule created', rule);
  }

  async updateRule(
    ruleId: string,
    adminId: string,
    dto: UpdateCashbackRuleDto,
    req?: any,
  ): Promise<ApiResponseDto<any>> {
    const existing = await this.prisma.cashbackRule.findUnique({ where: { id: ruleId } });
    if (!existing) throw new NotFoundException('Cashback rule not found');

    const rule = await this.prisma.cashbackRule.update({
      where: { id: ruleId },
      data: { ...dto, updated_by: adminId },
    });

    if (req) {
      this.audit.logAdmin(AuditAction.CASHBACK_RULE_UPDATE, AuditStatus.SUCCESS, adminId, req, {
        description: `Cashback rule updated for ${existing.service_type}`,
        resource_type: 'CashbackRule',
        resource_id: ruleId,
        old_values: {
          percentage: existing.percentage,
          is_active: existing.is_active,
          max_cashback_amount: existing.max_cashback_amount,
          min_transaction_amount: existing.min_transaction_amount,
        },
        new_values: dto,
      });
    }

    this.cashbackService.invalidateCache();
    this.logger.log(`Cashback rule for ${existing.service_type} updated by admin ${adminId}`);
    return new ApiResponseDto(true, 'Cashback rule updated', rule);
  }

  async deleteRule(
    ruleId: string,
    adminId: string,
    req?: any,
  ): Promise<ApiResponseDto<any>> {
    const existing = await this.prisma.cashbackRule.findUnique({ where: { id: ruleId } });
    if (!existing) throw new NotFoundException('Cashback rule not found');

    await this.prisma.cashbackRule.delete({ where: { id: ruleId } });

    if (req) {
      this.audit.logAdmin(AuditAction.CASHBACK_RULE_DELETE, AuditStatus.SUCCESS, adminId, req, {
        description: `Cashback rule deleted for ${existing.service_type}`,
        resource_type: 'CashbackRule',
        resource_id: ruleId,
        old_values: existing,
      });
    }

    this.cashbackService.invalidateCache();
    this.logger.log(`Cashback rule for ${existing.service_type} deleted by admin ${adminId}`);
    return new ApiResponseDto(true, 'Cashback rule deleted', { id: ruleId, service_type: existing.service_type });
  }

  async listRules(): Promise<ApiResponseDto<any>> {
    const rules = await this.prisma.cashbackRule.findMany({ orderBy: { service_type: 'asc' } });
    return new ApiResponseDto(true, 'Cashback rules fetched', rules);
  }

  // ─── Analytics / History ─────────────────────────────────────

  async getAnalytics(): Promise<ApiResponseDto<any>> {
    const config = await this.prisma.cashbackConfig.findUnique({ where: { id: 'cashback_config' } });
    const rules = await this.prisma.cashbackRule.findMany({ orderBy: { service_type: 'asc' } });

    // totals across all users
    const totals = await this.prisma.cashbackHistory.aggregate({
      _sum: { amount: true },
      _count: true,
    });

    // today's cashback
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const today = await this.prisma.cashbackHistory.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { amount: true },
      _count: true,
    });

    // per-service breakdown
    const byService = await this.prisma.cashbackHistory.groupBy({
      by: ['service_type'],
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    // total unique users who received cashback
    const uniqueUsers = await this.prisma.cashbackHistory.groupBy({
      by: ['user_id'],
      _count: true,
    });

    return new ApiResponseDto(true, 'Cashback analytics fetched', {
      config,
      rules,
      analytics: {
        total_cashback_given: totals._sum.amount || 0,
        total_transactions: totals._count,
        today_cashback_given: today._sum.amount || 0,
        today_transactions: today._count,
        unique_users: uniqueUsers.length,
        by_service: byService.map((s) => ({
          service_type: s.service_type,
          total_amount: s._sum.amount || 0,
          transaction_count: s._count,
        })),
      },
    });
  }

  async getCashbackHistory(query: {
    user_id?: string;
    service_type?: CashbackServiceType;
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
    if (query.service_type) where.service_type = query.service_type;
    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) where.createdAt.gte = new Date(query.date_from);
      if (query.date_to) where.createdAt.lte = new Date(query.date_to);
    }

    const [history, total] = await Promise.all([
      this.prisma.cashbackHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cashbackHistory.count({ where }),
    ]);

    return new ApiResponseDto(true, 'Cashback history fetched', {
      history,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  }

  // ─── Seed all service rules at once (convenience) ─────────────

  async seedDefaultRules(adminId: string, req?: any): Promise<ApiResponseDto<any>> {
    const allTypes = Object.values(CashbackServiceType);
    const existingRules = await this.prisma.cashbackRule.findMany({
      select: { service_type: true },
    });
    const existingTypes = new Set(existingRules.map((r) => r.service_type));

    // only create rules for services that don't already have one
    const missing = allTypes.filter((t) => !existingTypes.has(t));
    if (missing.length === 0) {
      return new ApiResponseDto(true, 'All service rules already exist', { created: 0 });
    }

    const created = await this.prisma.cashbackRule.createMany({
      data: missing.map((service_type) => ({
        service_type,
        percentage: 0,
        is_active: false,
        updated_by: adminId,
      })),
    });

    if (req) {
      this.audit.logAdmin(AuditAction.CASHBACK_RULE_CREATE, AuditStatus.SUCCESS, adminId, req, {
        description: `Seeded ${created.count} default cashback rules`,
        resource_type: 'CashbackRule',
        new_values: { seeded_services: missing },
      });
    }

    this.cashbackService.invalidateCache();
    const rules = await this.prisma.cashbackRule.findMany({ orderBy: { service_type: 'asc' } });
    this.logger.log(`Seeded ${created.count} default cashback rules`);
    return new ApiResponseDto(true, `Created ${created.count} cashback rules`, rules);
  }
}

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';
import { MarkupService } from 'src/common/markup/markup.service';
import { AuditAction, AuditStatus, CashbackServiceType } from '@prisma/client';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import {
  UpdateMarkupConfigDto,
  CreateMarkupRuleDto,
  UpdateMarkupRuleDto,
} from './dto/markup.dto';

@Injectable()
export class AdminMarkupService {
  private readonly logger = new Logger(AdminMarkupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly markupService: MarkupService,
  ) {}

  async getConfig(): Promise<ApiResponseDto<any>> {
    const config = await this.prisma.markupConfig.upsert({
      where: { id: 'markup_config' },
      create: {},
      update: {},
    });

    const rules = await this.prisma.markupRule.findMany({ orderBy: { service_type: 'asc' } });

    return new ApiResponseDto(true, 'Markup config fetched', { config, rules });
  }

  async updateConfig(
    adminId: string,
    dto: UpdateMarkupConfigDto,
    req?: any,
  ): Promise<ApiResponseDto<any>> {
    const config = await this.prisma.markupConfig.upsert({
      where: { id: 'markup_config' },
      create: { ...dto, updated_by: adminId } as any,
      update: { ...dto, updated_by: adminId },
    });

    const rules = await this.prisma.markupRule.findMany({ orderBy: { service_type: 'asc' } });

    if (req) {
      this.audit.logAdmin(AuditAction.MARKUP_CONFIG_UPDATE, AuditStatus.SUCCESS, adminId, req, {
        description: 'Markup config updated',
        resource_type: 'MarkupConfig',
        resource_id: 'markup_config',
        new_values: dto,
      });
    }

    this.markupService.invalidateCache();
    this.logger.log(`Markup config updated by admin ${adminId}`);
    return new ApiResponseDto(true, 'Markup config updated', { config, rules });
  }

  async createRule(
    adminId: string,
    dto: CreateMarkupRuleDto,
    req?: any,
  ): Promise<ApiResponseDto<any>> {
    const exists = await this.prisma.markupRule.findUnique({
      where: { service_type: dto.service_type },
    });
    if (exists) {
      throw new BadRequestException(
        `Rule for "${dto.service_type}" already exists. Use the update endpoint instead.`,
      );
    }

    const rule = await this.prisma.markupRule.create({
      data: { ...dto, updated_by: adminId },
    });

    if (req) {
      this.audit.logAdmin(AuditAction.MARKUP_RULE_CREATE, AuditStatus.SUCCESS, adminId, req, {
        description: `Markup rule created for ${dto.service_type}`,
        resource_type: 'MarkupRule',
        resource_id: rule.id,
        new_values: dto,
      });
    }

    this.markupService.invalidateCache();
    this.logger.log(`Markup rule created for ${dto.service_type} — ${dto.percentage}%`);
    return new ApiResponseDto(true, 'Markup rule created', rule);
  }

  async updateRule(
    ruleId: string,
    adminId: string,
    dto: UpdateMarkupRuleDto,
    req?: any,
  ): Promise<ApiResponseDto<any>> {
    const existing = await this.prisma.markupRule.findUnique({ where: { id: ruleId } });
    if (!existing) throw new NotFoundException('Markup rule not found');

    const rule = await this.prisma.markupRule.update({
      where: { id: ruleId },
      data: { ...dto, updated_by: adminId },
    });

    if (req) {
      this.audit.logAdmin(AuditAction.MARKUP_RULE_UPDATE, AuditStatus.SUCCESS, adminId, req, {
        description: `Markup rule updated for ${existing.service_type}`,
        resource_type: 'MarkupRule',
        resource_id: ruleId,
        old_values: {
          percentage: existing.percentage,
          percentage_friendlies: existing.percentage_friendlies,
          is_active: existing.is_active,
          min_amount_to_apply_markup: existing.min_amount_to_apply_markup,
        },
        new_values: dto,
      });
    }

    this.markupService.invalidateCache();
    this.logger.log(`Markup rule for ${existing.service_type} updated by admin ${adminId}`);
    return new ApiResponseDto(true, 'Markup rule updated', rule);
  }

  async deleteRule(ruleId: string, adminId: string, req?: any): Promise<ApiResponseDto<any>> {
    const existing = await this.prisma.markupRule.findUnique({ where: { id: ruleId } });
    if (!existing) throw new NotFoundException('Markup rule not found');

    await this.prisma.markupRule.delete({ where: { id: ruleId } });

    if (req) {
      this.audit.logAdmin(AuditAction.MARKUP_RULE_DELETE, AuditStatus.SUCCESS, adminId, req, {
        description: `Markup rule deleted for ${existing.service_type}`,
        resource_type: 'MarkupRule',
        resource_id: ruleId,
        old_values: existing,
      });
    }

    this.markupService.invalidateCache();
    this.logger.log(`Markup rule for ${existing.service_type} deleted by admin ${adminId}`);
    return new ApiResponseDto(true, 'Markup rule deleted', { id: ruleId, service_type: existing.service_type });
  }

  async listRules(): Promise<ApiResponseDto<any>> {
    const rules = await this.prisma.markupRule.findMany({ orderBy: { service_type: 'asc' } });
    return new ApiResponseDto(true, 'Markup rules fetched', rules);
  }

  async seedDefaultRules(adminId: string, req?: any): Promise<ApiResponseDto<any>> {
    const allTypes = Object.values(CashbackServiceType);
    const existingRules = await this.prisma.markupRule.findMany({
      select: { service_type: true },
    });
    const existingTypes = new Set(existingRules.map((r) => r.service_type));

    const missing = allTypes.filter((t) => !existingTypes.has(t));
    if (missing.length === 0) {
      return new ApiResponseDto(true, 'All markup rules already exist', { created: 0 });
    }

    const created = await this.prisma.markupRule.createMany({
      data: missing.map((service_type) => ({
        service_type,
        percentage: 0,
        is_active: false,
        updated_by: adminId,
      })),
    });

    if (req) {
      this.audit.logAdmin(AuditAction.MARKUP_RULE_CREATE, AuditStatus.SUCCESS, adminId, req, {
        description: `Seeded ${created.count} default markup rules`,
        resource_type: 'MarkupRule',
        new_values: { seeded_services: missing },
      });
    }

    this.markupService.invalidateCache();
    const rules = await this.prisma.markupRule.findMany({ orderBy: { service_type: 'asc' } });
    this.logger.log(`Seeded ${created.count} default markup rules`);
    return new ApiResponseDto(true, `Created ${created.count} markup rules`, rules);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditActorType, AuditSeverity, AuditStatus, Prisma } from '@prisma/client';
import * as geoip from 'geoip-lite';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ACTION_CATEGORY_MAP,
  ACTION_SEVERITY_MAP,
  ACTION_DESCRIPTION_MAP,
} from './audit-log.constants';
import {
  CreateAuditLogInput,
  RequestInfo,
  AuditLogQueryFilters,
  AuditLogPaginatedResponse,
} from './interfaces/audit-log.interface';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────
  // CORE METHOD
  // ──────────────────────────────────────────────────────────

  /**
   * Create an audit log entry. Fire-and-forget by default — failures
   * are logged but never bubble up to callers.
   */
  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      const category = input.category ?? ACTION_CATEGORY_MAP[input.action];
      const severity = input.severity ?? ACTION_SEVERITY_MAP[input.action] ?? AuditSeverity.LOW;
      const description = input.description ?? ACTION_DESCRIPTION_MAP[input.action];

      const geo = this.resolveGeo(input);

      await this.prisma.auditLog.create({
        data: {
          user_id: input.user_id,
          actor_type: input.actor_type ?? AuditActorType.USER,
          actor_name: input.actor_name,
          session_id: input.session_id,
          action: input.action,
          category,
          status: input.status,
          severity,
          resource_type: input.resource_type,
          resource_id: input.resource_id,
          resource_name: input.resource_name,
          ip_address: input.ip_address,
          user_agent: input.user_agent,
          device_id: input.device_id,
          device_model: input.device_model,
          platform: input.platform,
          geo_location: geo.geo_location ?? input.geo_location,
          latitude: geo.latitude ?? input.latitude,
          longitude: geo.longitude ?? input.longitude,
          http_method: input.http_method,
          endpoint: input.endpoint,
          request_id: input.request_id,
          description,
          old_values: input.old_values as any,
          new_values: input.new_values as any,
          metadata: input.metadata as any,
          error_message: input.error_message,
          amount: input.amount,
          currency: input.currency,
          balance_before: input.balance_before,
          balance_after: input.balance_after,
          transaction_ref: input.transaction_ref,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log [${input.action}]: ${error.message}`,
        error.stack,
      );
    }
  }

  // ──────────────────────────────────────────────────────────
  // CONVENIENCE METHODS
  // ──────────────────────────────────────────────────────────

  /**
   * Log an authentication-related action (login, logout, password reset, etc.)
   */
  async logAuth(
    action: AuditAction,
    status: AuditStatus,
    req: any,
    extra?: Partial<CreateAuditLogInput>,
  ): Promise<void> {
    const reqInfo = this.extractRequestInfo(req);
    const userId = req?.user?.id ?? extra?.user_id;

    await this.log({
      user_id: userId,
      action,
      status,
      actor_type: AuditActorType.USER,
      ...reqInfo,
      ...extra,
    });
  }

  /**
   * Log a financial transaction (transfer, airtime, data, cable, etc.)
   */
  async logTransaction(
    action: AuditAction,
    status: AuditStatus,
    req: any,
    financials: {
      amount?: number;
      currency?: string;
      balance_before?: number;
      balance_after?: number;
      transaction_ref?: string;
    },
    extra?: Partial<CreateAuditLogInput>,
  ): Promise<void> {
    const reqInfo = this.extractRequestInfo(req);
    const userId = req?.user?.id ?? extra?.user_id;

    await this.log({
      user_id: userId,
      action,
      status,
      actor_type: AuditActorType.USER,
      ...reqInfo,
      ...financials,
      ...extra,
    });
  }

  /**
   * Log a user management action (profile update, PIN change, KYC, etc.)
   */
  async logUserAction(
    action: AuditAction,
    status: AuditStatus,
    req: any,
    extra?: Partial<CreateAuditLogInput>,
  ): Promise<void> {
    const reqInfo = this.extractRequestInfo(req);
    const userId = req?.user?.id ?? extra?.user_id;

    await this.log({
      user_id: userId,
      action,
      status,
      actor_type: AuditActorType.USER,
      ...reqInfo,
      ...extra,
    });
  }

  /**
   * Log an admin operation.
   */
  async logAdmin(
    action: AuditAction,
    status: AuditStatus,
    adminId: string,
    req: any,
    extra?: Partial<CreateAuditLogInput>,
  ): Promise<void> {
    const reqInfo = this.extractRequestInfo(req);

    await this.log({
      user_id: adminId,
      action,
      status,
      actor_type: AuditActorType.ADMIN,
      ...reqInfo,
      ...extra,
    });
  }

  /**
   * Log a system-level event (cron job, internal error, etc.)
   */
  async logSystem(
    action: AuditAction,
    status: AuditStatus,
    extra?: Partial<CreateAuditLogInput>,
  ): Promise<void> {
    await this.log({
      action,
      status,
      actor_type: AuditActorType.SYSTEM,
      ...extra,
    });
  }

  /**
   * Log a webhook event (Paystack, Flutterwave, VTpass).
   */
  async logWebhook(
    action: AuditAction,
    status: AuditStatus,
    req: any,
    extra?: Partial<CreateAuditLogInput>,
  ): Promise<void> {
    const reqInfo = this.extractRequestInfo(req);

    await this.log({
      action,
      status,
      actor_type: AuditActorType.WEBHOOK,
      ...reqInfo,
      ...extra,
    });
  }

  // ──────────────────────────────────────────────────────────
  // QUERY METHODS (Admin)
  // ──────────────────────────────────────────────────────────

  /**
   * Query audit logs with filters and pagination.
   */
  async query(filters: AuditLogQueryFilters): Promise<AuditLogPaginatedResponse> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.action) where.action = filters.action;
    if (filters.category) where.category = filters.category;
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.actor_type) where.actor_type = filters.actor_type;
    if (filters.resource_type) where.resource_type = filters.resource_type;
    if (filters.resource_id) where.resource_id = filters.resource_id;
    if (filters.ip_address) where.ip_address = filters.ip_address;
    if (filters.is_flagged !== undefined) where.is_flagged = filters.is_flagged;

    if (filters.date_from || filters.date_to) {
      where.created_at = {};
      if (filters.date_from) where.created_at.gte = new Date(filters.date_from);
      if (filters.date_to) where.created_at.lte = new Date(filters.date_to);
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { actor_name: { contains: filters.search, mode: 'insensitive' } },
        { resource_name: { contains: filters.search, mode: 'insensitive' } },
        { error_message: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone_number: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const total_pages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages,
        has_next: page < total_pages,
        has_previous: page > 1,
      },
    };
  }

  /**
   * Get a single audit log entry by ID.
   */
  async findById(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
      },
    });
  }

  /**
   * Get all audit logs for a specific user.
   */
  async getUserLogs(userId: string, filters: AuditLogQueryFilters): Promise<AuditLogPaginatedResponse> {
    return this.query({ ...filters, user_id: userId });
  }

  /**
   * Get all flagged audit logs pending review.
   */
  async getFlaggedLogs(filters: AuditLogQueryFilters): Promise<AuditLogPaginatedResponse> {
    return this.query({ ...filters, is_flagged: true });
  }

  /**
   * Flag an audit log entry for compliance review.
   */
  async flag(logId: string, reason: string, flaggedBy: string) {
    try {
      return await this.prisma.auditLog.update({
        where: { id: logId },
        data: {
          is_flagged: true,
          flagged_reason: reason,
          reviewed_by: flaggedBy,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to flag audit log ${logId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Review and optionally resolve a flagged audit log entry.
   */
  async review(logId: string, reviewedBy: string, notes: string, resolve: boolean) {
    try {
      return await this.prisma.auditLog.update({
        where: { id: logId },
        data: {
          reviewed_by: reviewedBy,
          reviewed_at: new Date(),
          review_notes: notes,
          ...(resolve && { is_flagged: false }),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to review audit log ${logId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get summary statistics for a date range (dashboard analytics).
   */
  async getStats(dateFrom?: Date, dateTo?: Date) {
    const dateFilter: Prisma.AuditLogWhereInput = {};
    if (dateFrom || dateTo) {
      dateFilter.created_at = {};
      if (dateFrom) dateFilter.created_at.gte = dateFrom;
      if (dateTo) dateFilter.created_at.lte = dateTo;
    }

    const [
      totalLogs,
      byCategory,
      byStatus,
      bySeverity,
      flaggedCount,
      recentHighSeverity,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where: dateFilter }),
      this.prisma.auditLog.groupBy({
        by: ['category'],
        _count: true,
        where: dateFilter,
        orderBy: { _count: { category: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['status'],
        _count: true,
        where: dateFilter,
      }),
      this.prisma.auditLog.groupBy({
        by: ['severity'],
        _count: true,
        where: dateFilter,
      }),
      this.prisma.auditLog.count({
        where: { ...dateFilter, is_flagged: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          ...dateFilter,
          severity: { in: ['HIGH', 'CRITICAL'] },
        },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          severity: true,
          description: true,
          user_id: true,
          ip_address: true,
          created_at: true,
        },
      }),
    ]);

    return {
      total_logs: totalLogs,
      by_category: byCategory.map((g) => ({ category: g.category, count: g._count })),
      by_status: byStatus.map((g) => ({ status: g.status, count: g._count })),
      by_severity: bySeverity.map((g) => ({ severity: g.severity, count: g._count })),
      flagged_count: flaggedCount,
      recent_high_severity: recentHighSeverity,
    };
  }

  // ──────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────

  /**
   * Extract common request metadata from an Express/NestJS Request object.
   * Also pulls latitude/longitude from deviceMetadata (set by global middleware).
   */
  private extractRequestInfo(req: any): RequestInfo {
    if (!req) return {};

    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
    const dm = req.deviceMetadata;

    return {
      ip_address: ip,
      user_agent: req.headers?.['user-agent'],
      http_method: req.method,
      endpoint: req.originalUrl ?? req.url,
      request_id: req.headers?.['x-request-id'],
      latitude: dm?.latitude,
      longitude: dm?.longitude,
    };
  }

  /**
   * Resolve geo-location data.
   *   - Always runs an IP lookup to get a human-readable location (e.g. "Ile-Ife, OS, NG").
   *   - If frontend sent GPS lat/lng, those are used (more precise than IP).
   *   - If no GPS, lat/lng also comes from the IP lookup.
   */
  private resolveGeo(input: CreateAuditLogInput): {
    latitude?: number;
    longitude?: number;
    geo_location?: string;
  } {
    const ipGeo = this.lookupIp(input.ip_address);

    const hasGps = input.latitude != null && input.longitude != null;

    return {
      latitude: hasGps ? input.latitude : ipGeo?.lat,
      longitude: hasGps ? input.longitude : ipGeo?.lng,
      geo_location: input.geo_location ?? ipGeo?.label,
    };
  }

  private lookupIp(ip?: string): { lat: number; lng: number; label?: string } | null {
    if (!ip) return null;
    try {
      const lookup = geoip.lookup(ip);
      if (!lookup) return null;

      const parts = [lookup.city, lookup.region, lookup.country].filter(Boolean);
      return {
        lat: lookup.ll?.[0],
        lng: lookup.ll?.[1],
        label: parts.length > 0 ? parts.join(', ') : undefined,
      };
    } catch {
      return null;
    }
  }
}

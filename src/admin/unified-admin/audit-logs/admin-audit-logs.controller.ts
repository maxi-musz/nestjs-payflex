import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role, Prisma } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../common/audit-log/audit-log.service';
import {
  QueryAuditLogDto,
  FlagAuditLogDto,
  ReviewAuditLogDto,
} from '../../../common/audit-log/dto/query-audit-log.dto';
import { AuditAction, AuditStatus } from '@prisma/client';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/audit-logs')
export class AdminAuditLogsController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  // ──────────────────────────────────────────────────────────
  // LIST — Analytics + paginated logs (single endpoint)
  // ──────────────────────────────────────────────────────────

  @Get()
  async listAuditLogs(@Query() query: QueryAuditLogDto, @Req() req: any) {
    this.assertAdmin(req.user);

    const filters = {
      ...query,
      date_from: query.date_from ? new Date(query.date_from) : undefined,
      date_to: query.date_to ? new Date(query.date_to) : undefined,
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const prevWeekStart = new Date(weekAgo);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const monthAgo = new Date(todayStart);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      listResult,
      totalAll,
      byCategory,
      byStatus,
      bySeverity,
      byActorType,
      flaggedCount,
      unreviewedFlagged,
      todayCount,
      yesterdayCount,
      weekCount,
      prevWeekCount,
      monthCount,
      failureCount,
      failuresToday,
      highSeverityCount,
      highSeverityToday,
      blockedCount,
      flaggedVolume,
      recentHighSeverity,
      topFailedActions,
      topFailedUsers,
      suspiciousIps,
    ] = await Promise.all([
      this.auditLogService.query(filters),
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({ by: ['category'], _count: true, orderBy: { _count: { category: 'desc' } } }),
      this.prisma.auditLog.groupBy({ by: ['status'], _count: true }),
      this.prisma.auditLog.groupBy({ by: ['severity'], _count: true }),
      this.prisma.auditLog.groupBy({ by: ['actor_type'], _count: true }),
      this.prisma.auditLog.count({ where: { is_flagged: true } }),
      this.prisma.auditLog.count({ where: { is_flagged: true, reviewed_at: null } }),
      this.prisma.auditLog.count({ where: { created_at: { gte: todayStart } } }),
      this.prisma.auditLog.count({ where: { created_at: { gte: yesterdayStart, lt: todayStart } } }),
      this.prisma.auditLog.count({ where: { created_at: { gte: weekAgo } } }),
      this.prisma.auditLog.count({ where: { created_at: { gte: prevWeekStart, lt: weekAgo } } }),
      this.prisma.auditLog.count({ where: { created_at: { gte: monthAgo } } }),
      this.prisma.auditLog.count({ where: { status: 'FAILURE' } }),
      this.prisma.auditLog.count({ where: { status: 'FAILURE', created_at: { gte: todayStart } } }),
      this.prisma.auditLog.count({ where: { severity: { in: ['HIGH', 'CRITICAL'] } } }),
      this.prisma.auditLog.count({ where: { severity: { in: ['HIGH', 'CRITICAL'] }, created_at: { gte: todayStart } } }),
      this.prisma.auditLog.count({ where: { status: 'BLOCKED' } }),
      this.prisma.auditLog.aggregate({
        _sum: { amount: true },
        _count: { amount: true },
        where: { is_flagged: true, amount: { not: null } },
      }),
      this.prisma.auditLog.findMany({
        where: { severity: { in: ['HIGH', 'CRITICAL'] } },
        orderBy: { created_at: 'desc' },
        take: 15,
        select: {
          id: true,
          action: true,
          category: true,
          severity: true,
          status: true,
          description: true,
          user_id: true,
          actor_type: true,
          ip_address: true,
          geo_location: true,
          amount: true,
          is_flagged: true,
          created_at: true,
          user: {
            select: { id: true, first_name: true, last_name: true, email: true, phone_number: true },
          },
        },
      }),
      // Top failed actions — which actions fail most often
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: { status: 'FAILURE' },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      // Top users by failure count — potential brute-force / fraud
      this.prisma.auditLog.groupBy({
        by: ['user_id'],
        _count: true,
        where: { status: 'FAILURE', user_id: { not: null } },
        orderBy: { _count: { user_id: 'desc' } },
        take: 10,
      }),
      // IPs appearing across multiple user accounts — fraud ring detection
      this.prisma.$queryRaw<{ ip_address: string; user_count: number; log_count: number }[]>`
        SELECT ip_address,
               COUNT(DISTINCT user_id)::int AS user_count,
               COUNT(*)::int AS log_count
        FROM audit_logs
        WHERE ip_address IS NOT NULL
          AND user_id IS NOT NULL
          AND created_at >= ${monthAgo}
        GROUP BY ip_address
        HAVING COUNT(DISTINCT user_id) > 1
        ORDER BY COUNT(DISTINCT user_id) DESC
        LIMIT 10
      `,
    ]);

    // Resolve user details for top failed users
    const failedUserIds = topFailedUsers.map((u) => u.user_id!).filter(Boolean);
    const failedUsersInfo = failedUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: failedUserIds } },
          select: { id: true, first_name: true, last_name: true, email: true, phone_number: true, account_status: true },
        })
      : [];
    const failedUserMap = new Map(failedUsersInfo.map((u) => [u.id, u]));

    const toMap = (items: any[], key: string) => {
      const result: Record<string, number> = {};
      for (const item of items) result[item[key]] = item._count;
      return result;
    };

    const weekOverWeekPercent =
      prevWeekCount > 0
        ? Math.round(((weekCount - prevWeekCount) / prevWeekCount) * 100)
        : weekCount > 0 ? 100 : 0;

    return new ApiResponseDto(true, 'Audit logs fetched', {
      analytics: {
        overview: {
          total_logs: totalAll,
          today: todayCount,
          yesterday: yesterdayCount,
          this_week: weekCount,
          this_month: monthCount,
          week_over_week_percent: weekOverWeekPercent,
          flagged: flaggedCount,
          unreviewed_flagged: unreviewedFlagged,
          failures: failureCount,
          failures_today: failuresToday,
          high_severity: highSeverityCount,
          high_severity_today: highSeverityToday,
          blocked: blockedCount,
        },
        financial: {
          flagged_transaction_count: flaggedVolume._count.amount,
          flagged_transaction_volume: flaggedVolume._sum.amount ?? 0,
        },
        by_category: toMap(byCategory, 'category'),
        by_status: toMap(byStatus, 'status'),
        by_severity: toMap(bySeverity, 'severity'),
        by_actor_type: toMap(byActorType, 'actor_type'),
        recent_high_severity: recentHighSeverity,
        fraud_indicators: {
          top_failed_actions: topFailedActions.map((a) => ({
            action: a.action,
            failure_count: a._count,
          })),
          top_failed_users: topFailedUsers.map((u) => ({
            user: failedUserMap.get(u.user_id!) ?? { id: u.user_id },
            failure_count: u._count,
          })),
          suspicious_ips: suspiciousIps.map((ip) => ({
            ip_address: ip.ip_address,
            distinct_users: ip.user_count,
            total_actions: ip.log_count,
          })),
        },
      },
      logs: listResult.data,
      meta: listResult.meta,
    });
  }

  // ──────────────────────────────────────────────────────────
  // TIMELINE — Trend data for charts (failure spikes, severity trends)
  // ──────────────────────────────────────────────────────────

  @Get('timeline')
  async getTimeline(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Req() req?: any,
  ) {
    this.assertAdmin(req.user);

    const from = dateFrom ? new Date(dateFrom) : this.daysAgo(30);
    const to = dateTo ? new Date(dateTo) : new Date();

    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const groupByHour = diffDays <= 2;
    const truncFn = groupByHour
      ? Prisma.sql`DATE_TRUNC('hour', created_at)`
      : Prisma.sql`DATE_TRUNC('day', created_at)`;

    const raw: any[] = await this.prisma.$queryRaw`
      SELECT
        ${truncFn} AS bucket,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END)::int AS success_count,
        COUNT(CASE WHEN status = 'FAILURE' THEN 1 END)::int AS failure_count,
        COUNT(CASE WHEN status = 'BLOCKED' THEN 1 END)::int AS blocked_count,
        COUNT(CASE WHEN severity IN ('HIGH', 'CRITICAL') THEN 1 END)::int AS high_severity_count,
        COUNT(CASE WHEN is_flagged = true THEN 1 END)::int AS flagged_count
      FROM audit_logs
      WHERE created_at >= ${from}
        AND created_at <= ${to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    return new ApiResponseDto(true, 'Audit log timeline fetched', {
      period: groupByHour ? 'hourly' : 'daily',
      date_from: from.toISOString(),
      date_to: to.toISOString(),
      data: raw.map((r) => ({
        timestamp: r.bucket,
        total: r.total,
        success_count: r.success_count,
        failure_count: r.failure_count,
        blocked_count: r.blocked_count,
        high_severity_count: r.high_severity_count,
        flagged_count: r.flagged_count,
      })),
    });
  }

  // ──────────────────────────────────────────────────────────
  // IP INVESTIGATION — All activity from a specific IP
  // ──────────────────────────────────────────────────────────

  @Get('ip/:ipAddress')
  async getIpActivity(
    @Param('ipAddress') ipAddress: string,
    @Query() query: QueryAuditLogDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = { ip_address: ipAddress };

    const [logs, total, distinctUsers, actionBreakdown, firstSeen, lastSeen] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, first_name: true, last_name: true, email: true, phone_number: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['user_id'],
        _count: true,
        where: { ip_address: ipAddress, user_id: { not: null } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where,
        orderBy: { _count: { action: 'desc' } },
        take: 15,
      }),
      this.prisma.auditLog.findFirst({ where, orderBy: { created_at: 'asc' }, select: { created_at: true, geo_location: true } }),
      this.prisma.auditLog.findFirst({ where, orderBy: { created_at: 'desc' }, select: { created_at: true, geo_location: true } }),
    ]);

    // Resolve user details for distinct users
    const userIds = distinctUsers.map((u) => u.user_id!).filter(Boolean);
    const usersInfo = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, first_name: true, last_name: true, email: true, phone_number: true, smipay_tag: true, account_status: true },
        })
      : [];
    const userMap = new Map(usersInfo.map((u) => [u.id, u]));

    return new ApiResponseDto(true, 'IP activity fetched', {
      ip_address: ipAddress,
      geo_location: lastSeen?.geo_location ?? firstSeen?.geo_location ?? null,
      summary: {
        total_actions: total,
        distinct_users: distinctUsers.length,
        first_seen: firstSeen?.created_at ?? null,
        last_seen: lastSeen?.created_at ?? null,
        is_multi_account: distinctUsers.length > 1,
      },
      associated_users: distinctUsers.map((u) => ({
        user: userMap.get(u.user_id!) ?? { id: u.user_id },
        action_count: u._count,
      })),
      top_actions: actionBreakdown.map((a) => ({ action: a.action, count: a._count })),
      logs,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // SESSION TRACE — All actions within a single session
  // ──────────────────────────────────────────────────────────

  @Get('session/:sessionId')
  async getSessionTrace(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);

    const logs = await this.prisma.auditLog.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    if (logs.length === 0) throw new NotFoundException('Session not found');

    const first = logs[0];
    const last = logs[logs.length - 1];
    const durationSeconds = Math.floor(
      (last.created_at.getTime() - first.created_at.getTime()) / 1000,
    );

    const failures = logs.filter((l) => l.status === 'FAILURE');
    const uniqueEndpoints = [...new Set(logs.map((l) => l.endpoint).filter(Boolean))];
    const totalAmount = logs.reduce((sum, l) => sum + (l.amount ?? 0), 0);

    return new ApiResponseDto(true, 'Session trace fetched', {
      session_id: sessionId,
      user: first.user,
      summary: {
        total_actions: logs.length,
        duration_seconds: durationSeconds,
        started_at: first.created_at,
        ended_at: last.created_at,
        ip_address: first.ip_address,
        geo_location: first.geo_location,
        platform: first.platform,
        device_model: first.device_model,
        failure_count: failures.length,
        unique_endpoints: uniqueEndpoints.length,
        total_financial_amount: totalAmount,
      },
      logs,
    });
  }

  // ──────────────────────────────────────────────────────────
  // DEVICE INVESTIGATION — All activity from a specific device
  // ──────────────────────────────────────────────────────────

  @Get('device/:deviceId')
  async getDeviceActivity(
    @Param('deviceId') deviceId: string,
    @Query() query: QueryAuditLogDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = { device_id: deviceId };

    const [logs, total, distinctUsers, distinctIps] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['user_id'],
        _count: true,
        where: { device_id: deviceId, user_id: { not: null } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['ip_address'],
        _count: true,
        where: { device_id: deviceId, ip_address: { not: null } },
      }),
    ]);

    const userIds = distinctUsers.map((u) => u.user_id!).filter(Boolean);
    const usersInfo = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, first_name: true, last_name: true, email: true, account_status: true },
        })
      : [];
    const userMap = new Map(usersInfo.map((u) => [u.id, u]));

    const firstLog = logs.length ? logs[logs.length - 1] : null;

    return new ApiResponseDto(true, 'Device activity fetched', {
      device_id: deviceId,
      device_model: firstLog?.device_model ?? null,
      platform: firstLog?.platform ?? null,
      summary: {
        total_actions: total,
        distinct_users: distinctUsers.length,
        distinct_ips: distinctIps.length,
        is_multi_account: distinctUsers.length > 1,
      },
      associated_users: distinctUsers.map((u) => ({
        user: userMap.get(u.user_id!) ?? { id: u.user_id },
        action_count: u._count,
      })),
      ip_addresses: distinctIps.map((ip) => ({
        ip_address: ip.ip_address,
        action_count: ip._count,
      })),
      logs,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // FLAGGED — Convenience endpoint
  // ──────────────────────────────────────────────────────────

  @Get('flagged')
  async getFlaggedLogs(@Query() query: QueryAuditLogDto, @Req() req: any) {
    this.assertAdmin(req.user);

    const result = await this.auditLogService.getFlaggedLogs({
      ...query,
      date_from: query.date_from ? new Date(query.date_from) : undefined,
      date_to: query.date_to ? new Date(query.date_to) : undefined,
    });

    return new ApiResponseDto(true, 'Flagged logs fetched', result);
  }

  // ──────────────────────────────────────────────────────────
  // USER LOGS — All audit logs for a specific user
  // ──────────────────────────────────────────────────────────

  @Get('user/:userId')
  async getUserLogs(
    @Param('userId') userId: string,
    @Query() query: QueryAuditLogDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, first_name: true, last_name: true, email: true,
        phone_number: true, smipay_tag: true, account_status: true, role: true,
        profile_image: { select: { secure_url: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const [result, userActionBreakdown, userSeverityBreakdown, userFailures, userDistinctIps] = await Promise.all([
      this.auditLogService.getUserLogs(userId, {
        ...query,
        date_from: query.date_from ? new Date(query.date_from) : undefined,
        date_to: query.date_to ? new Date(query.date_to) : undefined,
      }),
      this.prisma.auditLog.groupBy({ by: ['action'], _count: true, where: { user_id: userId }, orderBy: { _count: { action: 'desc' } }, take: 15 }),
      this.prisma.auditLog.groupBy({ by: ['severity'], _count: true, where: { user_id: userId } }),
      this.prisma.auditLog.count({ where: { user_id: userId, status: 'FAILURE' } }),
      this.prisma.auditLog.groupBy({ by: ['ip_address'], _count: true, where: { user_id: userId, ip_address: { not: null } }, orderBy: { _count: { ip_address: 'desc' } }, take: 10 }),
    ]);

    return new ApiResponseDto(true, 'User audit logs fetched', {
      user,
      user_summary: {
        total_actions: result.meta.total,
        failure_count: userFailures,
        top_actions: userActionBreakdown.map((a) => ({ action: a.action, count: a._count })),
        by_severity: Object.fromEntries(userSeverityBreakdown.map((s) => [s.severity, s._count])),
        ip_addresses: userDistinctIps.map((ip) => ({ ip_address: ip.ip_address, count: ip._count })),
      },
      ...result,
    });
  }

  // ──────────────────────────────────────────────────────────
  // DETAIL — Single audit log entry
  // ──────────────────────────────────────────────────────────

  @Get(':id')
  async getLogById(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);

    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            smipay_tag: true,
            role: true,
            account_status: true,
            profile_image: { select: { secure_url: true } },
          },
        },
      },
    });

    if (!log) throw new NotFoundException('Audit log not found');

    let reviewed_by_admin: Record<string, any> | null = null;
    if (log.reviewed_by) {
      reviewed_by_admin = await this.prisma.user.findUnique({
        where: { id: log.reviewed_by },
        select: { id: true, first_name: true, last_name: true, email: true },
      });
    }

    // Nearby actions in the same session (context)
    let session_context: any[] = [];
    if (log.session_id) {
      session_context = await this.prisma.auditLog.findMany({
        where: {
          session_id: log.session_id,
          id: { not: log.id },
          created_at: {
            gte: new Date(log.created_at.getTime() - 5 * 60 * 1000),
            lte: new Date(log.created_at.getTime() + 5 * 60 * 1000),
          },
        },
        orderBy: { created_at: 'asc' },
        take: 20,
        select: {
          id: true,
          action: true,
          status: true,
          severity: true,
          description: true,
          created_at: true,
        },
      });
    }

    return new ApiResponseDto(true, 'Audit log fetched', {
      ...log,
      reviewed_by_admin,
      session_context,
    });
  }

  // ──────────────────────────────────────────────────────────
  // FLAG
  // ──────────────────────────────────────────────────────────

  @Post(':id/flag')
  @HttpCode(HttpStatus.OK)
  async flagLog(
    @Param('id') id: string,
    @Body() body: FlagAuditLogDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);

    const result = await this.auditLogService.flag(id, body.reason, req.user.sub);

    this.auditLogService.logAdmin(
      AuditAction.AUDIT_LOG_FLAG,
      AuditStatus.SUCCESS,
      req.user.sub,
      req,
      {
        resource_type: 'AuditLog',
        resource_id: id,
        description: `Flagged audit log: ${body.reason}`,
      },
    );

    return new ApiResponseDto(true, 'Audit log flagged', result);
  }

  // ──────────────────────────────────────────────────────────
  // REVIEW
  // ──────────────────────────────────────────────────────────

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async reviewLog(
    @Param('id') id: string,
    @Body() body: ReviewAuditLogDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);

    const result = await this.auditLogService.review(
      id,
      req.user.sub,
      body.review_notes,
      body.resolve,
    );

    this.auditLogService.logAdmin(
      AuditAction.AUDIT_LOG_REVIEW,
      AuditStatus.SUCCESS,
      req.user.sub,
      req,
      {
        resource_type: 'AuditLog',
        resource_id: id,
        description: `Reviewed audit log — ${body.resolve ? 'resolved' : 'noted'}`,
      },
    );

    return new ApiResponseDto(true, body.resolve ? 'Audit log resolved' : 'Review noted', result);
  }

  // ──────────────────────────────────────────────────────────

  private daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}

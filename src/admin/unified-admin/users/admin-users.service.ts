import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../common/audit-log/audit-log.service';
import { StatsService } from '../../../common/stats/stats.service';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import {
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  UpdateUserTierDto,
} from './dto/update-user-status.dto';
import { AuditAction, AuditStatus, Prisma } from '@prisma/client';

const USER_LIST_SELECT = {
  id: true,
  first_name: true,
  last_name: true,
  middle_name: true,
  email: true,
  phone_number: true,
  smipay_tag: true,
  role: true,
  gender: true,
  date_of_birth: true,
  account_status: true,
  is_email_verified: true,
  is_phone_verified: true,
  createdAt: true,
  updatedAt: true,
  tier: { select: { id: true, tier: true, name: true } },
  profile_image: { select: { secure_url: true } },
  kyc_verification: { select: { status: true, is_verified: true, bvn_verified: true, id_type: true } },
  auditLogs: {
    select: {
      action: true,
      description: true,
      status: true,
      created_at: true,
      ip_address: true,
      platform: true,
    },
    orderBy: { created_at: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.UserSelect;

const USER_DETAIL_SELECT = {
  ...USER_LIST_SELECT,
  address: true,
  wallet: { select: { id: true, current_balance: true, all_time_fuunding: true, all_time_withdrawn: true, isActive: true } },
  kyc_verification: true,
  referral_code: true,
  is_friendly: true,
  agree_to_terms: true,
  _count: { select: { cards: true, supportTickets: true, auditLogs: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly stats: StatsService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // LIST — Paginated, filterable, searchable
  // ──────────────────────────────────────────────────────────

  async listUsers(query: QueryUsersDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { first_name: { contains: term, mode: 'insensitive' } },
        { last_name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone_number: { contains: term } },
        { smipay_tag: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.role) where.role = query.role;
    if (query.account_status) where.account_status = query.account_status;

    if (query.tier) {
      where.tier = { tier: query.tier };
    }

    if (query.kyc_status) {
      if (query.kyc_status === 'verified') {
        where.kyc_verification = { is_verified: true };
      } else if (query.kyc_status === 'pending') {
        where.kyc_verification = { status: 'pending' };
      } else if (query.kyc_status === 'rejected') {
        where.kyc_verification = { status: 'rejected' };
      } else if (query.kyc_status === 'none') {
        where.kyc_verification = null;
      }
    }

    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) where.createdAt.gte = new Date(query.date_from);
      if (query.date_to) where.createdAt.lte = new Date(query.date_to);
    }

    const sortableFields = ['createdAt', 'first_name', 'last_name', 'email', 'phone_number'];
    const sortBy = sortableFields.includes(query.sort_by || '') ? query.sort_by! : 'createdAt';
    const sortOrder = query.sort_order === 'asc' ? 'asc' : 'desc';

    // Run user list + count + all analytics in one parallel batch
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(todayStart);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const prevMonthStart = new Date(monthAgo);
    prevMonthStart.setDate(prevMonthStart.getDate() - 30);

    const [
      rawUsers,
      total,
      totalUsers,
      activeUsers,
      suspendedUsers,
      byRole,
      byTier,
      kycVerified,
      kycPending,
      kycRejected,
      kycNone,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      newUsersPrevMonth,
      recentSignups,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_LIST_SELECT,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { account_status: 'active' } }),
      this.prisma.user.count({ where: { account_status: 'suspended' } }),
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.user.groupBy({
        by: ['tier_id'],
        _count: true,
        where: { tier_id: { not: null } },
      }),
      this.prisma.user.count({ where: { kyc_verification: { is_verified: true } } }),
      this.prisma.user.count({ where: { kyc_verification: { status: 'pending' } } }),
      this.prisma.user.count({ where: { kyc_verification: { status: 'rejected' } } }),
      this.prisma.user.count({ where: { kyc_verification: null } }),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: prevMonthStart, lt: monthAgo } } }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { id: true, first_name: true, last_name: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Resolve tier names
    const tierIds = byTier.map((t) => t.tier_id!).filter(Boolean);
    const tiers = tierIds.length
      ? await this.prisma.tier.findMany({
          where: { id: { in: tierIds } },
          select: { id: true, tier: true, name: true },
        })
      : [];
    const tierMap = new Map(tiers.map((t) => [t.id, t]));

    const growthPercent =
      newUsersPrevMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersPrevMonth) / newUsersPrevMonth) * 100)
        : newUsersThisMonth > 0
          ? 100
          : 0;

    const roleBreakdown: Record<string, number> = {};
    for (const r of byRole) {
      if (r.role) roleBreakdown[r.role] = r._count;
    }

    const tierBreakdown = byTier.map((t) => {
      const info = tierMap.get(t.tier_id!);
      return { tier: info?.tier ?? 'UNKNOWN', name: info?.name ?? 'Unknown', count: t._count };
    });

    // Map users with last_activity
    const users = rawUsers.map(({ auditLogs, ...user }) => ({
      ...user,
      last_activity: auditLogs[0]
        ? {
            action: auditLogs[0].action,
            description: auditLogs[0].description,
            status: auditLogs[0].status,
            timestamp: auditLogs[0].created_at,
            ip_address: auditLogs[0].ip_address,
            platform: auditLogs[0].platform,
          }
        : null,
    }));

    return new ApiResponseDto(true, 'Users fetched', {
      analytics: {
        overview: {
          total_users: totalUsers,
          active_users: activeUsers,
          suspended_users: suspendedUsers,
        },
        growth: {
          new_today: newUsersToday,
          new_this_week: newUsersThisWeek,
          new_this_month: newUsersThisMonth,
          new_prev_month: newUsersPrevMonth,
          month_over_month_percent: growthPercent,
        },
        kyc: {
          verified: kycVerified,
          pending: kycPending,
          rejected: kycRejected,
          none: kycNone,
        },
        by_role: roleBreakdown,
        by_tier: tierBreakdown,
        recent_signups: recentSignups,
      },
      users,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // DETAIL — Full user profile
  // ──────────────────────────────────────────────────────────

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_DETAIL_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');

    return new ApiResponseDto(true, 'User fetched', user);
  }

  // ──────────────────────────────────────────────────────────
  // UPDATE STATUS — Suspend / Activate
  // ──────────────────────────────────────────────────────────

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto, adminUser: any, req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, account_status: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const oldStatus = user.account_status ?? 'active';
    const newStatus = dto.account_status;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { account_status: newStatus },
      select: USER_LIST_SELECT,
    });

    this.stats.onUserStatusChanged(oldStatus, newStatus);

    this.auditLogService.logAdmin(
      newStatus === 'suspended' ? AuditAction.USER_SUSPEND : AuditAction.USER_ACTIVATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin changed user ${user.email} status from ${oldStatus} to ${newStatus}`,
        resource_type: 'User',
        resource_id: userId,
        old_values: { account_status: oldStatus },
        new_values: { account_status: newStatus },
        metadata: { reason: dto.reason },
      },
    );

    return new ApiResponseDto(true, `User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`, updated);
  }

  // ──────────────────────────────────────────────────────────
  // UPDATE ROLE
  // ──────────────────────────────────────────────────────────

  async updateUserRole(userId: string, dto: UpdateUserRoleDto, adminUser: any, req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const oldRole = user.role;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: USER_LIST_SELECT,
    });

    this.auditLogService.logAdmin(
      AuditAction.USER_ROLE_CHANGE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin changed user ${user.email} role from ${oldRole} to ${dto.role}`,
        resource_type: 'User',
        resource_id: userId,
        old_values: { role: oldRole },
        new_values: { role: dto.role },
        metadata: { reason: dto.reason },
      },
    );

    return new ApiResponseDto(true, 'User role updated successfully', updated);
  }

  // ──────────────────────────────────────────────────────────
  // UPDATE TIER
  // ──────────────────────────────────────────────────────────

  async updateUserTier(userId: string, dto: UpdateUserTierDto, adminUser: any, req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, tier_id: true, tier: { select: { tier: true } } },
    });

    if (!user) throw new NotFoundException('User not found');

    const newTier = await this.prisma.tier.findUnique({
      where: { id: dto.tier_id },
      select: { id: true, tier: true, name: true },
    });

    if (!newTier) throw new NotFoundException('Tier not found');

    const oldTierName = user.tier?.tier ?? null;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { tier_id: dto.tier_id },
      select: USER_LIST_SELECT,
    });

    this.stats.onUserTierChanged(oldTierName, newTier.tier);

    this.auditLogService.logAdmin(
      AuditAction.USER_TIER_CHANGE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin changed user ${user.email} tier from ${oldTierName} to ${newTier.tier}`,
        resource_type: 'User',
        resource_id: userId,
        old_values: { tier: oldTierName },
        new_values: { tier: newTier.tier },
        metadata: { reason: dto.reason },
      },
    );

    return new ApiResponseDto(true, 'User tier updated successfully', updated);
  }
}

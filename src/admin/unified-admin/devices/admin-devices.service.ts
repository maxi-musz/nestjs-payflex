import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditStatus, Platform } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';

const USER_SELECT = {
  id: true,
  email: true,
  first_name: true,
  last_name: true,
  role: true,
  account_status: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminDevicesService {
  private readonly logger = new Logger(AdminDevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  // ─── List Devices (paginated + filtered) ─────────────────────

  async listDevices(opts: {
    page: number;
    limit: number;
    platform?: string;
    status?: string;
    search?: string;
    os_name?: string;
    sort_by?: string;
    sort_order?: string;
  }) {
    const { page, limit, platform, status, search, os_name, sort_by, sort_order } = opts;
    const where: any = {};

    if (platform === 'ios' || platform === 'android') {
      where.platform = platform;
    }

    if (status === 'active') {
      where.is_active = true;
      where.is_restricted = false;
    } else if (status === 'restricted') {
      where.is_restricted = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    }

    if (os_name) {
      where.os_name = { contains: os_name, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { first_name: { contains: search, mode: 'insensitive' } } },
        { user: { last_name: { contains: search, mode: 'insensitive' } } },
        { device_id: { contains: search, mode: 'insensitive' } },
        { device_model: { contains: search, mode: 'insensitive' } },
        { device_name: { contains: search, mode: 'insensitive' } },
        { last_ip_address: { startsWith: search } },
      ];
    }

    const orderField = ['last_seen_at', 'first_seen_at', 'createdAt'].includes(sort_by ?? '')
      ? sort_by!
      : 'last_seen_at';
    const orderDir = sort_order === 'asc' ? 'asc' : 'desc';

    const [devices, total] = await this.prisma.$transaction([
      this.prisma.userDevice.findMany({
        where,
        include: { user: { select: USER_SELECT } },
        orderBy: { [orderField]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.userDevice.count({ where }),
    ]);

    return { devices, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Device Detail ───────────────────────────────────────────

  async getDevice(id: string) {
    const device = await this.prisma.userDevice.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            ...USER_SELECT,
            phone_number: true,
            deviceTokens: {
              where: { is_active: true },
              select: { id: true, token: true, platform: true, is_active: true, app_version: true, updatedAt: true },
              orderBy: { updatedAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  // ─── Stats ───────────────────────────────────────────────────

  async getStats() {
    const [total, active, restricted, inactive, ios, android] = await this.prisma.$transaction([
      this.prisma.userDevice.count(),
      this.prisma.userDevice.count({ where: { is_active: true, is_restricted: false } }),
      this.prisma.userDevice.count({ where: { is_restricted: true } }),
      this.prisma.userDevice.count({ where: { is_active: false, is_restricted: false } }),
      this.prisma.userDevice.count({ where: { platform: Platform.ios } }),
      this.prisma.userDevice.count({ where: { platform: Platform.android } }),
    ]);

    const uniqueGroups = await this.prisma.userDevice.groupBy({ by: ['user_id'] });
    const unique_users = uniqueGroups.length;

    const osBreakdown = await this.prisma.userDevice.groupBy({
      by: ['os_name'],
      _count: true,
      orderBy: { _count: { os_name: 'desc' } },
    });

    return {
      total, active, restricted, inactive, ios, android, unique_users,
      os_breakdown: osBreakdown.map((o) => ({ os: o.os_name ?? 'Unknown', count: o._count })),
    };
  }

  // ─── Devices for a user ──────────────────────────────────────

  async getUserDevices(userId: string) {
    return this.prisma.userDevice.findMany({
      where: { user_id: userId },
      orderBy: { last_seen_at: 'desc' },
    });
  }

  // ─── Suspend ─────────────────────────────────────────────────

  async suspendDevice(id: string, adminUser: any) {
    const device = await this.prisma.userDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');

    const updated = await this.prisma.userDevice.update({
      where: { id },
      data: {
        is_active: false,
        is_restricted: true,
        is_current_device: false,
        restricted_at: new Date(),
        restricted_by: adminUser.id,
      },
      include: { user: { select: USER_SELECT } },
    });

    this.auditLog.log({
      action: AuditAction.DEVICE_SUSPEND,
      status: AuditStatus.SUCCESS,
      user_id: adminUser.id,
      resource_type: 'UserDevice',
      resource_id: id,
      description: `Suspended device ${device.device_model ?? device.device_id} for user ${device.user_id}`,
    }).catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    return updated;
  }

  // ─── Reactivate ──────────────────────────────────────────────

  async reactivateDevice(id: string, adminUser: any) {
    const device = await this.prisma.userDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');

    const updated = await this.prisma.userDevice.update({
      where: { id },
      data: {
        is_active: true,
        is_restricted: false,
        restricted_at: null,
        restricted_by: null,
      },
      include: { user: { select: USER_SELECT } },
    });

    this.auditLog.log({
      action: AuditAction.DEVICE_REACTIVATE,
      status: AuditStatus.SUCCESS,
      user_id: adminUser.id,
      resource_type: 'UserDevice',
      resource_id: id,
      description: `Reactivated device ${device.device_model ?? device.device_id} for user ${device.user_id}`,
    }).catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    return updated;
  }

  // ─── Remove ──────────────────────────────────────────────────

  async removeDevice(id: string, adminUser: any) {
    const device = await this.prisma.userDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');

    await this.prisma.userDevice.delete({ where: { id } });

    this.auditLog.log({
      action: AuditAction.DEVICE_REMOVE,
      status: AuditStatus.SUCCESS,
      user_id: adminUser.id,
      resource_type: 'UserDevice',
      resource_id: id,
      description: `Removed device ${device.device_model ?? device.device_id} for user ${device.user_id}`,
    }).catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    return { deleted: true };
  }

  // ─── Bulk Suspend ────────────────────────────────────────────

  async bulkSuspend(deviceIds: string[], adminUser: any) {
    const result = await this.prisma.userDevice.updateMany({
      where: { id: { in: deviceIds } },
      data: {
        is_active: false,
        is_restricted: true,
        is_current_device: false,
        restricted_at: new Date(),
        restricted_by: adminUser.id,
      },
    });

    this.auditLog.log({
      action: AuditAction.DEVICE_SUSPEND,
      status: AuditStatus.SUCCESS,
      user_id: adminUser.id,
      resource_type: 'UserDevice',
      description: `Bulk suspended ${result.count} device(s)`,
    }).catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    return { count: result.count };
  }

  // ─── Bulk Reactivate ─────────────────────────────────────────

  async bulkReactivate(deviceIds: string[], adminUser: any) {
    const result = await this.prisma.userDevice.updateMany({
      where: { id: { in: deviceIds } },
      data: {
        is_active: true,
        is_restricted: false,
        restricted_at: null,
        restricted_by: null,
      },
    });

    this.auditLog.log({
      action: AuditAction.DEVICE_REACTIVATE,
      status: AuditStatus.SUCCESS,
      user_id: adminUser.id,
      resource_type: 'UserDevice',
      description: `Bulk reactivated ${result.count} device(s)`,
    }).catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    return { count: result.count };
  }
}

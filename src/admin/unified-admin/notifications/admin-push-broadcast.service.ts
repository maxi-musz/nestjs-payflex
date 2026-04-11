import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from 'src/prisma/prisma.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';
import { AuditStatus } from '@prisma/client';
import {
  CreatePushBroadcastDto,
  PushTargetFiltersDto,
  QueryPushBroadcastsDto,
} from './dto/create-push-broadcast.dto';

const BATCH_SIZE = 50;
const PER_USER_DELAY_MS = 100;

@Injectable()
export class AdminPushBroadcastService implements OnModuleInit {
  private readonly logger = new Logger(AdminPushBroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushNotificationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  onModuleInit() {
    cron.schedule('*/60 * * * * *', () => this.processScheduledBroadcasts());
    this.logger.log('Push broadcast scheduler initialized (every 60s)');
  }

  // ─── CRUD ────────────────────────────────────────────────────

  async createBroadcast(dto: CreatePushBroadcastDto, adminUser: any) {
    const isScheduled = !!dto.scheduled_for && new Date(dto.scheduled_for) > new Date();
    const status = isScheduled ? 'scheduled' : 'draft';

    const broadcast = await this.prisma.pushBroadcast.create({
      data: {
        title: dto.title,
        body: dto.body,
        message: dto.message || null,
        target_type: dto.target_type,
        target_filters: dto.target_filters ? (dto.target_filters as any) : undefined,
        target_user_ids: dto.target_user_ids ? (dto.target_user_ids as any) : undefined,
        status,
        scheduled_for: dto.scheduled_for ? new Date(dto.scheduled_for) : null,
        created_by: adminUser.sub,
      },
    });

    this.auditLogService
      .log({
        action: 'PUSH_BROADCAST_CREATE',
        status: AuditStatus.SUCCESS,
        user_id: adminUser.sub,
        resource_type: 'PushBroadcast',
        resource_id: broadcast.id,
        description: `Push broadcast "${dto.title}" created (${status})`,
        metadata: { target_type: dto.target_type, scheduled: isScheduled },
      })
      .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    if (!isScheduled) {
      this.executeBroadcast(broadcast.id).catch((e) =>
        this.logger.error(`Broadcast ${broadcast.id} execution failed: ${e.message}`),
      );
    }

    return broadcast;
  }

  async listBroadcasts(query: QueryPushBroadcastsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;

    const [broadcasts, total] = await Promise.all([
      this.prisma.pushBroadcast.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pushBroadcast.count({ where }),
    ]);

    return { broadcasts, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getBroadcast(id: string) {
    return this.prisma.pushBroadcast.findUnique({ where: { id } });
  }

  async getBroadcastLogs(id: string, page = 1, limit = 50) {
    const skip = (Math.max(1, page) - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.pushBroadcastLog.findMany({
        where: { broadcast_id: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pushBroadcastLog.count({ where: { broadcast_id: id } }),
    ]);
    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async cancelBroadcast(id: string, adminUser: any) {
    const broadcast = await this.prisma.pushBroadcast.findUnique({ where: { id } });
    if (!broadcast) return null;
    if (broadcast.status !== 'scheduled') return { error: 'Only scheduled broadcasts can be cancelled' };

    const updated = await this.prisma.pushBroadcast.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    this.auditLogService
      .log({
        action: 'PUSH_BROADCAST_CANCEL',
        status: AuditStatus.SUCCESS,
        user_id: adminUser.sub,
        resource_type: 'PushBroadcast',
        resource_id: id,
        description: `Push broadcast "${broadcast.title}" cancelled`,
      })
      .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    return updated;
  }

  async resendFailed(id: string) {
    const broadcast = await this.prisma.pushBroadcast.findUnique({ where: { id } });
    if (!broadcast) return null;
    if (broadcast.status !== 'sent' && broadcast.status !== 'failed') {
      return { error: 'Can only resend for sent or failed broadcasts' };
    }

    const failedLogs = await this.prisma.pushBroadcastLog.findMany({
      where: { broadcast_id: id, status: 'failed' },
    });
    if (failedLogs.length === 0) return { error: 'No failed recipients to resend' };

    this.resendToFailedRecipients(broadcast, failedLogs).catch((e) =>
      this.logger.error(`Resend for broadcast ${id} failed: ${e.message}`),
    );

    return { message: `Resending to ${failedLogs.length} failed recipients`, count: failedLogs.length };
  }

  // ─── Preview ─────────────────────────────────────────────────

  async previewAudience(dto: CreatePushBroadcastDto) {
    const recipients = await this.buildAudience(dto.target_type, dto.target_filters, dto.target_user_ids);
    return {
      count: recipients.length,
      sample: recipients.slice(0, 5).map((r) => r.email || r.id),
    };
  }

  // ─── Audience Builder ────────────────────────────────────────

  private async buildAudience(
    targetType: string,
    filters?: PushTargetFiltersDto,
    userIds?: string[],
  ): Promise<Array<{ id: string; email: string | null; first_name: string | null }>> {
    if (targetType === 'individual' && userIds?.length) {
      return this.prisma.user.findMany({
        where: {
          id: { in: userIds },
          deviceTokens: { some: { is_active: true } },
        },
        select: { id: true, email: true, first_name: true },
      });
    }

    const where: any = {
      deviceTokens: { some: { is_active: true } },
    };

    if (targetType === 'filtered' && filters) {
      if (filters.role) where.role = filters.role;
      if (filters.account_status) where.account_status = filters.account_status;
      if (filters.gender) where.gender = filters.gender;
      if (filters.has_completed_onboarding !== undefined) where.has_completed_onboarding = filters.has_completed_onboarding;
      if (filters.tier) where.tier = { tier: filters.tier };

      if (filters.registered_before || filters.registered_after) {
        where.createdAt = {};
        if (filters.registered_before) where.createdAt.lte = new Date(filters.registered_before);
        if (filters.registered_after) where.createdAt.gte = new Date(filters.registered_after);
      }

      if (filters.min_balance !== undefined || filters.max_balance !== undefined) {
        where.wallet = { current_balance: {} };
        if (filters.min_balance !== undefined) where.wallet.current_balance.gte = filters.min_balance;
        if (filters.max_balance !== undefined) where.wallet.current_balance.lte = filters.max_balance;
      }

      if (filters.platform) {
        where.deviceTokens = { some: { platform: filters.platform, is_active: true } };
      }
    }

    let users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true, first_name: true },
    });

    if (targetType === 'filtered' && filters &&
        (filters.min_total_transactions !== undefined || filters.max_total_transactions !== undefined)) {
      const ids = users.map((u) => u.id);
      const txCounts = await this.prisma.transactionHistory.groupBy({
        by: ['user_id'],
        where: { user_id: { in: ids } },
        _count: { id: true },
      });
      const countMap = new Map(txCounts.map((t) => [t.user_id, t._count.id]));

      users = users.filter((u) => {
        const count = countMap.get(u.id) || 0;
        if (filters.min_total_transactions !== undefined && count < filters.min_total_transactions) return false;
        if (filters.max_total_transactions !== undefined && count > filters.max_total_transactions) return false;
        return true;
      });
    }

    return users;
  }

  // ─── Execution ───────────────────────────────────────────────

  async executeBroadcast(broadcastId: string) {
    const broadcast = await this.prisma.pushBroadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast) return;
    if (broadcast.status === 'sent' || broadcast.status === 'cancelled') return;

    await this.prisma.pushBroadcast.update({
      where: { id: broadcastId },
      data: { status: 'sending' },
    });

    try {
      const recipients = await this.buildAudience(
        broadcast.target_type,
        broadcast.target_filters as any,
        broadcast.target_user_ids as any,
      );

      await this.prisma.pushBroadcast.update({
        where: { id: broadcastId },
        data: { total_recipients: recipients.length },
      });

      if (recipients.length === 0) {
        await this.prisma.pushBroadcast.update({
          where: { id: broadcastId },
          data: { status: 'sent', sent_at: new Date(), total_recipients: 0 },
        });
        return;
      }

      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        try {
          // Inbox row first so the push payload can include its id for deep links (mobile expects data.id).
          const inboxRow = await this.prisma.pushBroadcastInbox.create({
            data: {
              user_id: recipient.id,
              broadcast_id: broadcastId,
              title: broadcast.title,
              body: broadcast.body,
              message: broadcast.message,
              data: { broadcast_id: broadcastId },
            },
          });

          const pushData = JSON.stringify({
            screen: 'notification',
            id: inboxRow.id,
            broadcast_id: broadcastId,
            type: 'broadcast',
          });

          const result = await this.pushService.sendNotificationToUser(recipient.id, {
            title: broadcast.title,
            body: broadcast.body,
            data: pushData,
            priority: 'default' as any,
          });

          const sent = result.data?.sent ?? 0;
          const logStatus = sent > 0 ? 'sent' : 'failed';

          await this.prisma.pushBroadcastLog.create({
            data: {
              broadcast_id: broadcastId,
              user_id: recipient.id,
              status: logStatus,
              error_message: sent === 0 ? 'No active device tokens delivered' : null,
            },
          });

          if (sent > 0) sentCount++;
          else failedCount++;
        } catch (err: any) {
          await this.prisma.pushBroadcastLog.create({
            data: {
              broadcast_id: broadcastId,
              user_id: recipient.id,
              status: 'failed',
              error_message: err.message?.slice(0, 500),
            },
          });
          failedCount++;
        }

        if ((i + 1) % 10 === 0 || i === recipients.length - 1) {
          await this.prisma.pushBroadcast.update({
            where: { id: broadcastId },
            data: { sent_count: sentCount, failed_count: failedCount },
          });
        }

        if (i < recipients.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, PER_USER_DELAY_MS));
        }
      }

      await this.prisma.pushBroadcast.update({
        where: { id: broadcastId },
        data: {
          status: failedCount === recipients.length ? 'failed' : 'sent',
          sent_at: new Date(),
          sent_count: sentCount,
          failed_count: failedCount,
        },
      });

      this.logger.log(`Push broadcast ${broadcastId}: ${sentCount} sent, ${failedCount} failed out of ${recipients.length}`);

      this.auditLogService
        .log({
          action: 'PUSH_BROADCAST_SEND',
          status: AuditStatus.SUCCESS,
          user_id: broadcast.created_by,
          resource_type: 'PushBroadcast',
          resource_id: broadcastId,
          description: `Push broadcast "${broadcast.title}" sent: ${sentCount}/${recipients.length}`,
          metadata: { sent_count: sentCount, failed_count: failedCount, total: recipients.length },
        })
        .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));
    } catch (error: any) {
      this.logger.error(`Push broadcast ${broadcastId} execution error: ${error.message}`);
      await this.prisma.pushBroadcast.update({
        where: { id: broadcastId },
        data: { status: 'failed' },
      });
    }
  }

  // ─── Resend ──────────────────────────────────────────────────

  private async resendToFailedRecipients(broadcast: any, failedLogs: any[]) {
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < failedLogs.length; i++) {
      const log = failedLogs[i];

      try {
        const inboxRow = await this.prisma.pushBroadcastInbox.findFirst({
          where: { user_id: log.user_id, broadcast_id: broadcast.id },
          orderBy: { createdAt: 'desc' },
        });

        const pushData = JSON.stringify({
          screen: 'notification',
          ...(inboxRow?.id ? { id: inboxRow.id } : {}),
          broadcast_id: broadcast.id,
          type: 'broadcast',
        });

        const result = await this.pushService.sendNotificationToUser(log.user_id, {
          title: broadcast.title,
          body: broadcast.body,
          data: pushData,
          priority: 'default' as any,
        });

        const sent = result.data?.sent ?? 0;
        await this.prisma.pushBroadcastLog.update({
          where: { id: log.id },
          data: { status: sent > 0 ? 'sent' : 'failed', error_message: sent > 0 ? null : 'Retry: no active tokens' },
        });

        if (sent > 0) sentCount++;
        else failedCount++;
      } catch (err: any) {
        await this.prisma.pushBroadcastLog.update({
          where: { id: log.id },
          data: { error_message: `Resend failed: ${err.message?.slice(0, 500)}` },
        });
        failedCount++;
      }

      if (i < failedLogs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, PER_USER_DELAY_MS));
      }
    }

    await this.prisma.pushBroadcast.update({
      where: { id: broadcast.id },
      data: {
        sent_count: { increment: sentCount },
        failed_count: { decrement: sentCount },
      },
    });

    this.logger.log(`Resend for broadcast ${broadcast.id}: ${sentCount} recovered, ${failedCount} still failing`);
  }

  // ─── Scheduler ───────────────────────────────────────────────

  private async processScheduledBroadcasts() {
    try {
      const due = await this.prisma.pushBroadcast.findMany({
        where: {
          status: 'scheduled',
          scheduled_for: { lte: new Date() },
        },
      });

      for (const broadcast of due) {
        this.logger.log(`[Scheduler] Executing scheduled push broadcast: ${broadcast.id} "${broadcast.title}"`);
        this.executeBroadcast(broadcast.id).catch((e) =>
          this.logger.error(`[Scheduler] Broadcast ${broadcast.id} failed: ${e.message}`),
        );
      }
    } catch (error: any) {
      this.logger.error(`[Scheduler] Error checking scheduled push broadcasts: ${error.message}`);
    }
  }

  // ─── User inbox (for mobile app) ────────────────────────────

  async getUserInbox(userId: string, page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * limit;
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.pushBroadcastInbox.findMany({
        where: { user_id: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pushBroadcastInbox.count({ where: { user_id: userId } }),
      this.prisma.pushBroadcastInbox.count({ where: { user_id: userId, is_read: false } }),
    ]);
    return { items, total, unreadCount, page, limit, pages: Math.ceil(total / limit) };
  }

  async getInboxItem(userId: string, itemId: string) {
    const item = await this.prisma.pushBroadcastInbox.findFirst({
      where: { id: itemId, user_id: userId },
    });
    if (item && !item.is_read) {
      await this.prisma.pushBroadcastInbox.update({
        where: { id: itemId },
        data: { is_read: true },
      });
    }
    return item ? { ...item, is_read: true } : null;
  }

  async markAllRead(userId: string) {
    await this.prisma.pushBroadcastInbox.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
    return { success: true };
  }

  // ─── Device Tokens Analytics ─────────────────────────────────

  async listDeviceTokens(opts: {
    page: number;
    limit: number;
    platform?: 'ios' | 'android';
    is_active?: boolean;
    search?: string;
  }) {
    const { page, limit, platform, is_active, search } = opts;
    const where: any = {};
    if (platform) where.platform = platform;
    if (is_active !== undefined) where.is_active = is_active;
    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { first_name: { contains: search, mode: 'insensitive' } } },
        { user: { last_name: { contains: search, mode: 'insensitive' } } },
        { device_id: { contains: search, mode: 'insensitive' } },
        { token: { startsWith: search } },
      ];
    }

    const [tokens, total] = await this.prisma.$transaction([
      this.prisma.deviceToken.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              role: true,
              account_status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deviceToken.count({ where }),
    ]);

    return {
      tokens,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getDeviceTokenStats() {
    const [total, active, inactive, ios, android] = await this.prisma.$transaction([
      this.prisma.deviceToken.count(),
      this.prisma.deviceToken.count({ where: { is_active: true } }),
      this.prisma.deviceToken.count({ where: { is_active: false } }),
      this.prisma.deviceToken.count({ where: { platform: 'ios' } }),
      this.prisma.deviceToken.count({ where: { platform: 'android' } }),
    ]);

    const uniqueGroups = await this.prisma.deviceToken.groupBy({ by: ['user_id'] });
    const unique_users = uniqueGroups.length;

    return { total, active, inactive, ios, android, unique_users };
  }
}

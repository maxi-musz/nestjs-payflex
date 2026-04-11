import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/common/mailer/email.service';
import { AuditLogService } from 'src/common/audit-log/audit-log.service';
import { AuditStatus } from '@prisma/client';
import { CreateCampaignDto, TargetFiltersDto } from './dto/create-campaign.dto';
import { QueryCampaignsDto } from './dto/query-campaigns.dto';
import {
  renderMarkdownToHtml,
  interpolateVariables,
} from './notification-email.template';

/** Wait between each send so large campaigns stay within provider limits (~1 email/sec). */
const PER_EMAIL_DELAY_MS = 1000;

@Injectable()
export class AdminNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  onModuleInit() {
    // check for scheduled campaigns every 60 seconds
    cron.schedule('*/60 * * * * *', () => this.processScheduledCampaigns());
    this.logger.log('Notification campaign scheduler initialized (every 60s)');
  }

  // ─── Campaign CRUD ──────────────────────────────────────────

  async createCampaign(dto: CreateCampaignDto, adminUser: any) {
    const contentHtml = renderMarkdownToHtml(dto.content_markdown);

    const isScheduled = !!dto.scheduled_for && new Date(dto.scheduled_for) > new Date();
    const status = isScheduled ? 'scheduled' : 'draft';

    const campaign = await this.prisma.notificationCampaign.create({
      data: {
        title: dto.title,
        subject: dto.subject,
        content_markdown: dto.content_markdown,
        content_html: contentHtml,
        target_type: dto.target_type,
        target_filters: dto.target_filters ? (dto.target_filters as any) : undefined,
        target_emails: dto.target_emails ? (dto.target_emails as any) : undefined,
        status,
        scheduled_for: dto.scheduled_for ? new Date(dto.scheduled_for) : null,
        created_by: adminUser.sub,
      },
    });

    this.auditLogService
      .log({
        action: 'NOTIFICATION_CAMPAIGN_CREATE',
        status: AuditStatus.SUCCESS,
        user_id: adminUser.sub,
        resource_type: 'NotificationCampaign',
        resource_id: campaign.id,
        description: `Campaign "${dto.title}" created (${status})`,
        metadata: { target_type: dto.target_type, scheduled: isScheduled },
      })
      .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    // if not scheduled, fire immediately in background
    if (!isScheduled) {
      this.executeCampaign(campaign.id).catch((e) =>
        this.logger.error(`Campaign ${campaign.id} execution failed: ${e.message}`),
      );
    }

    return campaign;
  }

  async listCampaigns(query: QueryCampaignsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;

    const [campaigns, total] = await Promise.all([
      this.prisma.notificationCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notificationCampaign.count({ where }),
    ]);

    return { campaigns, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getCampaign(id: string) {
    this.logger.log(`Getting campaign ${id}`);
    return this.prisma.notificationCampaign.findUnique({ where: { id } });
  }

  async getCampaignLogs(
    id: string,
    page = 1,
    limit = 50,
    status?: 'sent' | 'failed',
  ) {
    const skip = (Math.max(1, page) - 1) * limit;

    const where: { campaign_id: string; status?: string } = { campaign_id: id };
    if (status === 'sent' || status === 'failed') {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async cancelCampaign(id: string, adminUser: any) {
    const campaign = await this.prisma.notificationCampaign.findUnique({ where: { id } });
    if (!campaign) return null;
    if (campaign.status !== 'scheduled') return { error: 'Only scheduled campaigns can be cancelled' };

    const updated = await this.prisma.notificationCampaign.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    this.auditLogService
      .log({
        action: 'NOTIFICATION_CAMPAIGN_CANCEL',
        status: AuditStatus.SUCCESS,
        user_id: adminUser.sub,
        resource_type: 'NotificationCampaign',
        resource_id: id,
        description: `Campaign "${campaign.title}" cancelled`,
      })
      .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    return updated;
  }

  async deleteCampaign(id: string, adminUser: any) {
    const campaign = await this.prisma.notificationCampaign.findUnique({ where: { id } });
    if (!campaign) return null;
    if (campaign.status === 'sending') {
      return { error: 'Cannot delete while the campaign is sending. Wait until it finishes.' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationLog.deleteMany({ where: { campaign_id: id } });
      await tx.notificationCampaign.delete({ where: { id } });
    });

    this.auditLogService
      .log({
        action: 'NOTIFICATION_CAMPAIGN_DELETE',
        status: AuditStatus.SUCCESS,
        user_id: adminUser.sub,
        resource_type: 'NotificationCampaign',
        resource_id: id,
        description: `Campaign "${campaign.title}" deleted (logs removed)`,
      })
      .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    return { deleted: true as const, id };
  }

  async resendFailed(id: string, adminUser: any) {
    const campaign = await this.prisma.notificationCampaign.findUnique({ where: { id } });
    if (!campaign) return null;
    if (campaign.status !== 'sent' && campaign.status !== 'failed') {
      return { error: 'Can only resend for sent or failed campaigns' };
    }

    // get failed logs
    const failedLogs = await this.prisma.notificationLog.findMany({
      where: { campaign_id: id, status: 'failed' },
    });

    if (failedLogs.length === 0) return { error: 'No failed recipients to resend' };

    // fire in background
    this.resendToFailedRecipients(campaign, failedLogs).catch((e) =>
      this.logger.error(`Resend for campaign ${id} failed: ${e.message}`),
    );

    return { message: `Resending to ${failedLogs.length} failed recipients`, count: failedLogs.length };
  }

  /**
   * Resend only specific failed log rows (subset or single). Ignores IDs that are not failed or not in this campaign.
   */
  async resendSelectedLogs(campaignId: string, logIds: string[]) {
    if (!logIds?.length) {
      return { error: 'No log IDs provided' };
    }

    const campaign = await this.prisma.notificationCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return null;
    if (campaign.status !== 'sent' && campaign.status !== 'failed') {
      return { error: 'Can only resend for sent or failed campaigns' };
    }

    const logs = await this.prisma.notificationLog.findMany({
      where: {
        id: { in: logIds },
        campaign_id: campaignId,
        status: 'failed',
      },
    });

    if (logs.length === 0) {
      return { error: 'No matching failed recipients for the selected log IDs' };
    }

    this.resendToFailedRecipients(campaign, logs).catch((e) =>
      this.logger.error(`Resend selected for campaign ${campaignId} failed: ${e.message}`),
    );

    return { message: `Resending to ${logs.length} selected recipient(s)`, count: logs.length };
  }

  // ─── Preview (audience count without sending) ──────────────

  async previewAudience(dto: CreateCampaignDto) {
    const recipients = await this.buildAudience(dto.target_type, dto.target_filters, dto.target_emails);
    return { count: recipients.length, sample: recipients.slice(0, 5).map((r) => r.email) };
  }

  // ─── Audience Builder ──────────────────────────────────────

  private async buildAudience(
    targetType: string,
    filters?: TargetFiltersDto,
    emails?: string[],
  ): Promise<Array<{ id: string; email: string; first_name: string; last_name: string }>> {

    if (targetType === 'individual' && emails?.length) {
      const users = await this.prisma.user.findMany({
        where: { email: { in: emails }, is_email_verified: true },
        select: { id: true, email: true, first_name: true, last_name: true },
      });
      return users.filter((u) => u.email) as any;
    }

    // build dynamic where clause
    const where: any = {
      is_email_verified: true,
      email: { not: null },
    };

    if (targetType === 'filtered' && filters) {
      if (filters.role) where.role = filters.role;
      if (filters.account_status) where.account_status = filters.account_status;
      if (filters.gender) where.gender = filters.gender;
      if (filters.has_completed_onboarding !== undefined) where.has_completed_onboarding = filters.has_completed_onboarding;

      if (filters.tier) {
        where.tier = { tier: filters.tier };
      }

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
      select: { id: true, email: true, first_name: true, last_name: true },
    });

    // transaction count filter requires a second pass (aggregation)
    if (targetType === 'filtered' && filters &&
        (filters.min_total_transactions !== undefined || filters.max_total_transactions !== undefined)) {
      const userIds = users.map((u) => u.id);
      const txCounts = await this.prisma.transactionHistory.groupBy({
        by: ['user_id'],
        where: { user_id: { in: userIds } },
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

    return users.filter((u) => u.email) as any;
  }

  // ─── Campaign Execution ─────────────────────────────────────

  async executeCampaign(campaignId: string) {
    const campaign = await this.prisma.notificationCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return;

    // guard: skip if already sent or cancelled
    if (campaign.status === 'sent' || campaign.status === 'cancelled') return;

    await this.prisma.notificationCampaign.update({
      where: { id: campaignId },
      data: { status: 'sending' },
    });

    try {
      const recipients = await this.buildAudience(
        campaign.target_type,
        campaign.target_filters as any,
        campaign.target_emails as any,
      );

      await this.prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: { total_recipients: recipients.length },
      });

      if (recipients.length === 0) {
        await this.prisma.notificationCampaign.update({
          where: { id: campaignId },
          data: { status: 'sent', sent_at: new Date(), total_recipients: 0 },
        });
        return;
      }

      // Always render from markdown so fixes to marked/HTML apply to all sends (stored content_html may be stale).
      const baseEmailHtml = renderMarkdownToHtml(campaign.content_markdown);

      let sentCount = 0;
      let failedCount = 0;

      // send one at a time with delay to respect provider rate limits (Resend: 2 req/s)
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const personalizedHtml = interpolateVariables(baseEmailHtml, {
          first_name: recipient.first_name,
          last_name: recipient.last_name,
          email: recipient.email,
        });

        try {
          await this.emailService.sendEmail(recipient.email, campaign.subject, personalizedHtml);

          await this.prisma.notificationLog.create({
            data: {
              campaign_id: campaignId,
              user_id: recipient.id,
              email: recipient.email,
              status: 'sent',
            },
          });
          sentCount++;
        } catch (err: any) {
          await this.prisma.notificationLog.create({
            data: {
              campaign_id: campaignId,
              user_id: recipient.id,
              email: recipient.email,
              status: 'failed',
              error_message: err.message?.slice(0, 500),
            },
          });
          failedCount++;
        }

        // update progress every 10 emails so admin can track
        if ((i + 1) % 10 === 0 || i === recipients.length - 1) {
          await this.prisma.notificationCampaign.update({
            where: { id: campaignId },
            data: { sent_count: sentCount, failed_count: failedCount },
          });
        }

        // throttle: wait between each email to stay under provider rate limits
        if (i < recipients.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, PER_EMAIL_DELAY_MS));
        }
      }

      await this.prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: {
          status: failedCount === recipients.length ? 'failed' : 'sent',
          sent_at: new Date(),
          sent_count: sentCount,
          failed_count: failedCount,
        },
      });

      this.logger.log(`Campaign ${campaignId}: ${sentCount} sent, ${failedCount} failed out of ${recipients.length}`);

      this.auditLogService
        .log({
          action: 'NOTIFICATION_CAMPAIGN_SEND',
          status: AuditStatus.SUCCESS,
          user_id: campaign.created_by,
          resource_type: 'NotificationCampaign',
          resource_id: campaignId,
          description: `Campaign "${campaign.title}" sent: ${sentCount}/${recipients.length}`,
          metadata: { sent_count: sentCount, failed_count: failedCount, total: recipients.length },
        })
        .catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));
    } catch (error: any) {
      this.logger.error(`Campaign ${campaignId} execution error: ${error.message}`);

      await this.prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });
    }
  }

  // ─── Resend to previously failed recipients ─────────────────

  private async resendToFailedRecipients(campaign: any, failedLogs: any[]) {
    let sentCount = 0;
    let failedCount = 0;

    const baseEmailHtml = renderMarkdownToHtml(campaign.content_markdown);

    const userIds = [...new Set(failedLogs.map((l) => l.user_id).filter(Boolean))] as string[];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, first_name: true, last_name: true },
          })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    for (let i = 0; i < failedLogs.length; i++) {
      const log = failedLogs[i];
      const u = log.user_id ? userById.get(log.user_id) : undefined;
      const personalizedHtml = interpolateVariables(baseEmailHtml, {
        first_name: u?.first_name ?? undefined,
        last_name: u?.last_name ?? undefined,
        email: log.email,
      });

      try {
        await this.emailService.sendEmail(log.email, campaign.subject, personalizedHtml);

        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: 'sent', error_message: null },
        });
        sentCount++;
      } catch (err: any) {
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: { error_message: `Resend failed: ${err.message?.slice(0, 500)}` },
        });
        failedCount++;
      }

      if (i < failedLogs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, PER_EMAIL_DELAY_MS));
      }
    }

    // update campaign counters
    await this.prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        sent_count: { increment: sentCount },
        failed_count: { decrement: sentCount },
      },
    });

    this.logger.log(`Resend for campaign ${campaign.id}: ${sentCount} recovered, ${failedCount} still failing`);
  }

  // ─── Scheduler (runs every 60s via node-cron) ───────────────

  private async processScheduledCampaigns() {
    try {
      const due = await this.prisma.notificationCampaign.findMany({
        where: {
          status: 'scheduled',
          scheduled_for: { lte: new Date() },
        },
      });

      for (const campaign of due) {
        this.logger.log(`[Scheduler] Executing scheduled campaign: ${campaign.id} "${campaign.title}"`);
        this.executeCampaign(campaign.id).catch((e) =>
          this.logger.error(`[Scheduler] Campaign ${campaign.id} failed: ${e.message}`),
        );
      }
    } catch (error: any) {
      this.logger.error(`[Scheduler] Error checking scheduled campaigns: ${error.message}`);
    }
  }
}

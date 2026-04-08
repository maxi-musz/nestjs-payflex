import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private todayDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  /** Start [inclusive] and end [exclusive] of the current calendar day in Africa/Lagos. */
  private getLagosDayBounds(now: Date = new Date()): { start: Date; end: Date } {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(now);
    const y = parts.find((p) => p.type === 'year')!.value;
    const m = parts.find((p) => p.type === 'month')!.value;
    const d = parts.find((p) => p.type === 'day')!.value;
    const start = new Date(`${y}-${m}-${d}T00:00:00+01:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /** Date-only key (UTC midnight of Y-M-D) matching the Lagos calendar day for `now`. */
  private lagosCalendarDateKeyForDb(now: Date = new Date()): Date {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(now);
    const y = Number(parts.find((p) => p.type === 'year')!.value);
    const mo = Number(parts.find((p) => p.type === 'month')!.value);
    const day = Number(parts.find((p) => p.type === 'day')!.value);
    return new Date(Date.UTC(y, mo - 1, day));
  }

  // Safe wrapper: stats should never break business logic
  private async safe(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.error(`Stats update failed [${label}]: ${err.message}`);
    }
  }

  // ──────────────────────────────────────────────────────────
  // USER EVENTS
  // ──────────────────────────────────────────────────────────

  async onUserCreated(tierName?: string): Promise<void> {
    await this.safe('onUserCreated', async () => {
      const date = this.todayDate();
      await this.prisma.dailyStats.upsert({
        where: { date },
        create: { date, new_users: 1 },
        update: { new_users: { increment: 1 } },
      });
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: {
          total_users: { increment: 1 },
          active_users: { increment: 1 },
        },
      });
      if (tierName) {
        await this.adjustTierDistribution(tierName, 1);
      }
    });
  }

  async onUserStatusChanged(oldStatus: string, newStatus: string): Promise<void> {
    await this.safe('onUserStatusChanged', async () => {
      await this.ensureSystemStats();
      const data: Record<string, any> = {};
      if (oldStatus === 'active' && newStatus === 'suspended') {
        data.active_users = { decrement: 1 };
        data.suspended_users = { increment: 1 };
      } else if (oldStatus === 'suspended' && newStatus === 'active') {
        data.active_users = { increment: 1 };
        data.suspended_users = { decrement: 1 };
      }
      if (Object.keys(data).length > 0) {
        await this.prisma.systemStats.update({ where: { id: 'system' }, data });
      }
    });
  }

  async onUserTierChanged(oldTier: string | null, newTier: string): Promise<void> {
    await this.safe('onUserTierChanged', async () => {
      if (oldTier) await this.adjustTierDistribution(oldTier, -1);
      await this.adjustTierDistribution(newTier, 1);
    });
  }

  // ──────────────────────────────────────────────────────────
  // TRANSACTION EVENTS
  // ──────────────────────────────────────────────────────────

  /**
   * Call when a VTpass (or other provider) transaction is created.
   * @param amount - Transaction amount (customer-facing).
   * @param status - 'success' | 'failed' | 'pending'.
   * @param markupValue - Our margin (Smipay price − VTpass price); added to markup_revenue on success.
   * @param vtpassCommission - Commission from VTpass response (content.transactions.commission); added to vtpass_commission_revenue on success.
   */
  async onTransactionCreated(
    amount: number,
    status: string,
    markupValue?: number,
    vtpassCommission?: number,
  ): Promise<void> {
    await this.safe('onTransactionCreated', async () => {
      const date = this.todayDate();
      const dailyUpdate: Record<string, any> = { transactions_count: { increment: 1 } };
      if (status === 'success') {
        dailyUpdate.transactions_success = { increment: 1 };
        dailyUpdate.transactions_volume = { increment: amount };
      } else if (status === 'failed') {
        dailyUpdate.transactions_failed = { increment: 1 };
      }
      if (markupValue != null && markupValue > 0) {
        dailyUpdate.markup_revenue = { increment: markupValue };
      }
      if (status === 'success' && vtpassCommission != null && vtpassCommission > 0) {
        dailyUpdate.vtpass_commission_revenue = { increment: vtpassCommission };
      }
      await this.prisma.dailyStats.upsert({
        where: { date },
        create: {
          date,
          transactions_count: 1,
          transactions_volume: status === 'success' ? amount : 0,
          transactions_success: status === 'success' ? 1 : 0,
          transactions_failed: status === 'failed' ? 1 : 0,
          markup_revenue: markupValue != null && markupValue > 0 ? markupValue : 0,
          vtpass_commission_revenue:
            status === 'success' && vtpassCommission != null && vtpassCommission > 0 ? vtpassCommission : 0,
        },
        update: dailyUpdate,
      });
      if (status === 'pending') {
        await this.ensureSystemStats();
        await this.prisma.systemStats.update({
          where: { id: 'system' },
          data: { pending_transactions: { increment: 1 } },
        });
      }
    });
  }

  /**
   * Call when a transaction status changes (e.g. pending → success via webhook or requery).
   * @param commission - VTpass commission from provider response; added to vtpass_commission_revenue when transitioning to success.
   */
  async onTransactionStatusChanged(
    oldStatus: string,
    newStatus: string,
    amount: number,
    markupValue?: number,
    commission?: number,
  ): Promise<void> {
    await this.safe('onTransactionStatusChanged', async () => {
      const date = this.todayDate();
      const dailyUpdate: Record<string, any> = {};
      const systemUpdate: Record<string, any> = {};

      if (oldStatus === 'pending' && newStatus === 'success') {
        dailyUpdate.transactions_success = { increment: 1 };
        dailyUpdate.transactions_volume = { increment: amount };
        systemUpdate.pending_transactions = { decrement: 1 };
      } else if (oldStatus === 'pending' && newStatus === 'failed') {
        dailyUpdate.transactions_failed = { increment: 1 };
        systemUpdate.pending_transactions = { decrement: 1 };
      }
      if (markupValue != null && markupValue > 0) {
        dailyUpdate.markup_revenue = { increment: markupValue };
      }
      if (oldStatus === 'pending' && newStatus === 'success' && commission != null && commission > 0) {
        dailyUpdate.vtpass_commission_revenue = { increment: commission };
      }

      if (Object.keys(dailyUpdate).length > 0) {
        await this.prisma.dailyStats.upsert({
          where: { date },
          create: { date },
          update: dailyUpdate,
        });
      }
      if (Object.keys(systemUpdate).length > 0) {
        await this.ensureSystemStats();
        await this.prisma.systemStats.update({ where: { id: 'system' }, data: systemUpdate });
      }
    });
  }

  // ──────────────────────────────────────────────────────────
  // WALLET EVENTS
  // ──────────────────────────────────────────────────────────

  async onWalletFunded(amount: number): Promise<void> {
    await this.safe('onWalletFunded', async () => {
      const date = this.todayDate();
      await this.prisma.dailyStats.upsert({
        where: { date },
        create: { date, funded_amount: amount },
        update: { funded_amount: { increment: amount } },
      });
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: { total_wallet_balance: { increment: amount } },
      });
    });
  }

  async onWalletDebited(amount: number): Promise<void> {
    await this.safe('onWalletDebited', async () => {
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: { total_wallet_balance: { decrement: amount } },
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  // KYC EVENTS
  // ──────────────────────────────────────────────────────────

  async onKycApproved(): Promise<void> {
    await this.safe('onKycApproved', async () => {
      const date = this.todayDate();
      await this.prisma.dailyStats.upsert({
        where: { date },
        create: { date, kyc_approved: 1 },
        update: { kyc_approved: { increment: 1 } },
      });
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: { pending_kyc: { decrement: 1 } },
      });
    });
  }

  async onKycRejected(): Promise<void> {
    await this.safe('onKycRejected', async () => {
      const date = this.todayDate();
      await this.prisma.dailyStats.upsert({
        where: { date },
        create: { date, kyc_rejected: 1 },
        update: { kyc_rejected: { increment: 1 } },
      });
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: { pending_kyc: { decrement: 1 } },
      });
    });
  }

  async onKycSubmitted(): Promise<void> {
    await this.safe('onKycSubmitted', async () => {
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: { pending_kyc: { increment: 1 } },
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  // SUPPORT TICKET EVENTS
  // ──────────────────────────────────────────────────────────

  async onTicketCreated(status: string = 'pending'): Promise<void> {
    await this.safe('onTicketCreated', async () => {
      await this.ensureSystemStats();
      const data: Record<string, any> = {};
      if (status === 'pending') data.pending_tickets = { increment: 1 };
      else data.open_tickets = { increment: 1 };
      await this.prisma.systemStats.update({ where: { id: 'system' }, data });
    });
  }

  async onTicketStatusChanged(oldStatus: string, newStatus: string): Promise<void> {
    await this.safe('onTicketStatusChanged', async () => {
      await this.ensureSystemStats();
      const data: Record<string, any> = {};
      // Decrement old
      if (oldStatus === 'pending') data.pending_tickets = { decrement: 1 };
      else if (oldStatus === 'in_progress') data.open_tickets = { decrement: 1 };
      else if (oldStatus === 'escalated') data.escalated_tickets = { decrement: 1 };
      // Increment new
      if (newStatus === 'pending') {
        data.pending_tickets = { ...(data.pending_tickets || {}), increment: 1 };
      } else if (newStatus === 'in_progress') {
        data.open_tickets = { ...(data.open_tickets || {}), increment: 1 };
      } else if (newStatus === 'escalated') {
        data.escalated_tickets = { increment: 1 };
      }
      // Resolved/closed = just decrement old, no increment
      if (Object.keys(data).length > 0) {
        await this.prisma.systemStats.update({ where: { id: 'system' }, data });
      }
    });
  }

  // ──────────────────────────────────────────────────────────
  // CARD EVENTS
  // ──────────────────────────────────────────────────────────

  async onCardIssued(): Promise<void> {
    await this.safe('onCardIssued', async () => {
      const date = this.todayDate();
      await this.prisma.dailyStats.upsert({
        where: { date },
        create: { date, cards_issued: 1 },
        update: { cards_issued: { increment: 1 } },
      });
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: { total_active_cards: { increment: 1 } },
      });
    });
  }

  async onCardDeactivated(): Promise<void> {
    await this.safe('onCardDeactivated', async () => {
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: { total_active_cards: { decrement: 1 } },
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  // REFERRAL EVENTS
  // ──────────────────────────────────────────────────────────

  async onReferralCreated(): Promise<void> {
    await this.safe('onReferralCreated', async () => {
      const date = this.todayDate();
      await this.prisma.dailyStats.upsert({
        where: { date },
        create: { date, referrals_count: 1 },
        update: { referrals_count: { increment: 1 } },
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  // COMPLIANCE EVENTS
  // ──────────────────────────────────────────────────────────

  async onAuditLogFlagged(): Promise<void> {
    await this.safe('onAuditLogFlagged', async () => {
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: { flagged_audit_logs: { increment: 1 } },
      });
    });
  }

  async onAuditLogUnflagged(): Promise<void> {
    await this.safe('onAuditLogUnflagged', async () => {
      await this.ensureSystemStats();
      await this.prisma.systemStats.update({
        where: { id: 'system' },
        data: { flagged_audit_logs: { decrement: 1 } },
      });
    });
  }

  async onSecurityEvent(): Promise<void> {
    await this.safe('onSecurityEvent', async () => {
      const date = this.todayDate();
      await this.prisma.dailyStats.upsert({
        where: { date },
        create: { date, security_events: 1 },
        update: { security_events: { increment: 1 } },
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  // DASHBOARD READ — 3 lightweight queries
  // ──────────────────────────────────────────────────────────

  async getDashboardStats() {
    const today = this.todayDate();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6); // last 7 days including today
    const startOfThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const startOfLastMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const { start: lagosDayStart, end: lagosDayEnd } = this.getLagosDayBounds();

    const [system, todayStats, weekStats, revenueThisMonth, revenueLastMonth, revenueAllTime, walletTotals, fundedTodayAgg] =
      await Promise.all([
        this.getOrCreateSystemStats(),
        this.prisma.dailyStats.findUnique({ where: { date: today } }),
        this.prisma.dailyStats.findMany({
          where: { date: { gte: weekAgo, lte: today } },
        }),
        this.prisma.dailyStats.aggregate({
          where: { date: { gte: startOfThisMonth, lte: today } },
          _sum: { markup_revenue: true, vtpass_commission_revenue: true },
        }),
        this.prisma.dailyStats.aggregate({
          where: { date: { gte: startOfLastMonth, lt: startOfThisMonth } },
          _sum: { markup_revenue: true, vtpass_commission_revenue: true },
        }),
        this.prisma.dailyStats.aggregate({
          _sum: { markup_revenue: true, vtpass_commission_revenue: true },
        }),
        this.prisma.wallet.aggregate({ _sum: { current_balance: true } }),
        this.prisma.transactionHistory.aggregate({
          where: {
            transaction_type: 'deposit',
            status: 'success',
            credit_debit: 'credit',
            createdAt: { gte: lagosDayStart, lt: lagosDayEnd },
          },
          _sum: { amount: true },
        }),
      ]);

    const weekTotals = this.sumWeekStats(weekStats);
    const daily = todayStats || this.emptyDailyStats();

    const toRev = (s: { _sum: { markup_revenue: number | null; vtpass_commission_revenue: number | null } }) => ({
      markup: s._sum.markup_revenue ?? 0,
      commission: s._sum.vtpass_commission_revenue ?? 0,
      total: (s._sum.markup_revenue ?? 0) + (s._sum.vtpass_commission_revenue ?? 0),
    });
    const revThisMonth = toRev(revenueThisMonth);
    const revLastMonth = toRev(revenueLastMonth);
    const revAllTime = toRev(revenueAllTime);

    return {
      users: {
        total: system.total_users,
        new_today: daily.new_users,
        new_this_week: weekTotals.new_users,
        active: system.active_users,
        suspended: system.suspended_users,
      },
      transactions: {
        total_today: daily.transactions_count,
        total_volume_today: daily.transactions_volume,
        pending_count: system.pending_transactions,
        failed_count: daily.transactions_failed,
        success_count: daily.transactions_success,
      },
      support: {
        open_tickets: system.open_tickets,
        pending_tickets: system.pending_tickets,
        escalated_tickets: system.escalated_tickets,
      },
      wallets: {
        total_balance_all_users: Number(walletTotals._sum.current_balance ?? 0),
        total_funded_today: Number(fundedTodayAgg._sum.amount ?? 0),
      },
      kyc: {
        pending: system.pending_kyc,
        approved_today: daily.kyc_approved,
        approved_this_week: weekTotals.kyc_approved,
        rejected: daily.kyc_rejected,
      },
      compliance: {
        flagged_audit_logs: system.flagged_audit_logs,
        security_events_today: daily.security_events,
      },
      cards: {
        total_active: system.total_active_cards,
        issued_today: daily.cards_issued,
      },
      referrals: {
        today: daily.referrals_count,
        this_week: weekTotals.referrals_count,
      },
      tier_distribution: system.tier_distribution,
      revenue: {
        markup_today: daily.markup_revenue,
        markup_this_week: weekTotals.markup_revenue,
        vtpass_commission_today: daily.vtpass_commission_revenue,
        vtpass_commission_this_week: weekTotals.vtpass_commission_revenue,
        total_revenue_today: (daily.markup_revenue ?? 0) + (daily.vtpass_commission_revenue ?? 0),
        total_revenue_this_week:
          (weekTotals.markup_revenue ?? 0) + (weekTotals.vtpass_commission_revenue ?? 0),
        this_month: {
          markup: revThisMonth.markup,
          vtpass_commission: revThisMonth.commission,
          total: revThisMonth.total,
        },
        last_month: {
          markup: revLastMonth.markup,
          vtpass_commission: revLastMonth.commission,
          total: revLastMonth.total,
        },
        all_time: {
          markup: revAllTime.markup,
          vtpass_commission: revAllTime.commission,
          total: revAllTime.total,
        },
      },
      action_items: this.buildActionItems(system, daily),
    };
  }

  // ──────────────────────────────────────────────────────────
  // RECALCULATE — Run once on first deploy to seed from real data
  // ──────────────────────────────────────────────────────────

  async recalculate(): Promise<void> {
    this.logger.log('Recalculating system stats from database...');

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalWalletBalance,
      totalActiveCards,
      openTickets,
      pendingTickets,
      escalatedTickets,
      pendingKyc,
      flaggedLogs,
      pendingTx,
      tierCounts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { account_status: 'active' } }),
      this.prisma.user.count({ where: { account_status: 'suspended' } }),
      this.prisma.wallet.aggregate({ _sum: { current_balance: true } }),
      this.prisma.card.count({ where: { is_active: true } }),
      this.prisma.supportTicket.count({ where: { status: 'in_progress' } }),
      this.prisma.supportTicket.count({ where: { status: 'pending' } }),
      this.prisma.supportTicket.count({ where: { status: 'escalated' } }),
      this.prisma.kycVerification.count({ where: { status: 'pending' } }),
      this.prisma.auditLog.count({ where: { is_flagged: true } }),
      this.prisma.transactionHistory.count({ where: { status: 'pending' } }),
      this.prisma.user.groupBy({
        by: ['tier_id'],
        _count: true,
        where: { tier_id: { not: null } },
      }),
    ]);

    // Resolve tier names
    const tierIds = tierCounts.map((t) => t.tier_id).filter(Boolean) as string[];
    const tiers = tierIds.length
      ? await this.prisma.tier.findMany({ where: { id: { in: tierIds } }, select: { id: true, tier: true } })
      : [];
    const tierMap = new Map(tiers.map((t) => [t.id, t.tier]));
    const distribution: Record<string, number> = {};
    for (const tc of tierCounts) {
      const name = tierMap.get(tc.tier_id!) ?? 'UNKNOWN';
      distribution[name] = tc._count;
    }

    await this.prisma.systemStats.upsert({
      where: { id: 'system' },
      create: {
        id: 'system',
        total_users: totalUsers,
        active_users: activeUsers,
        suspended_users: suspendedUsers,
        total_wallet_balance: totalWalletBalance._sum.current_balance ?? 0,
        total_active_cards: totalActiveCards,
        open_tickets: openTickets,
        pending_tickets: pendingTickets,
        escalated_tickets: escalatedTickets,
        pending_kyc: pendingKyc,
        flagged_audit_logs: flaggedLogs,
        pending_transactions: pendingTx,
        tier_distribution: distribution,
      },
      update: {
        total_users: totalUsers,
        active_users: activeUsers,
        suspended_users: suspendedUsers,
        total_wallet_balance: totalWalletBalance._sum.current_balance ?? 0,
        total_active_cards: totalActiveCards,
        open_tickets: openTickets,
        pending_tickets: pendingTickets,
        escalated_tickets: escalatedTickets,
        pending_kyc: pendingKyc,
        flagged_audit_logs: flaggedLogs,
        pending_transactions: pendingTx,
        tier_distribution: distribution,
      },
    });

    const { start: lagosStart, end: lagosEnd } = this.getLagosDayBounds();
    const fundedTodayAgg = await this.prisma.transactionHistory.aggregate({
      where: {
        transaction_type: 'deposit',
        status: 'success',
        credit_debit: 'credit',
        createdAt: { gte: lagosStart, lt: lagosEnd },
      },
      _sum: { amount: true },
    });
    const fundedTodayTotal = Number(fundedTodayAgg._sum.amount ?? 0);
    const lagosDateKey = this.lagosCalendarDateKeyForDb();
    await this.prisma.dailyStats.upsert({
      where: { date: lagosDateKey },
      create: {
        date: lagosDateKey,
        funded_amount: fundedTodayTotal,
      },
      update: {
        funded_amount: fundedTodayTotal,
      },
    });

    this.logger.log('System stats recalculated successfully');
  }

  // ──────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────

  private async ensureSystemStats(): Promise<void> {
    const exists = await this.prisma.systemStats.findUnique({ where: { id: 'system' } });
    if (!exists) {
      await this.prisma.systemStats.create({ data: { id: 'system' } });
    }
  }

  private async getOrCreateSystemStats() {
    let stats = await this.prisma.systemStats.findUnique({ where: { id: 'system' } });
    if (!stats) {
      stats = await this.prisma.systemStats.create({ data: { id: 'system' } });
    }
    return stats;
  }

  private async adjustTierDistribution(tierName: string, delta: number): Promise<void> {
    const stats = await this.getOrCreateSystemStats();
    const dist = (stats.tier_distribution as Record<string, number>) ?? {};
    dist[tierName] = Math.max(0, (dist[tierName] ?? 0) + delta);
    await this.prisma.systemStats.update({
      where: { id: 'system' },
      data: { tier_distribution: dist },
    });
  }

  private sumWeekStats(rows: any[]) {
    const sum = {
      new_users: 0,
      kyc_approved: 0,
      referrals_count: 0,
      markup_revenue: 0,
      vtpass_commission_revenue: 0,
    };
    for (const r of rows) {
      sum.new_users += r.new_users ?? 0;
      sum.kyc_approved += r.kyc_approved ?? 0;
      sum.referrals_count += r.referrals_count ?? 0;
      sum.markup_revenue += r.markup_revenue ?? 0;
      sum.vtpass_commission_revenue += r.vtpass_commission_revenue ?? 0;
    }
    return sum;
  }

  private emptyDailyStats() {
    return {
      new_users: 0,
      transactions_count: 0,
      transactions_volume: 0,
      transactions_success: 0,
      transactions_failed: 0,
      funded_amount: 0,
      kyc_approved: 0,
      kyc_rejected: 0,
      cards_issued: 0,
      referrals_count: 0,
      markup_revenue: 0,
      vtpass_commission_revenue: 0,
      security_events: 0,
    };
  }

  private buildActionItems(system: any, daily: any) {
    const items: { type: string; count: number }[] = [];
    if (system.escalated_tickets > 0) items.push({ type: 'escalated_tickets', count: system.escalated_tickets });
    if (system.flagged_audit_logs > 0) items.push({ type: 'flagged_audits', count: system.flagged_audit_logs });
    if (system.pending_kyc > 0) items.push({ type: 'pending_kyc', count: system.pending_kyc });
    if (system.pending_transactions > 0) items.push({ type: 'pending_transactions', count: system.pending_transactions });
    return items;
  }
}

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { isDevAdminEmail } from '../../../common/dev-admin-email.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../common/audit-log/audit-log.service';
import {
  WalletAnalysisDto,
  WalletIntegrityService,
} from '../../../common/wallet-integrity/wallet-integrity.service';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import {
  QueryTransactionsDto,
  TransactionStatsQueryDto,
} from './dto/query-transactions.dto';
import { AuditAction, AuditStatus, Prisma } from '@prisma/client';

const TX_LIST_SELECT = {
  id: true,
  user_id: true,
  amount: true,
  provider: true,
  data_plan_name: true,
  transaction_type: true,
  credit_debit: true,
  description: true,
  status: true,
  recipient_mobile: true,
  currency_type: true,
  payment_method: true,
  payment_channel: true,
  commission: true,
  balance_before: true,
  balance_after: true,
  cashback_balance_before: true,
  cashback_used: true,
  cashback_balance_after: true,
  cashback_earned: true,
  electricity_token: true,
  transaction_number: true,
  transaction_reference: true,
  session_id: true,
  markup_value: true,
  createdAt: true,
  updatedAt: true,
  sender_details: {
    select: {
      sender_name: true,
      sender_bank: true,
      sender_account_number: true,
    },
  },
  icon: { select: { secure_url: true } },
} satisfies Prisma.TransactionHistorySelect;

/** Light rows for per-tx main-wallet delta vs amount (same rules as admin Transactions table). */
const TX_INTEGRITY_SCAN_SELECT = {
  id: true,
  createdAt: true,
  amount: true,
  credit_debit: true,
  balance_before: true,
  balance_after: true,
  cashback_used: true,
} satisfies Prisma.TransactionHistorySelect;

type TxIntegrityScanRow = Prisma.TransactionHistoryGetPayload<{
  select: typeof TX_INTEGRITY_SCAN_SELECT;
}>;

type TxListRow = Prisma.TransactionHistoryGetPayload<{ select: typeof TX_LIST_SELECT }>;

const TX_ROW_WALLET_EPS = 0.05;

/** Matches web `txnBalanceIntegrity`: credits/debits vs balance_after − balance_before. */
function txnRowWalletIntegrity(
  tx: Pick<
    TxIntegrityScanRow,
    'amount' | 'credit_debit' | 'balance_before' | 'balance_after' | 'cashback_used'
  >,
): 'ok' | 'warn' | 'na' {
  if (tx.amount == null || tx.credit_debit == null) return 'na';
  const amt = Number(tx.amount);
  const bb = Number(tx.balance_before);
  const ba = Number(tx.balance_after);
  const d = ba - bb;
  const cbUsed = Number(tx.cashback_used ?? 0);

  if (tx.credit_debit === 'credit') {
    if (Math.abs(amt) < TX_ROW_WALLET_EPS && Math.abs(d) < TX_ROW_WALLET_EPS) return 'ok';
    return Math.abs(d - amt) < TX_ROW_WALLET_EPS ? 'ok' : 'warn';
  }
  if (tx.credit_debit === 'debit') {
    const expected = -(amt - cbUsed);
    return Math.abs(d - expected) < TX_ROW_WALLET_EPS ? 'ok' : 'warn';
  }
  return 'na';
}

const TX_DETAIL_SELECT = {
  ...TX_LIST_SELECT,
  account_id: true,
  vtpass_amount: true,
  smipay_amount: true,
  markup_percent: true,
  markup_value: true,
  authorization_url: true,
  meta_data: true,
} satisfies Prisma.TransactionHistorySelect;

const USER_BRIEF_SELECT = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone_number: true,
  smipay_tag: true,
  role: true,
  account_status: true,
  profile_image: { select: { secure_url: true } },
  wallet: {
    select: {
      current_balance: true,
      all_time_fuunding: true,
      all_time_withdrawn: true,
    },
  },
  cashbackWallet: {
    select: {
      current_balance: true,
      all_time_earned: true,
      all_time_withdrawn: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminTransactionsService {
  private readonly logger = new Logger(AdminTransactionsService.name);
  private readonly MAX_TX_ROW_WALLET_SCAN = 20_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly walletIntegrity: WalletIntegrityService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // LIST — Paginated, filterable, searchable
  // ──────────────────────────────────────────────────────────

  async listTransactions(
    query: QueryTransactionsDto,
    requester?: { email?: string | null } | null,
  ) {
    const allowWalletDevTools = isDevAdminEmail(requester?.email ?? undefined);
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);

    const integrityFilter =
      allowWalletDevTools &&
      (query.wallet_integrity === 'ok' || query.wallet_integrity === 'fail')
        ? (query.wallet_integrity as 'ok' | 'fail')
        : null;

    const total = await this.prisma.transactionHistory.count({ where });
    if (integrityFilter && total > this.MAX_TX_ROW_WALLET_SCAN) {
      throw new BadRequestException(
        `Wallet row integrity filter supports at most ${this.MAX_TX_ROW_WALLET_SCAN} transactions with the current filters. Narrow search or filters and try again.`,
      );
    }

    const lightScanPromise =
      allowWalletDevTools && total <= this.MAX_TX_ROW_WALLET_SCAN
        ? this.prisma.transactionHistory.findMany({
            where,
            select: TX_INTEGRITY_SCAN_SELECT,
            orderBy: { id: 'asc' },
          })
        : Promise.resolve([] as TxIntegrityScanRow[]);

    /** Merge list filters (search, user_id, status, dates, etc.) into every analytics query. */
    const scoped = (extra: Prisma.TransactionHistoryWhereInput): Prisma.TransactionHistoryWhereInput => {
      if (!extra || Object.keys(extra).length === 0) return where;
      if (Object.keys(where).length === 0) return extra;
      return { AND: [where, extra] };
    };

    const sortableFields = ['createdAt', 'amount', 'status', 'transaction_type'];
    const sortBy = sortableFields.includes(query.sort_by || '') ? query.sort_by! : 'createdAt';
    const sortOrder = query.sort_order === 'asc' ? 'asc' : 'desc';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(todayStart);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const prevMonthStart = new Date(monthAgo);
    prevMonthStart.setDate(prevMonthStart.getDate() - 30);

    const [
      lightScan,
      successVolume,
      byStatus,
      byType,
      byChannel,
      avgStats,
      todayCount,
      todayVolume,
      weekCount,
      weekVolume,
      monthCount,
      monthVolume,
      prevMonthVolume,
      totalRevenue,
      totalCommission,
    ] = await Promise.all([
      lightScanPromise,
      this.prisma.transactionHistory.aggregate({
        _sum: { amount: true },
        where: scoped({ status: 'success' }),
      }),
      this.prisma.transactionHistory.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.transactionHistory.groupBy({
        by: ['transaction_type'],
        where,
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.transactionHistory.groupBy({
        by: ['payment_channel'],
        where,
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.transactionHistory.aggregate({
        _avg: { amount: true },
        _min: { amount: true },
        _max: { amount: true },
        where: scoped({ status: 'success' }),
      }),
      this.prisma.transactionHistory.count({
        where: scoped({ createdAt: { gte: todayStart } }),
      }),
      this.prisma.transactionHistory.aggregate({
        _sum: { amount: true },
        where: scoped({ createdAt: { gte: todayStart }, status: 'success' }),
      }),
      this.prisma.transactionHistory.count({
        where: scoped({ createdAt: { gte: weekAgo } }),
      }),
      this.prisma.transactionHistory.aggregate({
        _sum: { amount: true },
        where: scoped({ createdAt: { gte: weekAgo }, status: 'success' }),
      }),
      this.prisma.transactionHistory.count({
        where: scoped({ createdAt: { gte: monthAgo } }),
      }),
      this.prisma.transactionHistory.aggregate({
        _sum: { amount: true },
        where: scoped({ createdAt: { gte: monthAgo }, status: 'success' }),
      }),
      this.prisma.transactionHistory.aggregate({
        _sum: { amount: true },
        where: scoped({
          createdAt: { gte: prevMonthStart, lt: monthAgo },
          status: 'success',
        }),
      }),
      this.prisma.transactionHistory.aggregate({
        _sum: { markup_value: true },
        where: scoped({}),
      }),
      this.prisma.transactionHistory.aggregate({
        _sum: { commission: true },
        where: scoped({ status: 'success' }),
      }),
    ]);

    let row_wallet_rollups: { checks_out: number; doesnt_check: number } | undefined;
    const row_wallet_rollups_capped =
      allowWalletDevTools && total > this.MAX_TX_ROW_WALLET_SCAN;

    if (allowWalletDevTools) {
      if (lightScan.length > 0) {
        let ok = 0;
        let bad = 0;
        for (const row of lightScan) {
          const s = txnRowWalletIntegrity(row);
          if (s === 'ok') ok++;
          else bad++;
        }
        row_wallet_rollups = { checks_out: ok, doesnt_check: bad };
      } else if (total === 0) {
        row_wallet_rollups = { checks_out: 0, doesnt_check: 0 };
      }
    }

    let listTotal = total;
    let transactions: TxListRow[];

    if (integrityFilter) {
      const filtered = lightScan.filter((row) => {
        const s = txnRowWalletIntegrity(row);
        return integrityFilter === 'ok' ? s === 'ok' : s !== 'ok';
      });
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      listTotal = filtered.length;
      const pageIds = filtered.slice(skip, skip + limit).map((r) => r.id);
      transactions =
        pageIds.length === 0
          ? []
          : await this.prisma.transactionHistory.findMany({
              where: { id: { in: pageIds } },
              select: TX_LIST_SELECT,
            });
      const orderIndex = new Map(pageIds.map((id, i) => [id, i]));
      transactions.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
    } else {
      transactions = await this.prisma.transactionHistory.findMany({
        where,
        select: TX_LIST_SELECT,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      });
    }

    // Batch-fetch related users
    const userIds = [...new Set(transactions.map((t) => t.user_id))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: USER_BRIEF_SELECT,
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = transactions.map((tx) => ({
      ...tx,
      commission_smipay_earned: tx.commission ?? null,
      user: userMap.get(tx.user_id) ?? null,
    }));

    const formatGroup = (items: any[]) => {
      const result: Record<string, { count: number; volume: number }> = {};
      for (const item of items) {
        const key = Object.values(item).find((v) => typeof v === 'string') as string;
        result[key ?? 'unknown'] = {
          count: item._count,
          volume: item._sum?.amount ?? 0,
        };
      }
      return result;
    };

    const thisMonthVol = monthVolume._sum.amount ?? 0;
    const prevMonthVol = prevMonthVolume._sum.amount ?? 0;
    const volumeGrowthPercent =
      prevMonthVol > 0
        ? Math.round(((thisMonthVol - prevMonthVol) / prevMonthVol) * 100)
        : thisMonthVol > 0
          ? 100
          : 0;

    return new ApiResponseDto(true, 'Transactions fetched', {
      analytics: {
        overview: {
          total_transactions: total,
          total_volume: successVolume._sum.amount ?? 0,
          total_revenue: totalRevenue._sum.markup_value ?? 0,
          vtpass_commission: totalCommission._sum.commission ?? 0,
          total_revenue_including_commission:
            (totalRevenue._sum.markup_value ?? 0) + (totalCommission._sum.commission ?? 0),
          avg_amount: avgStats._avg.amount ?? 0,
          min_amount: avgStats._min.amount ?? 0,
          max_amount: avgStats._max.amount ?? 0,
        },
        activity: {
          today_count: todayCount,
          today_volume: todayVolume._sum.amount ?? 0,
          week_count: weekCount,
          week_volume: weekVolume._sum.amount ?? 0,
          month_count: monthCount,
          month_volume: thisMonthVol,
          volume_growth_percent: volumeGrowthPercent,
        },
        by_status: formatGroup(byStatus),
        by_type: formatGroup(byType),
        by_channel: formatGroup(byChannel),
        ...(allowWalletDevTools && row_wallet_rollups ? { row_wallet_rollups } : {}),
        ...(allowWalletDevTools && row_wallet_rollups_capped ? { row_wallet_rollups_capped: true } : {}),
      },
      transactions: enriched,
      meta: {
        total: listTotal,
        page,
        limit,
        total_pages: Math.ceil(listTotal / limit),
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // DETAIL — Single transaction with full context
  // ──────────────────────────────────────────────────────────

  async getTransactionById(transactionId: string) {
    const transaction = await this.prisma.transactionHistory.findUnique({
      where: { id: transactionId },
      select: TX_DETAIL_SELECT,
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    const user = await this.prisma.user.findUnique({
      where: { id: transaction.user_id },
      select: {
        ...USER_BRIEF_SELECT,
        tier: { select: { tier: true, name: true } },
      },
    });

    let wallet_analysis: WalletAnalysisDto | null = null;
    try {
      wallet_analysis = await this.walletIntegrity.getWalletAnalysis(transaction.user_id);
    } catch (e: any) {
      this.logger.warn(`Wallet analysis for tx ${transactionId}: ${e?.message}`);
    }

    // If transfer via smipay_tag, fetch the counterpart transaction
    let counterpart: Record<string, any> | null = null;
    if (
      transaction.payment_channel === 'smipay_tag' &&
      transaction.transaction_reference
    ) {
      const baseRef = transaction.transaction_reference.replace(/-R$/, '');
      const isRecipient = transaction.transaction_reference.endsWith('-R');
      const counterpartRef = isRecipient ? baseRef : `${baseRef}-R`;
      const counterpartTx = await this.prisma.transactionHistory.findFirst({
        where: { transaction_reference: counterpartRef },
        select: {
          id: true,
          user_id: true,
          amount: true,
          credit_debit: true,
          balance_before: true,
          balance_after: true,
          status: true,
        },
      });
      if (counterpartTx) {
        const counterpartUser = await this.prisma.user.findUnique({
          where: { id: counterpartTx.user_id },
          select: { first_name: true, last_name: true, email: true, smipay_tag: true },
        });
        counterpart = { ...counterpartTx, user: counterpartUser };
      }
    }

    // this.logger.log(`Transaction fetched: ${JSON.stringify(transaction, null, 2)}`);

    return new ApiResponseDto(true, 'Transaction fetched', {
      ...transaction,
      commission_smipay_earned: transaction.commission ?? null,
      user,
      counterpart,
      wallet_analysis,
    });
  }

  // ──────────────────────────────────────────────────────────
  // USER TRANSACTIONS — All transactions for a specific user
  // ──────────────────────────────────────────────────────────

  async getUserTransactions(
    userId: string,
    query: QueryTransactionsDto,
    requester?: { email?: string | null } | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, first_name: true, last_name: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const overrideQuery = { ...query, user_id: userId };
    return this.listTransactions(overrideQuery, requester);
  }

  // ──────────────────────────────────────────────────────────
  // TIMELINE — Hourly/daily volume for charts
  // ──────────────────────────────────────────────────────────

  async getTransactionTimeline(query: TransactionStatsQueryDto) {
    const dateFrom = query.date_from ? new Date(query.date_from) : this.daysAgo(30);
    const dateTo = query.date_to ? new Date(query.date_to) : new Date();

    const diffDays = Math.ceil(
      (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24),
    );
    const groupByHour = diffDays <= 2;

    const raw: any[] = await this.prisma.$queryRaw`
      SELECT
        ${groupByHour
          ? Prisma.sql`DATE_TRUNC('hour', "createdAt")`
          : Prisma.sql`DATE_TRUNC('day', "createdAt")`
        } AS bucket,
        COUNT(*)::int AS count,
        COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0)::float AS volume,
        COUNT(CASE WHEN status = 'success' THEN 1 END)::int AS success_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::int AS failed_count
      FROM "TransactionHistory"
      WHERE "createdAt" >= ${dateFrom}
        AND "createdAt" <= ${dateTo}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    return new ApiResponseDto(true, 'Transaction timeline fetched', {
      period: groupByHour ? 'hourly' : 'daily',
      date_from: dateFrom.toISOString(),
      date_to: dateTo.toISOString(),
      data: raw.map((r) => ({
        timestamp: r.bucket,
        count: r.count,
        volume: r.volume,
        success_count: r.success_count,
        failed_count: r.failed_count,
      })),
    });
  }

  // ──────────────────────────────────────────────────────────
  // FLAGGING — Flag suspicious transaction for review
  // ──────────────────────────────────────────────────────────

  async flagTransaction(transactionId: string, reason: string, adminUser: any, req: any) {
    const tx = await this.prisma.transactionHistory.findUnique({
      where: { id: transactionId },
      select: { id: true, transaction_reference: true, amount: true, user_id: true, status: true },
    });

    if (!tx) throw new NotFoundException('Transaction not found');

    this.auditLogService.logAdmin(
      AuditAction.AUDIT_LOG_FLAG,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin flagged transaction ${tx.transaction_reference} for review: ${reason}`,
        resource_type: 'TransactionHistory',
        resource_id: transactionId,
        amount: tx.amount ?? undefined,
        transaction_ref: tx.transaction_reference ?? undefined,
        metadata: { reason, user_id: tx.user_id, status: tx.status },
      },
    );

    return new ApiResponseDto(true, 'Transaction flagged for review');
  }

  // ──────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────

  private buildWhereClause(query: QueryTransactionsDto): Prisma.TransactionHistoryWhereInput {
    const where: Prisma.TransactionHistoryWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { transaction_reference: { contains: term, mode: 'insensitive' } },
        { transaction_number: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { recipient_mobile: { contains: term } },
        { session_id: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.transaction_type) where.transaction_type = query.transaction_type;
    if (query.credit_debit) where.credit_debit = query.credit_debit;
    if (query.payment_channel) where.payment_channel = query.payment_channel;
    if (query.user_id) where.user_id = query.user_id;

    if (query.min_amount || query.max_amount) {
      where.amount = {};
      if (query.min_amount) where.amount.gte = parseFloat(query.min_amount);
      if (query.max_amount) where.amount.lte = parseFloat(query.max_amount);
    }

    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) where.createdAt.gte = new Date(query.date_from);
      if (query.date_to) where.createdAt.lte = new Date(query.date_to);
    }

    return where;
  }

  private daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}

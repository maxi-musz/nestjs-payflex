import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma, AuditAction, AuditActorType, AuditStatus, AuditSeverity } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseEnvBool(v: string | undefined, whenUnset: boolean): boolean {
  if (v === undefined || v === '') return whenUnset;
  return v === '1' || v.toLowerCase() === 'true';
}

/** Single-user ledger row (same rules as wallet-cashback-aggregate-reconcile.ts). */
type MainLedgerUserRow = {
  credits_total: number;
  debits_total: number;
  deposit_credits: number;
  referral_bonus_total: number;
  first_tx_bonus_total: number;
};

type CashbackLedgerUserRow = {
  earned_credited: number;
  earned_reversed: number;
  cashback_used_success: number;
};

export type WalletAnalysisCashbackDto = {
  current_balance: number;
  all_time_earned: number;
  all_time_withdrawn: number;
  earned_net: number;
  withdrawn_from_success_tx: number;
  expected_balance: number;
  balance_delta: number;
  stored_invariant: number;
  tx_anomaly: boolean;
  ok: boolean;
};

export type WalletAnalysisDto = {
  /** Admin adjusted balances — auto-suspend is not applied for this user. */
  enforcement_skipped: boolean;
  enforcement_skip_reason?: string;
  tolerance_ngn: number;
  main: {
    current_balance: number;
    all_time_fuunding: number;
    all_time_withdrawn: number;
    ledger_credits_total: number;
    ledger_debits_total: number;
    expected_balance: number;
    balance_delta: number;
    stored_invariant: number;
    deposit_credits_total: number;
    referral_bonus_total: number;
    first_tx_bonus_total: number;
    ok: boolean;
  };
  cashback: WalletAnalysisCashbackDto | null;
};

@Injectable()
export class WalletIntegrityService {
  private readonly logger = new Logger(WalletIntegrityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private tolerance(): number {
    const t = parseFloat(process.env.WALLET_INTEGRITY_TOLERANCE_NGN || '2');
    return Number.isFinite(t) && t >= 0 ? t : 2;
  }

  /** When unset, off (safe rollout). Set WALLET_INTEGRITY_ENFORCE_ON_PURCHASE=true to enable. */
  enforceOnPurchase(): boolean {
    return parseEnvBool(process.env.WALLET_INTEGRITY_ENFORCE_ON_PURCHASE, false);
  }

  /** Which checks failed (for logs + audit). */
  private buildFailureReasons(analysis: WalletAnalysisDto): string[] {
    const tol = analysis.tolerance_ngn;
    const out: string[] = [];
    const m = analysis.main;

    if (Math.abs(m.balance_delta) > tol) {
      out.push(
        `MAIN balance: stored current_balance=${m.current_balance} but success-ledger implies ${m.expected_balance} (delta ${m.balance_delta}, tol ±${tol})`,
      );
    }
    if (Math.abs(m.stored_invariant) > tol) {
      out.push(
        `MAIN invariant: balance+all_time_withdrawn-all_time_fuunding=${m.stored_invariant} (expected ~0 within ±${tol})`,
      );
    }
    if (Math.abs(m.all_time_fuunding - m.ledger_credits_total) > tol) {
      out.push(
        `MAIN all_time_fuunding=${m.all_time_fuunding} vs ledger success credits sum=${m.ledger_credits_total} (diff ${round2(m.all_time_fuunding - m.ledger_credits_total)})`,
      );
    }
    if (Math.abs(m.all_time_withdrawn - m.ledger_debits_total) > tol) {
      out.push(
        `MAIN all_time_withdrawn=${m.all_time_withdrawn} vs ledger success debits sum=${m.ledger_debits_total} (diff ${round2(m.all_time_withdrawn - m.ledger_debits_total)})`,
      );
    }

    const c = analysis.cashback;
    if (c && !c.ok) {
      if (c.tx_anomaly) {
        out.push(
          `CASHBACK anomaly: cashback used on success txs (${c.withdrawn_from_success_tx}) > earned net (${c.earned_net})`,
        );
      }
      if (Math.abs(c.balance_delta) > tol) {
        out.push(
          `CASHBACK balance: stored=${c.current_balance} vs expected=${c.expected_balance} (delta ${c.balance_delta})`,
        );
      }
      if (Math.abs(c.stored_invariant) > tol) {
        out.push(
          `CASHBACK invariant: balance+withdrawn-earned=${c.stored_invariant} (expected ~0 within ±${tol})`,
        );
      }
      if (Math.abs(c.all_time_earned - c.earned_net) > tol) {
        out.push(
          `CASHBACK all_time_earned=${c.all_time_earned} vs history net=${c.earned_net}`,
        );
      }
      if (Math.abs(c.all_time_withdrawn - c.withdrawn_from_success_tx) > tol) {
        out.push(
          `CASHBACK all_time_withdrawn=${c.all_time_withdrawn} vs sum cashback_used on success txs=${c.withdrawn_from_success_tx}`,
        );
      }
    }

    if (out.length === 0) {
      out.push('Mismatch flagged (main_ok/cashback_ok false) — see full analysis snapshot in metadata.');
    }
    return out;
  }

  async userTouchedByAdminBalanceAdjust(userId: string): Promise<boolean> {
    const w = await this.prisma.auditLog.count({
      where: { action: 'ADMIN_USER_WALLET_ADJUST', resource_id: userId },
    });
    if (w > 0) return true;
    const c = await this.prisma.auditLog.count({
      where: { action: 'ADMIN_USER_CASHBACK_ADJUST', resource_id: userId },
    });
    return c > 0;
  }

  private async loadMainLedgerForUser(userId: string): Promise<MainLedgerUserRow> {
    const rows = await this.prisma.$queryRaw<MainLedgerUserRow[]>(Prisma.sql`
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN t.credit_debit = 'credit'::"CreditDebit"
              AND t.status = 'success'::"TransactionStatus"
              THEN COALESCE(t.amount, 0)
              ELSE 0
            END
          ),
          0
        )::double precision AS credits_total,
        COALESCE(
          SUM(
            CASE
              WHEN t.credit_debit = 'debit'::"CreditDebit"
              AND t.status = 'success'::"TransactionStatus"
              THEN COALESCE(t.amount, 0)
              ELSE 0
            END
          ),
          0
        )::double precision AS debits_total,
        COALESCE(
          SUM(
            CASE
              WHEN t.credit_debit = 'credit'::"CreditDebit"
              AND t.status = 'success'::"TransactionStatus"
              AND t.transaction_type = 'deposit'::"TransactionType"
              THEN COALESCE(t.amount, 0)
              ELSE 0
            END
          ),
          0
        )::double precision AS deposit_credits,
        COALESCE(
          SUM(
            CASE
              WHEN t.credit_debit = 'credit'::"CreditDebit"
              AND t.status = 'success'::"TransactionStatus"
              AND t.transaction_type = 'referral_bonus'::"TransactionType"
              THEN COALESCE(t.amount, 0)
              ELSE 0
            END
          ),
          0
        )::double precision AS referral_bonus_total,
        COALESCE(
          SUM(
            CASE
              WHEN t.credit_debit = 'credit'::"CreditDebit"
              AND t.status = 'success'::"TransactionStatus"
              AND t.transaction_type = 'first_tx_bonus'::"TransactionType"
              THEN COALESCE(t.amount, 0)
              ELSE 0
            END
          ),
          0
        )::double precision AS first_tx_bonus_total
      FROM "TransactionHistory" t
      WHERE t.user_id::text = ${userId}
    `);
    const r = rows[0];
    return {
      credits_total: round2(Number(r?.credits_total ?? 0)),
      debits_total: round2(Number(r?.debits_total ?? 0)),
      deposit_credits: round2(Number(r?.deposit_credits ?? 0)),
      referral_bonus_total: round2(Number(r?.referral_bonus_total ?? 0)),
      first_tx_bonus_total: round2(Number(r?.first_tx_bonus_total ?? 0)),
    };
  }

  private async loadCashbackLedgerForUser(userId: string): Promise<CashbackLedgerUserRow> {
    const [hist, txu] = await Promise.all([
      this.prisma.$queryRaw<{ credited: number; reversed: number }[]>(Prisma.sql`
        SELECT
          COALESCE(
            SUM(CASE WHEN h.status = 'credited' THEN COALESCE(h.amount, 0) ELSE 0 END),
            0
          )::double precision AS credited,
          COALESCE(
            SUM(CASE WHEN h.status = 'reversed' THEN COALESCE(h.amount, 0) ELSE 0 END),
            0
          )::double precision AS reversed
        FROM "cashback_history" h
        WHERE h.user_id::text = ${userId}
      `),
      this.prisma.$queryRaw<{ cashback_used: number }[]>(Prisma.sql`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN t.status = 'success'::"TransactionStatus"
                AND COALESCE(t.cashback_used, 0) > 0
                THEN t.cashback_used::double precision
                ELSE 0
              END
            ),
            0
          )::double precision AS cashback_used
        FROM "TransactionHistory" t
        WHERE t.user_id::text = ${userId}
      `),
    ]);
    const h = hist[0];
    const t = txu[0];
    return {
      earned_credited: round2(Number(h?.credited ?? 0)),
      earned_reversed: round2(Number(h?.reversed ?? 0)),
      cashback_used_success: round2(Number(t?.cashback_used ?? 0)),
    };
  }

  /** Full snapshot for admin UI; includes whether auto-enforcement would skip this user. */
  async getWalletAnalysis(userId: string): Promise<WalletAnalysisDto> {
    const tol = this.tolerance();
    const adminAdjusted = await this.userTouchedByAdminBalanceAdjust(userId);

    const [wallet, cbWallet, L] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { user_id: userId } }),
      this.prisma.cashbackWallet.findUnique({ where: { user_id: userId } }),
      this.loadMainLedgerForUser(userId),
    ]);

    const storedBal = round2(Number(wallet?.current_balance ?? 0));
    const storedFund = round2(Number(wallet?.all_time_fuunding ?? 0));
    const storedOut = round2(Number(wallet?.all_time_withdrawn ?? 0));
    const expectedBal = round2(Math.max(0, L.credits_total - L.debits_total));
    const balanceDelta = round2(expectedBal - storedBal);
    const storedInvariant = round2(storedBal + storedOut - storedFund);
    const mainOk =
      Math.abs(balanceDelta) <= tol &&
      Math.abs(storedInvariant) <= tol &&
      Math.abs(storedFund - L.credits_total) <= tol &&
      Math.abs(storedOut - L.debits_total) <= tol;

    let cashbackBlock: WalletAnalysisCashbackDto | null = null;
    if (cbWallet) {
      const C = await this.loadCashbackLedgerForUser(userId);
      const earnedNet = round2(C.earned_credited - C.earned_reversed);
      const withdrawnTx = round2(C.cashback_used_success);
      const expectedCbBal = round2(Math.max(0, earnedNet - withdrawnTx));
      const sB = round2(Number(cbWallet.current_balance));
      const sE = round2(Number(cbWallet.all_time_earned));
      const sW = round2(Number(cbWallet.all_time_withdrawn));
      const invS = round2(sB + sW - sE);
      const txAnomaly = withdrawnTx > earnedNet + tol;
      const cbOk =
        !txAnomaly &&
        Math.abs(round2(expectedCbBal - sB)) <= tol &&
        Math.abs(round2(earnedNet - sE)) <= tol &&
        Math.abs(round2(withdrawnTx - sW)) <= tol &&
        Math.abs(invS) <= tol;

      cashbackBlock = {
        current_balance: sB,
        all_time_earned: sE,
        all_time_withdrawn: sW,
        earned_net: earnedNet,
        withdrawn_from_success_tx: withdrawnTx,
        expected_balance: expectedCbBal,
        balance_delta: round2(expectedCbBal - sB),
        stored_invariant: invS,
        tx_anomaly: txAnomaly,
        ok: cbOk,
      };
    }

    return {
      enforcement_skipped: adminAdjusted,
      enforcement_skip_reason: adminAdjusted
        ? 'Admin wallet/cashback adjustments on file — purchase auto-suspend is skipped.'
        : undefined,
      tolerance_ngn: tol,
      main: {
        current_balance: storedBal,
        all_time_fuunding: storedFund,
        all_time_withdrawn: storedOut,
        ledger_credits_total: L.credits_total,
        ledger_debits_total: L.debits_total,
        expected_balance: expectedBal,
        balance_delta: balanceDelta,
        stored_invariant: storedInvariant,
        deposit_credits_total: L.deposit_credits,
        referral_bonus_total: L.referral_bonus_total,
        first_tx_bonus_total: L.first_tx_bonus_total,
        ok: mainOk,
      },
      cashback: cashbackBlock,
    };
  }

  /**
   * Call at VTpass purchase entry: optional suspend + block if ledger vs stored wallet diverges.
   */
  async assertWalletIntegrityForPurchase(userId: string): Promise<void> {
    if (!this.enforceOnPurchase()) return;

    const analysis = await this.getWalletAnalysis(userId);
    if (analysis.enforcement_skipped) return;

    const mainBad = !analysis.main.ok;
    const cbBad = analysis.cashback && !analysis.cashback.ok;
    if (!mainBad && !cbBad) return;

    const failureReasons = this.buildFailureReasons(analysis);
    const summaryLine = failureReasons.join(' | ');
    const errorMessage =
      summaryLine.length > 4000 ? `${summaryLine.slice(0, 3997)}...` : summaryLine;

    this.logger.error(
      [
        `[WALLET_INTEGRITY_SUSPEND] userId=${userId}`,
        `main_ok=${analysis.main.ok} cashback_ok=${analysis.cashback?.ok ?? 'n/a'} tolerance=±${analysis.tolerance_ngn}`,
        '--- reasons ---',
        ...failureReasons.map((r) => `  • ${r}`),
        '--- snapshot (main) ---',
        `  current_balance=${analysis.main.current_balance} expected_from_ledger=${analysis.main.expected_balance}`,
        `  all_time_fuunding=${analysis.main.all_time_fuunding} ledger_credits=${analysis.main.ledger_credits_total}`,
        `  all_time_withdrawn=${analysis.main.all_time_withdrawn} ledger_debits=${analysis.main.ledger_debits_total}`,
        analysis.cashback
          ? `--- snapshot (cashback) ---\n  balance=${analysis.cashback.current_balance} expected=${analysis.cashback.expected_balance} ok=${analysis.cashback.ok}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { account_status: 'suspended' },
    });

    await this.auditLogService.log({
      user_id: userId,
      actor_type: AuditActorType.SYSTEM,
      action: AuditAction.WALLET_BALANCE_CHECK,
      status: AuditStatus.FAILURE,
      severity: AuditSeverity.CRITICAL,
      resource_type: 'User',
      resource_id: userId,
      description: `Account suspended: WALLET_LEDGER_MISMATCH — ${failureReasons[0] ?? 'see metadata'}`,
      error_message: errorMessage,
      metadata: {
        reason: 'WALLET_LEDGER_MISMATCH',
        failure_reasons: failureReasons,
        analysis,
      } as any,
    });

    throw new ForbiddenException(
      'Your account is temporarily restricted. Please contact support.',
    );
  }
}

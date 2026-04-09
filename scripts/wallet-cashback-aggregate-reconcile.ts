/**
 * Align main Wallet + CashbackWallet aggregates with ledger-derived sums.
 *
 * Main wallet (matches product + wallet-ledger-reconcile --sync-aggregates):
 *   - Confirms deposits: sum(success credits, transaction_type = deposit).
 *   - Confirms “purchase” outflows: sum(success debits, VTU types).
 *   - Bank / internal outflows: sum(success debits, transaction_type = transfer).
 *   - Source of truth for stored counters: ALL success credits / ALL success debits
 *     (includes referral_bonus, first_tx_bonus, refunds-as-credit, etc.).
 *   Invariant after sync: current_balance ≈ credits_total − debits_total
 *   and all_time_fuunding / all_time_withdrawn match those totals so
 *   balance + withdrawn ≈ funding (within rounding).
 *
 * Cashback wallet:
 *   - all_time_earned from CashbackHistory (credited − reversed).
 *   - all_time_withdrawn from sum(cashback_used) on successful TransactionHistory rows.
 *   - current_balance = max(0, earned_net − withdrawn_from_tx).
 *   If sum(cashback_used) > earned_net (impossible), the row is flagged cashback_tx_anomaly and
 *   --apply will not write cashback fields for that user (needs manual review).
 *
 * Usage (from backend/, after DB backup):
 *   npx ts-node --transpile-only scripts/wallet-cashback-aggregate-reconcile.ts
 *   npx ts-node --transpile-only scripts/wallet-cashback-aggregate-reconcile.ts --apply
 *   npx ts-node --transpile-only scripts/wallet-cashback-aggregate-reconcile.ts --apply --include-admin-adjusted
 *
 * Flags:
 *   --apply                    Write corrections (default: dry-run).
 *   --include-admin-adjusted   Also touch users with ADMIN_USER_WALLET_ADJUST audit rows.
 *   --min-diff N               Only log users where any delta > N (default: 0).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Prisma, PrismaClient } from '@prisma/client';

function loadEnvFile() {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('#') || !line.trim()) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

const prisma = new PrismaClient();

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let apply = false;
  let skipAdminAdjusted = true;
  let minDiff = 0;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') apply = true;
    if (argv[i] === '--include-admin-adjusted') skipAdminAdjusted = false;
    if (argv[i] === '--min-diff' && argv[i + 1]) minDiff = Number(argv[++i]) || 0;
  }
  return { apply, skipAdminAdjusted, minDiff };
}

async function loadAdminAdjustedUserIds(): Promise<Set<string>> {
  const rows = await prisma.auditLog.groupBy({
    by: ['resource_id'],
    where: {
      action: 'ADMIN_USER_WALLET_ADJUST',
      resource_id: { not: null },
    },
  });
  return new Set(
    rows.map((r) => r.resource_id).filter((id): id is string => Boolean(id)),
  );
}

type MainLedgerRow = {
  user_id: string;
  credits_total: number;
  debits_total: number;
  deposit_credits: number;
  bonus_credits: number;
  purchase_debits: number;
  transfer_debits: number;
  other_credit: number;
  other_debit: number;
};

async function loadMainLedgerBreakdown(): Promise<Map<string, MainLedgerRow>> {
  const rows = await prisma.$queryRaw<MainLedgerRow[]>(Prisma.sql`
    SELECT
      t.user_id::text AS user_id,
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
            AND t.transaction_type IN (
              'referral_bonus'::"TransactionType",
              'first_tx_bonus'::"TransactionType"
            )
            THEN COALESCE(t.amount, 0)
            ELSE 0
          END
        ),
        0
      )::double precision AS bonus_credits,
      COALESCE(
        SUM(
          CASE
            WHEN t.credit_debit = 'debit'::"CreditDebit"
            AND t.status = 'success'::"TransactionStatus"
            AND t.transaction_type IN (
              'airtime'::"TransactionType",
              'data'::"TransactionType",
              'cable'::"TransactionType",
              'electricity'::"TransactionType",
              'education'::"TransactionType",
              'betting'::"TransactionType"
            )
            THEN COALESCE(t.amount, 0)
            ELSE 0
          END
        ),
        0
      )::double precision AS purchase_debits,
      COALESCE(
        SUM(
          CASE
            WHEN t.credit_debit = 'debit'::"CreditDebit"
            AND t.status = 'success'::"TransactionStatus"
            AND t.transaction_type = 'transfer'::"TransactionType"
            THEN COALESCE(t.amount, 0)
            ELSE 0
          END
        ),
        0
      )::double precision AS transfer_debits,
      COALESCE(
        SUM(
          CASE
            WHEN t.credit_debit = 'credit'::"CreditDebit"
            AND t.status = 'success'::"TransactionStatus"
            AND (
              t.transaction_type IS NULL
              OR t.transaction_type NOT IN (
                'deposit'::"TransactionType",
                'referral_bonus'::"TransactionType",
                'first_tx_bonus'::"TransactionType"
              )
            )
            THEN COALESCE(t.amount, 0)
            ELSE 0
          END
        ),
        0
      )::double precision AS other_credit,
      COALESCE(
        SUM(
          CASE
            WHEN t.credit_debit = 'debit'::"CreditDebit"
            AND t.status = 'success'::"TransactionStatus"
            AND (
              t.transaction_type IS NULL
              OR t.transaction_type NOT IN (
                'airtime'::"TransactionType",
                'data'::"TransactionType",
                'cable'::"TransactionType",
                'electricity'::"TransactionType",
                'education'::"TransactionType",
                'betting'::"TransactionType",
                'transfer'::"TransactionType"
              )
            )
            THEN COALESCE(t.amount, 0)
            ELSE 0
          END
        ),
        0
      )::double precision AS other_debit
    FROM "TransactionHistory" t
    GROUP BY t.user_id
  `);

  const map = new Map<string, MainLedgerRow>();
  for (const r of rows) {
    map.set(r.user_id, {
      user_id: r.user_id,
      credits_total: round2(Number(r.credits_total)),
      debits_total: round2(Number(r.debits_total)),
      deposit_credits: round2(Number(r.deposit_credits)),
      bonus_credits: round2(Number(r.bonus_credits)),
      purchase_debits: round2(Number(r.purchase_debits)),
      transfer_debits: round2(Number(r.transfer_debits)),
      other_credit: round2(Number(r.other_credit)),
      other_debit: round2(Number(r.other_debit)),
    });
  }
  return map;
}

type CashbackLedgerRow = {
  user_id: string;
  earned_credited: number;
  earned_reversed: number;
  cashback_used_success: number;
};

async function loadCashbackLedger(): Promise<Map<string, CashbackLedgerRow>> {
  const [histRows, txRows] = await Promise.all([
    prisma.$queryRaw<
      { user_id: string; credited: number; reversed: number }[]
    >(Prisma.sql`
      SELECT
        h.user_id::text AS user_id,
        COALESCE(
          SUM(CASE WHEN h.status = 'credited' THEN COALESCE(h.amount, 0) ELSE 0 END),
          0
        )::double precision AS credited,
        COALESCE(
          SUM(CASE WHEN h.status = 'reversed' THEN COALESCE(h.amount, 0) ELSE 0 END),
          0
        )::double precision AS reversed
      FROM "cashback_history" h
      GROUP BY h.user_id
    `),
    prisma.$queryRaw<{ user_id: string; cashback_used: number }[]>(Prisma.sql`
      SELECT
        t.user_id::text AS user_id,
        COALESCE(
          SUM(CASE
            WHEN t.status = 'success'::"TransactionStatus"
            AND COALESCE(t.cashback_used, 0) > 0
            THEN t.cashback_used::double precision
            ELSE 0
          END),
          0
        )::double precision AS cashback_used
      FROM "TransactionHistory" t
      GROUP BY t.user_id
    `),
  ]);

  const map = new Map<string, CashbackLedgerRow>();
  for (const r of histRows) {
    map.set(r.user_id, {
      user_id: r.user_id,
      earned_credited: round2(Number(r.credited)),
      earned_reversed: round2(Number(r.reversed)),
      cashback_used_success: 0,
    });
  }
  for (const r of txRows) {
    const u = round2(Number(r.cashback_used));
    const existing = map.get(r.user_id);
    if (existing) existing.cashback_used_success = u;
    else map.set(r.user_id, {
      user_id: r.user_id,
      earned_credited: 0,
      earned_reversed: 0,
      cashback_used_success: u,
    });
  }
  return map;
}

function maxDelta(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): number {
  return Math.max(
    Math.abs(a),
    Math.abs(b),
    Math.abs(c),
    Math.abs(d),
    Math.abs(e),
    Math.abs(f),
  );
}

async function main() {
  const { apply, skipAdminAdjusted, minDiff } = parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  console.log(
    `Wallet + cashback aggregate reconcile | dryRun=${!apply} | skipAdminAdjusted=${skipAdminAdjusted} | minDiff=${minDiff}`,
  );

  const adminIds = skipAdminAdjusted ? await loadAdminAdjustedUserIds() : new Set<string>();
  const mainLedger = await loadMainLedgerBreakdown();
  const cbLedger = await loadCashbackLedger();

  const wallets = await prisma.wallet.findMany({
    select: {
      id: true,
      user_id: true,
      current_balance: true,
      all_time_fuunding: true,
      all_time_withdrawn: true,
    },
  });

  const cashbackWallets = await prisma.cashbackWallet.findMany({
    select: {
      id: true,
      user_id: true,
      current_balance: true,
      all_time_earned: true,
      all_time_withdrawn: true,
    },
  });
  const cbByUser = new Map(cashbackWallets.map((c) => [c.user_id, c]));

  type Row = {
    user_id: string;
    main: {
      stored_balance: number;
      stored_funding: number;
      stored_withdrawn: number;
      credits_total: number;
      debits_total: number;
      expected_balance: number;
      deposit_credits: number;
      purchase_debits: number;
      transfer_debits: number;
      bonus_credits: number;
      other_credit: number;
      other_debit: number;
      invariant_stored: number;
      invariant_ledger: number;
      action: string;
    };
    cashback: null | {
      stored_balance: number;
      stored_earned: number;
      stored_withdrawn: number;
      earned_net: number;
      withdrawn_from_tx: number;
      expected_balance: number;
      invariant_stored: number;
      invariant_ledger: number;
      cashback_tx_anomaly: boolean;
      action: string;
    };
  };

  const results: Row[] = [];

  for (const w of wallets) {
    const L = mainLedger.get(w.user_id) ?? {
      user_id: w.user_id,
      credits_total: 0,
      debits_total: 0,
      deposit_credits: 0,
      bonus_credits: 0,
      purchase_debits: 0,
      transfer_debits: 0,
      other_credit: 0,
      other_debit: 0,
    };

    const storedBal = round2(Number(w.current_balance));
    const storedFund = round2(Number(w.all_time_fuunding));
    const storedOut = round2(Number(w.all_time_withdrawn));
    const expectedBal = round2(Math.max(0, L.credits_total - L.debits_total));

    const invariantStored = round2(storedBal + storedOut - storedFund);
    const invariantLedger = round2(expectedBal + L.debits_total - L.credits_total);

    const dBal = round2(expectedBal - storedBal);
    const dFund = round2(L.credits_total - storedFund);
    const dOut = round2(L.debits_total - storedOut);

    const mainDelta = maxDelta(dBal, dFund, dOut, invariantStored, 0, 0);

    let mainAction = 'ok';
    if (skipAdminAdjusted && adminIds.has(w.user_id)) {
      mainAction = 'skipped_admin_adjusted';
    } else if (mainDelta > minDiff) {
      mainAction = apply ? 'updated' : 'would_update';
    }

    const cbWallet = cbByUser.get(w.user_id);
    let cashbackBlock: Row['cashback'] = null;

    if (cbWallet) {
      const C = cbLedger.get(w.user_id) ?? {
        user_id: w.user_id,
        earned_credited: 0,
        earned_reversed: 0,
        cashback_used_success: 0,
      };
      const earnedNet = round2(C.earned_credited - C.earned_reversed);
      const withdrawnTx = round2(C.cashback_used_success);
      const expectedCbBal = round2(Math.max(0, earnedNet - withdrawnTx));

      const sB = round2(Number(cbWallet.current_balance));
      const sE = round2(Number(cbWallet.all_time_earned));
      const sW = round2(Number(cbWallet.all_time_withdrawn));

      const invS = round2(sB + sW - sE);
      const invL = round2(expectedCbBal + withdrawnTx - earnedNet);
      const cashbackTxAnomaly = withdrawnTx > earnedNet + 0.02;

      const dCB = round2(expectedCbBal - sB);
      const dCE = round2(earnedNet - sE);
      const dCW = round2(withdrawnTx - sW);
      const cbDelta = maxDelta(dCB, dCE, dCW, invS, invL, 0);

      let cbAction = 'ok';
      if (skipAdminAdjusted && adminIds.has(w.user_id)) {
        cbAction = 'skipped_admin_adjusted';
      } else if (cashbackTxAnomaly) {
        cbAction = 'skipped_cashback_tx_anomaly';
      } else if (cbDelta > minDiff) {
        cbAction = apply ? 'updated' : 'would_update';
      }

      cashbackBlock = {
        stored_balance: sB,
        stored_earned: sE,
        stored_withdrawn: sW,
        earned_net: earnedNet,
        withdrawn_from_tx: withdrawnTx,
        expected_balance: expectedCbBal,
        invariant_stored: invS,
        invariant_ledger: invL,
        cashback_tx_anomaly: cashbackTxAnomaly,
        action: cbAction,
      };
    }

    const cbDeltaForInterest = cashbackBlock
      ? maxDelta(
          round2(cashbackBlock.expected_balance - cashbackBlock.stored_balance),
          round2(cashbackBlock.earned_net - cashbackBlock.stored_earned),
          round2(cashbackBlock.withdrawn_from_tx - cashbackBlock.stored_withdrawn),
          cashbackBlock.invariant_stored,
          cashbackBlock.invariant_ledger,
          0,
        )
      : 0;

    const anyInterest = mainDelta > minDiff || cbDeltaForInterest > minDiff;

    if (!anyInterest) continue;

    if (apply && mainAction === 'updated') {
      const newBal = expectedBal;
      await prisma.wallet.update({
        where: { id: w.id },
        data: {
          current_balance: newBal,
          balance_before: newBal,
          balance_after: newBal,
          all_time_fuunding: L.credits_total,
          all_time_withdrawn: L.debits_total,
        },
      });
    }

    if (
      apply &&
      cashbackBlock?.action === 'updated' &&
      !cashbackBlock.cashback_tx_anomaly &&
      cbWallet
    ) {
      const Cb = cbLedger.get(w.user_id) ?? {
        user_id: w.user_id,
        earned_credited: 0,
        earned_reversed: 0,
        cashback_used_success: 0,
      };
      const earnedNet = round2(Cb.earned_credited - Cb.earned_reversed);
      const withdrawnTx = round2(Cb.cashback_used_success);
      const newCbBal = round2(Math.max(0, earnedNet - withdrawnTx));
      await prisma.cashbackWallet.update({
        where: { id: cbWallet.id },
        data: {
          current_balance: newCbBal,
          all_time_earned: earnedNet,
          all_time_withdrawn: withdrawnTx,
        },
      });
    }

    results.push({
      user_id: w.user_id,
      main: {
        stored_balance: storedBal,
        stored_funding: storedFund,
        stored_withdrawn: storedOut,
        credits_total: L.credits_total,
        debits_total: L.debits_total,
        expected_balance: expectedBal,
        deposit_credits: L.deposit_credits,
        purchase_debits: L.purchase_debits,
        transfer_debits: L.transfer_debits,
        bonus_credits: L.bonus_credits,
        other_credit: L.other_credit,
        other_debit: L.other_debit,
        invariant_stored: invariantStored,
        invariant_ledger: invariantLedger,
        action: mainAction,
      },
      cashback: cashbackBlock,
    });
  }

  mkdirSync(join(__dirname, '..', 'backups'), { recursive: true });
  const logPath = join(
    __dirname,
    '..',
    'backups',
    `wallet-cashback-aggregate-reconcile-${Date.now()}.json`,
  );
  writeFileSync(
    logPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        apply,
        skipAdminAdjusted,
        minDiff,
        rowCount: results.length,
        rows: results,
      },
      null,
      2,
    ),
    'utf8',
  );

  const mainFix = results.filter((r) => r.main.action !== 'ok' && r.main.action !== 'skipped_admin_adjusted');
  const cbFix = results.filter(
    (r) =>
      r.cashback &&
      r.cashback.action !== 'ok' &&
      r.cashback.action !== 'skipped_admin_adjusted' &&
      r.cashback.action !== 'skipped_cashback_tx_anomaly',
  );
  const cbAnomaly = results.filter((r) => r.cashback?.cashback_tx_anomaly);

  console.log(`Users logged: ${results.length} (see ${logPath})`);
  console.log(`Main wallet needs align: ${mainFix.length}`);
  console.log(`Cashback wallet needs align: ${cbFix.length}`);
  console.log(`Cashback tx-sum > earned (skipped apply): ${cbAnomaly.length}`);
  for (const r of mainFix.slice(0, 30)) {
    console.log(JSON.stringify({ user_id: r.user_id, main: r.main }));
  }
  if (mainFix.length > 30) console.log(`... ${mainFix.length - 30} more main rows in log`);
  for (const r of cbFix.slice(0, 15)) {
    console.log(JSON.stringify({ user_id: r.user_id, cashback: r.cashback }));
  }
  if (cbFix.length > 15) console.log(`... ${cbFix.length - 15} more cashback rows in log`);
  if (cbAnomaly.length > 0) {
    console.log(
      'Cashback anomalies (sum(success cashback_used) > earned from history):',
      cbAnomaly.map((r) => r.user_id).join(', '),
    );
  }

  if (!apply && (mainFix.length > 0 || cbFix.length > 0)) {
    console.log('\nDry-run only. Re-run with --apply to write.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Enforce wallet accounting invariants using ledger-derived totals.
 *
 * Main wallet:
 *   all_time_fuunding  = sum(success credits) on TransactionHistory (deposits, referral_bonus,
 *                        first_tx_bonus, refunds-as-credit, etc.)
 *   all_time_withdrawn = sum of amounts that actually left the main wallet on success debits:
 *                        prefers meta_data.wallet_charged when present (VTpass split path),
 *                        else for VTU types amount - cashback_used, else full amount (transfers, etc.)
 *   effective_withdrawn = min(ledger_wallet_outflow, funding) when outflow exceeds credits
 *                         (ledger data inconsistent; funding stays source of truth).
 *   current_balance     = funding − effective_withdrawn  ⇒ balance + withdrawn = funding.
 *
 * Cashback wallet:
 *   all_time_earned     = CashbackHistory credited − reversed
 *   effective_withdrawn = min(sum(cashback_used on success), earned) when used > earned
 *   current_balance     = earned − effective_withdrawn   ⇒ balance + withdrawn = earned.
 *
 * Default: dry-run + JSON report under backups/. Use --apply to write (runs backup first unless --no-backup).
 *
 * Usage (from backend/, after reviewing output):
 *   npx ts-node --transpile-only scripts/wallet-invariant-reconcile.ts
 *   npx ts-node --transpile-only scripts/wallet-invariant-reconcile.ts --apply
 *   npx ts-node --transpile-only scripts/wallet-invariant-reconcile.ts --apply --no-backup
 *   npx ts-node --transpile-only scripts/wallet-invariant-reconcile.ts --include-admin-adjusted
 *   npx ts-node --transpile-only scripts/wallet-invariant-reconcile.ts --apply --force
 *     (--force = also reconcile users with ADMIN_USER_WALLET_ADJUST audit rows)
 */
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Prisma } from '@prisma/client';
import { createPrismaClient } from '../src/prisma/create-prisma-client';

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

const prisma = createPrismaClient();

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let apply = false;
  let noBackup = false;
  let skipAdminAdjusted = true;
  let forceIncludeAdmin = false;
  let minDiff = 0;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') apply = true;
    if (argv[i] === '--no-backup') noBackup = true;
    if (argv[i] === '--include-admin-adjusted') skipAdminAdjusted = false;
    if (argv[i] === '--force') {
      skipAdminAdjusted = false;
      forceIncludeAdmin = true;
    }
    if (argv[i] === '--min-diff' && argv[i + 1]) minDiff = Number(argv[++i]) || 0;
  }
  return { apply, noBackup, skipAdminAdjusted, forceIncludeAdmin, minDiff };
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

type MainLedgerInvariantRow = {
  user_id: string;
  credits_total: number;
  wallet_outflow_total: number;
};

async function loadMainLedgerInvariantRows(): Promise<Map<string, MainLedgerInvariantRow>> {
  const rows = await prisma.$queryRaw<MainLedgerInvariantRow[]>(Prisma.sql`
    SELECT
      t.user_id::text AS user_id,
      COALESCE(
        SUM(
          CASE
            WHEN t.credit_debit = 'credit'::"CreditDebit"
            AND t.status = 'success'::"TransactionStatus"
            THEN COALESCE(t.amount, 0)::double precision
            ELSE 0::double precision
          END
        ),
        0
      )::double precision AS credits_total,
      COALESCE(
        SUM(
          CASE
            WHEN t.credit_debit = 'debit'::"CreditDebit"
            AND t.status = 'success'::"TransactionStatus"
            THEN (
              CASE
                WHEN t.meta_data IS NOT NULL
                AND (t.meta_data::jsonb ? 'wallet_charged')
                AND NULLIF(TRIM(t.meta_data::jsonb->> 'wallet_charged'), '') IS NOT NULL
                THEN (NULLIF(TRIM(t.meta_data::jsonb->> 'wallet_charged'), '')::numeric)::double precision
                WHEN t.transaction_type IN (
                  'airtime'::"TransactionType",
                  'data'::"TransactionType",
                  'cable'::"TransactionType",
                  'electricity'::"TransactionType",
                  'education'::"TransactionType",
                  'betting'::"TransactionType"
                )
                THEN GREATEST(
                  0::double precision,
                  COALESCE(t.amount, 0)::double precision
                    - COALESCE(t.cashback_used, 0)::double precision
                )
                ELSE COALESCE(t.amount, 0)::double precision
              END
            )
            ELSE 0::double precision
          END
        ),
        0
      )::double precision AS wallet_outflow_total
    FROM "TransactionHistory" t
    GROUP BY t.user_id
  `);

  const map = new Map<string, MainLedgerInvariantRow>();
  for (const r of rows) {
    map.set(r.user_id, {
      user_id: r.user_id,
      credits_total: round2(Number(r.credits_total)),
      wallet_outflow_total: round2(Number(r.wallet_outflow_total)),
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
    else
      map.set(r.user_id, {
        user_id: r.user_id,
        earned_credited: 0,
        earned_reversed: 0,
        cashback_used_success: u,
      });
  }
  return map;
}

function maxDelta(...xs: number[]): number {
  return Math.max(...xs.map((x) => Math.abs(x)), 0);
}

function runBackup(): void {
  const backendRoot = join(__dirname, '..');
  console.log('Running logical backup (pg_dump via scripts/backup-database.sh) ...');
  execSync('bash scripts/backup-database.sh', {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

async function main() {
  const { apply, noBackup, skipAdminAdjusted, forceIncludeAdmin, minDiff } = parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  if (apply && !noBackup) {
    runBackup();
  } else if (apply && noBackup) {
    console.warn('WARNING: --apply with --no-backup (ensure you have a fresh backup).');
  }

  console.log(
    `Wallet invariant reconcile | dryRun=${!apply} | skipAdminAdjusted=${skipAdminAdjusted} | forceIncludeAdmin=${forceIncludeAdmin} | minDiff=${minDiff}`,
  );

  const adminIds = skipAdminAdjusted ? await loadAdminAdjustedUserIds() : new Set<string>();
  const mainLedger = await loadMainLedgerInvariantRows();
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
      ledger_funding: number;
      ledger_wallet_outflow: number;
      effective_withdrawn: number;
      main_outflow_capped: boolean;
      expected_balance: number;
      invariant_stored: number;
      invariant_expected: number;
      action: string;
    };
    cashback: null | {
      stored_balance: number;
      stored_earned: number;
      stored_withdrawn: number;
      earned_net: number;
      withdrawn_from_tx: number;
      effective_withdrawn: number;
      cashback_used_capped: boolean;
      expected_balance: number;
      invariant_stored: number;
      action: string;
    };
  };

  const results: Row[] = [];

  for (const w of wallets) {
    const L = mainLedger.get(w.user_id) ?? {
      user_id: w.user_id,
      credits_total: 0,
      wallet_outflow_total: 0,
    };

    const F = round2(L.credits_total);
    const Wout = round2(L.wallet_outflow_total);
    const withdrawnEffMain = round2(Math.min(F, Wout));
    const expectedBal = round2(F - withdrawnEffMain);
    const mainOutflowCapped = Wout > F + 0.02;

    const storedBal = round2(Number(w.current_balance));
    const storedFund = round2(Number(w.all_time_fuunding));
    const storedOut = round2(Number(w.all_time_withdrawn));

    const invariantStored = round2(storedBal + storedOut - storedFund);
    const invariantExpected = round2(expectedBal + withdrawnEffMain - F);

    const dBal = round2(expectedBal - storedBal);
    const dFund = round2(F - storedFund);
    const dOut = round2(withdrawnEffMain - storedOut);
    const mainDelta = maxDelta(dBal, dFund, dOut, invariantStored);

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
      const withdrawnEffCb = round2(Math.min(earnedNet, withdrawnTx));
      const expectedCbBal = round2(earnedNet - withdrawnEffCb);
      const cashbackUsedCapped = withdrawnTx > earnedNet + 0.02;

      const sB = round2(Number(cbWallet.current_balance));
      const sE = round2(Number(cbWallet.all_time_earned));
      const sW = round2(Number(cbWallet.all_time_withdrawn));

      const invS = round2(sB + sW - sE);

      const dCB = round2(expectedCbBal - sB);
      const dCE = round2(earnedNet - sE);
      const dCW = round2(withdrawnEffCb - sW);
      const cbDelta = maxDelta(dCB, dCE, dCW, invS);

      let cbAction = 'ok';
      if (skipAdminAdjusted && adminIds.has(w.user_id)) {
        cbAction = 'skipped_admin_adjusted';
      } else if (cbDelta > minDiff) {
        cbAction = apply ? 'updated' : 'would_update';
      }

      cashbackBlock = {
        stored_balance: sB,
        stored_earned: sE,
        stored_withdrawn: sW,
        earned_net: earnedNet,
        withdrawn_from_tx: withdrawnTx,
        effective_withdrawn: withdrawnEffCb,
        cashback_used_capped: cashbackUsedCapped,
        expected_balance: expectedCbBal,
        invariant_stored: invS,
        action: cbAction,
      };
    }

    const cbDeltaForInterest = cashbackBlock
      ? maxDelta(
          round2(cashbackBlock.expected_balance - cashbackBlock.stored_balance),
          round2(cashbackBlock.earned_net - cashbackBlock.stored_earned),
          round2(cashbackBlock.effective_withdrawn - cashbackBlock.stored_withdrawn),
          cashbackBlock.invariant_stored,
        )
      : 0;

    const anyInterest = mainDelta > minDiff || cbDeltaForInterest > minDiff;

    if (!anyInterest) continue;

    if (apply && mainAction === 'updated') {
      await prisma.wallet.update({
        where: { id: w.id },
        data: {
          current_balance: expectedBal,
          balance_before: expectedBal,
          balance_after: expectedBal,
          all_time_fuunding: F,
          all_time_withdrawn: withdrawnEffMain,
        },
      });
    }

    if (apply && cashbackBlock?.action === 'updated' && cbWallet) {
      const Cb = cbLedger.get(w.user_id)!;
      const earnedNet = round2(Cb.earned_credited - Cb.earned_reversed);
      const withdrawnTx = round2(Cb.cashback_used_success);
      const wEff = round2(Math.min(earnedNet, withdrawnTx));
      const newCbBal = round2(earnedNet - wEff);
      await prisma.cashbackWallet.update({
        where: { id: cbWallet.id },
        data: {
          current_balance: newCbBal,
          all_time_earned: earnedNet,
          all_time_withdrawn: wEff,
        },
      });
    }

    results.push({
      user_id: w.user_id,
      main: {
        stored_balance: storedBal,
        stored_funding: storedFund,
        stored_withdrawn: storedOut,
        ledger_funding: F,
        ledger_wallet_outflow: Wout,
        effective_withdrawn: withdrawnEffMain,
        main_outflow_capped: mainOutflowCapped,
        expected_balance: expectedBal,
        invariant_stored: invariantStored,
        invariant_expected: invariantExpected,
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
    `wallet-invariant-reconcile-${Date.now()}.json`,
  );
  writeFileSync(
    logPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        apply,
        noBackup,
        skipAdminAdjusted,
        forceIncludeAdmin,
        minDiff,
        rowCount: results.length,
        rows: results,
      },
      null,
      2,
    ),
    'utf8',
  );

  const mainFix = results.filter(
    (r) => r.main.action === 'would_update' || r.main.action === 'updated',
  );
  const mainSkippedAdmin = results.filter((r) => r.main.action === 'skipped_admin_adjusted');
  const mainCapped = results.filter(
    (r) => r.main.main_outflow_capped && (r.main.action === 'would_update' || r.main.action === 'updated'),
  );
  const cbFix = results.filter(
    (r) =>
      r.cashback &&
      (r.cashback.action === 'would_update' || r.cashback.action === 'updated'),
  );
  const cbSkippedAdmin = results.filter((r) => r.cashback?.action === 'skipped_admin_adjusted');
  const cbCapped = results.filter(
    (r) =>
      r.cashback?.cashback_used_capped &&
      (r.cashback?.action === 'would_update' || r.cashback?.action === 'updated'),
  );

  console.log(`Users logged: ${results.length} (see ${logPath})`);
  console.log(`Main wallet would update / updated: ${mainFix.length}`);
  console.log(`  (of those, main outflow capped to funding: ${mainCapped.length})`);
  console.log(`Main skipped (admin-adjusted users): ${mainSkippedAdmin.length}`);
  console.log(`Cashback wallet would update / updated: ${cbFix.length}`);
  console.log(`  (of those, cashback used capped to earned: ${cbCapped.length})`);
  console.log(`Cashback skipped (admin-adjusted users): ${cbSkippedAdmin.length}`);

  for (const r of mainFix.slice(0, 25)) {
    console.log(JSON.stringify({ user_id: r.user_id, main: r.main }));
  }
  if (mainFix.length > 25) console.log(`... ${mainFix.length - 25} more main rows in log`);

  for (const r of cbFix.slice(0, 15)) {
    console.log(JSON.stringify({ user_id: r.user_id, cashback: r.cashback }));
  }
  if (cbFix.length > 15) console.log(`... ${cbFix.length - 15} more cashback rows in log`);

  if (!apply && (mainFix.length > 0 || cbFix.length > 0)) {
    console.log('\nDry-run only. Re-run with --apply to write (backup runs automatically).');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

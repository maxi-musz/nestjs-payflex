/**
 * Reconcile main wallet balances against TransactionHistory (success credits − success debits).
 *
 * Only *reduces* inflated balances (phantom credits from duplicate refunds, etc.).
 * Never increases balance. Never sets balance below 0.
 *
 * Referral + first-tx rewards are already success *credit* rows → included in ledger credits.
 *
 * Usage (from backend/, after backup):
 *   npx ts-node --transpile-only scripts/wallet-ledger-reconcile.ts
 *   npx ts-node --transpile-only scripts/wallet-ledger-reconcile.ts --apply
 *   npx ts-node --transpile-only scripts/wallet-ledger-reconcile.ts --apply --sync-aggregates
 *
 * Flags:
 *   --apply                 Write changes (default: dry-run only)
 *   --sync-aggregates       Also set all_time_fuunding = creditSum, all_time_withdrawn = debitSum (outflows)
 *   --scope window|global   window = only users with a tx in --from/--to (default). global = all wallets with overflow
 *   --from ISO              Default: 2026-04-06T00:00:00+01:00 (Lagos WAT)
 *   --to ISO                Default: 2026-04-08T19:51:00+01:00
 *   --min-overflow N        Only fix if (current - suggested) > N (default: 5)
 *
 * By default, users with any ADMIN_USER_WALLET_ADJUST audit (resource_id = user id) are skipped.
 *   --include-admin-adjusted   Allow correcting those users too (dangerous if legit admin credits)
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
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
  let syncAggregates = false;
  let scope: 'window' | 'global' = 'window';
  let skipAdminAdjusted = true;
  let minOverflow = 5;
  let fromIso = '2026-04-06T00:00:00+01:00';
  let toIso = '2026-04-08T19:51:00+01:00';

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') apply = true;
    if (argv[i] === '--sync-aggregates') syncAggregates = true;
    if (argv[i] === '--scope' && argv[i + 1]) {
      const v = argv[++i];
      if (v === 'global' || v === 'window') scope = v;
    }
    if (argv[i] === '--from' && argv[i + 1]) fromIso = argv[++i];
    if (argv[i] === '--to' && argv[i + 1]) toIso = argv[++i];
    if (argv[i] === '--min-overflow' && argv[i + 1]) minOverflow = Number(argv[++i]) || 5;
    if (argv[i] === '--include-admin-adjusted') skipAdminAdjusted = false;
  }
  return { apply, syncAggregates, scope, skipAdminAdjusted, minOverflow, fromIso, toIso };
}

async function loadLedgerSums(): Promise<Map<string, { credits: number; debits: number }>> {
  const rows = await prisma.$queryRaw<
    { user_id: string; credits: number; debits: number }[]
  >(Prisma.sql`
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
      )::double precision AS credits,
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
      )::double precision AS debits
    FROM "TransactionHistory" t
    GROUP BY t.user_id
  `);

  const map = new Map<string, { credits: number; debits: number }>();
  for (const r of rows) {
    map.set(r.user_id, { credits: round2(r.credits), debits: round2(r.debits) });
  }
  return map;
}

async function loadWindowUserIds(from: Date, to: Date): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ user_id: string }[]>(Prisma.sql`
    SELECT DISTINCT t.user_id::text AS user_id
    FROM "TransactionHistory" t
    WHERE t."createdAt" >= ${from} AND t."createdAt" <= ${to}
  `);
  return new Set(rows.map((r) => r.user_id));
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

async function main() {
  const { apply, syncAggregates, scope, skipAdminAdjusted, minOverflow, fromIso, toIso } =
    parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  const fromDate = new Date(fromIso);
  const toDate = new Date(toIso);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    console.error('Invalid --from or --to');
    process.exit(1);
  }

  console.log(
    `Wallet ledger reconcile | dryRun=${!apply} | scope=${scope} | window=${fromIso} .. ${toIso} | minOverflow=${minOverflow} | syncAggregates=${syncAggregates} | skipAdminAdjusted=${skipAdminAdjusted}`,
  );

  const ledgerMap = await loadLedgerSums();
  const windowIds = await loadWindowUserIds(fromDate, toDate);
  const adminIds = skipAdminAdjusted ? await loadAdminAdjustedUserIds() : new Set<string>();

  const wallets = await prisma.wallet.findMany({
    select: {
      id: true,
      user_id: true,
      current_balance: true,
      all_time_fuunding: true,
      all_time_withdrawn: true,
    },
  });

  const results: Array<{
    user_id: string;
    current: number;
    credits: number;
    debits: number;
    suggested: number;
    overflow: number;
    action: string;
  }> = [];

  for (const w of wallets) {
    if (scope === 'window' && !windowIds.has(w.user_id)) continue;

    const sums = ledgerMap.get(w.user_id) ?? { credits: 0, debits: 0 };
    const suggested = round2(Math.max(0, sums.credits - sums.debits));
    const current = round2(Number(w.current_balance));
    const overflow = round2(current - suggested);

    if (overflow <= minOverflow) continue;

    if (skipAdminAdjusted && adminIds.has(w.user_id)) {
      results.push({
        user_id: w.user_id,
        current,
        credits: sums.credits,
        debits: sums.debits,
        suggested,
        overflow,
        action: 'skipped_admin_adjusted',
      });
      continue;
    }

    const newBal = Math.max(0, suggested);

    results.push({
      user_id: w.user_id,
      current,
      credits: sums.credits,
      debits: sums.debits,
      suggested: newBal,
      overflow,
      action: apply ? 'updated' : 'would_update',
    });

    if (apply) {
      await prisma.wallet.update({
        where: { id: w.id },
        data: {
          current_balance: newBal,
          balance_before: newBal,
          balance_after: newBal,
          ...(syncAggregates
            ? {
                all_time_fuunding: sums.credits,
                all_time_withdrawn: sums.debits,
              }
            : {}),
        },
      });
    }
  }

  mkdirSync(join(__dirname, '..', 'backups'), { recursive: true });
  const logPath = join(
    __dirname,
    '..',
    'backups',
    `wallet-reconcile-${Date.now()}.json`,
  );
  writeFileSync(
    logPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        apply,
        syncAggregates,
        scope,
        fromIso,
        toIso,
        minOverflow,
        affected: results.length,
        rows: results,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`Affected rows: ${results.length}`);
  for (const r of results.slice(0, 50)) {
    console.log(JSON.stringify(r));
  }
  if (results.length > 50) console.log(`... and ${results.length - 50} more (see ${logPath})`);
  else console.log(`Log: ${logPath}`);

  if (!apply && results.length > 0) {
    console.log('\nDry-run only. Re-run with --apply to write. Add --sync-aggregates to align funding/withdrawn totals with ledger sums.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

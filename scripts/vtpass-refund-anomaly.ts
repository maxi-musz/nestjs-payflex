/**
 * VTpass duplicate-refund audit & optional wallet clawback (floor balance at 0).
 *
 * 1) Backup first: ./scripts/backup-database.sh (requires pg_dump + DATABASE_URL)
 *
 * Audit (read-only):
 *   cd backend && npx ts-node -r tsconfig-paths/register scripts/vtpass-refund-anomaly.ts audit
 *
 * Flag suspicious rows (merges meta_data JSON only):
 *   npx ts-node -r tsconfig-paths/register scripts/vtpass-refund-anomaly.ts audit --flag-meta
 *
 * Build recovery plan from transaction_reference list (one excess refund per ref = wallet_charged):
 *   npx ts-node -r tsconfig-paths/register scripts/vtpass-refund-anomaly.ts build-plan --refs ref1,ref2
 *
 * Apply recovery (deducts clawback; balance never below 0):
 *   npx ts-node -r tsconfig-paths/register scripts/vtpass-refund-anomaly.ts recover --plan vtpass-recovery-plan.json --dry-run
 *   (remove --dry-run to write)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

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

const VT_TYPES = ['airtime', 'data', 'cable', 'electricity', 'education'] as const;

type Meta = Record<string, unknown>;

function metaObj(m: unknown): Meta {
  return m && typeof m === 'object' && !Array.isArray(m) ? (m as Meta) : {};
}

function refundFlagMissing(meta: Meta): boolean {
  return meta['vtpass_failure_refund_applied'] !== true;
}

function hasVtpassResponse(meta: Meta): boolean {
  return meta['vtpass_response'] != null;
}

async function audit(flagMeta: boolean) {
  const rows = await prisma.transactionHistory.findMany({
    where: {
      status: 'failed',
      credit_debit: 'debit',
      transaction_type: { in: [...VT_TYPES] },
      payment_method: 'wallet',
    },
    orderBy: { createdAt: 'desc' },
    take: 50_000,
    select: {
      id: true,
      user_id: true,
      transaction_reference: true,
      amount: true,
      transaction_type: true,
      commission: true,
      createdAt: true,
      meta_data: true,
    },
  });

  const suspicious = rows.filter((r) => {
    const m = metaObj(r.meta_data);
    return refundFlagMissing(m) && hasVtpassResponse(m);
  });

  const badCommission = rows.filter((r) => Number(r.commission || 0) > 0);

  const reportPath = join(__dirname, '..', 'backups', `vtpass-refund-audit-${Date.now()}.json`);
  const summary = {
    generatedAt: new Date().toISOString(),
    totalFailedVtWallet: rows.length,
    suspiciousMissingRefundFlag: suspicious.length,
    failedWithNonZeroCommission: badCommission.length,
    suspicious,
    badCommissionSample: badCommission.slice(0, 500),
  };

  const dir = join(__dirname, '..', 'backups');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Wrote ${reportPath}`);
  console.log(
    `Failed VT+wallet rows: ${rows.length}; missing vtpass_failure_refund_applied + vtpass_response: ${suspicious.length}`,
  );
  console.log(`Failed rows with commission>0: ${badCommission.length}`);

  if (flagMeta && suspicious.length > 0) {
    let n = 0;
    for (const r of suspicious) {
      const prev = metaObj(r.meta_data);
      await prisma.transactionHistory.update({
        where: { id: r.id },
        data: {
          meta_data: {
            ...prev,
            vtpass_refund_audit_flagged_at: new Date().toISOString(),
            vtpass_refund_audit_reason: 'missing_vtpass_failure_refund_applied_with_vtpass_response',
          } as object,
        },
      });
      n++;
    }
    console.log(`Flagged ${n} rows in meta_data.`);
  }
}

type PlanEntry = { userId: string; clawbackNaira: number; transaction_reference: string; note?: string };

type PlanFile = { generatedAt?: string; entries: PlanEntry[] };

async function buildPlan(refs: string[]) {
  const entries: PlanEntry[] = [];
  for (const ref of refs) {
    const r = await prisma.transactionHistory.findFirst({
      where: { transaction_reference: ref },
      select: { user_id: true, transaction_reference: true, amount: true, meta_data: true },
    });
    if (!r) {
      console.warn(`Skip unknown ref: ${ref}`);
      continue;
    }
    const m = metaObj(r.meta_data);
    const w =
      typeof m['wallet_charged'] === 'number'
        ? m['wallet_charged']
        : Number(m['wallet_charged']) || Number(r.amount) || 0;
    if (w <= 0) {
      console.warn(`Skip ref ${ref}: wallet_charged/amount is 0`);
      continue;
    }
    entries.push({
      userId: r.user_id,
      clawbackNaira: Math.round(w * 100) / 100,
      transaction_reference: r.transaction_reference || ref,
      note: 'Assumes one duplicate wallet credit to reverse (per ops confirmation)',
    });
  }
  const plan: PlanFile = { generatedAt: new Date().toISOString(), entries };
  const out = join(__dirname, '..', 'backups', `vtpass-recovery-plan-${Date.now()}.json`);
  mkdirSync(join(__dirname, '..', 'backups'), { recursive: true });
  writeFileSync(out, JSON.stringify(plan, null, 2), 'utf8');
  console.log(`Wrote ${out} (${entries.length} entries)`);
}

async function recover(planPath: string, dryRun: boolean) {
  const raw = readFileSync(planPath, 'utf8');
  const plan = JSON.parse(raw) as PlanFile;
  if (!plan.entries?.length) {
    console.error('No entries in plan');
    process.exit(1);
  }

  /** Aggregate clawback per user */
  const byUser = new Map<string, { total: number; refs: string[] }>();
  for (const e of plan.entries) {
    const cur = byUser.get(e.userId) || { total: 0, refs: [] };
    cur.total += e.clawbackNaira;
    cur.refs.push(e.transaction_reference);
    byUser.set(e.userId, cur);
  }

  console.log(`Users affected: ${byUser.size}; dryRun=${dryRun}`);

  for (const [userId, { total, refs }] of byUser) {
    const w = await prisma.wallet.findUnique({
      where: { user_id: userId },
      select: { current_balance: true },
    });
    const before = Number(w?.current_balance ?? 0);
    const rawNext = before - total;
    const after = Math.max(0, rawNext);
    const absorbed = rawNext < 0 ? -rawNext : 0;

    console.log(
      JSON.stringify({
        userId,
        balance_before: before,
        clawback_requested: total,
        balance_after: after,
        smipay_loss_absorbed_naira: absorbed,
        refs,
      }),
    );

    if (!dryRun) {
      await prisma.wallet.update({
        where: { user_id: userId },
        data: { current_balance: after },
      });
    }
  }

  const logPath = join(__dirname, '..', 'backups', `vtpass-recovery-log-${Date.now()}.json`);
  writeFileSync(
    logPath,
    JSON.stringify(
      {
        dryRun,
        at: new Date().toISOString(),
        results: [...byUser.entries()].map(([userId, v]) => ({ userId, ...v })),
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`Log: ${logPath}`);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || 'audit';
  let flagMeta = false;
  let dryRun = true;
  let plan = '';
  let refs = '';
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--flag-meta') flagMeta = true;
    if (argv[i] === '--dry-run') dryRun = true;
    if (argv[i] === '--no-dry-run' || argv[i] === '--execute') dryRun = false;
    if (argv[i] === '--plan' && argv[i + 1]) {
      plan = argv[++i];
    }
    if (argv[i] === '--refs' && argv[i + 1]) {
      refs = argv[++i];
    }
  }
  return { cmd, flagMeta, dryRun, plan, refs };
}

async function main() {
  const { cmd, flagMeta, dryRun, plan, refs } = parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing (set env or use backend/.env)');
    process.exit(1);
  }

  try {
    if (cmd === 'audit') {
      await audit(flagMeta);
    } else if (cmd === 'build-plan') {
      const list = refs.split(',').map((s) => s.trim()).filter(Boolean);
      if (!list.length) {
        console.error('Usage: build-plan --refs ref1,ref2,...');
        process.exit(1);
      }
      await buildPlan(list);
    } else if (cmd === 'recover') {
      if (!plan) {
        console.error('Usage: recover --plan path/to/plan.json [--no-dry-run]');
        process.exit(1);
      }
      await recover(plan, dryRun);
    } else {
      console.error('Commands: audit | build-plan | recover');
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

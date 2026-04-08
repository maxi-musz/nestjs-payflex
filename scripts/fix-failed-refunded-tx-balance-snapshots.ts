/**
 * One-time backfill: failed VTpass wallet purchases that applied vtpass_failure_refund
 * still had balance_after = post-debit. Admin showed a fake deduction. This aligns snapshots
 * with net wallet effect (restored to pre-debit).
 *
 * Dry-run: npx ts-node --transpile-only scripts/fix-failed-refunded-tx-balance-snapshots.ts
 * Apply:   npx ts-node --transpile-only scripts/fix-failed-refunded-tx-balance-snapshots.ts --apply
 */
import { readFileSync, existsSync } from 'fs';
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

async function main() {
  const apply = process.argv.includes('--apply');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  const rows = await prisma.$queryRaw<
    { id: string; balance_before: number; balance_after: number; cashback_balance_before: number | null }[]
  >`
    SELECT id, "balance_before", "balance_after", "cashback_balance_before"
    FROM "TransactionHistory"
    WHERE status = 'failed'
      AND credit_debit = 'debit'
      AND payment_method = 'wallet'
      AND (meta_data->>'vtpass_failure_refund_applied') = 'true'
      AND "balance_before" IS NOT NULL
      AND "balance_after" IS NOT NULL
      AND "balance_after" <> "balance_before"
  `;

  console.log(`Rows to fix: ${rows.length} | apply=${apply}`);
  for (const r of rows.slice(0, 20)) {
    console.log(JSON.stringify({ id: r.id, before: r.balance_before, after: r.balance_after }));
  }
  if (rows.length > 20) console.log(`... and ${rows.length - 20} more`);

  if (!apply || rows.length === 0) {
    if (!apply) console.log('\nDry-run only. Re-run with --apply.');
    await prisma.$disconnect();
    return;
  }

  const n = await prisma.$executeRaw`
    UPDATE "TransactionHistory"
    SET
      "balance_after" = "balance_before",
      "cashback_balance_after" = CASE
        WHEN COALESCE((meta_data->>'vtpass_failure_cashback_refund_amount')::numeric, 0) > 0
          AND "cashback_balance_before" IS NOT NULL
        THEN "cashback_balance_before"
        ELSE "cashback_balance_after"
      END
    WHERE status = 'failed'
      AND credit_debit = 'debit'
      AND payment_method = 'wallet'
      AND (meta_data->>'vtpass_failure_refund_applied') = 'true'
      AND "balance_before" IS NOT NULL
      AND "balance_after" IS NOT NULL
      AND "balance_after" <> "balance_before"
  `;
  console.log(`Updated rows: ${n}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/* Backfill electricity_token for historical electricity transactions.
 *
 * - Reads existing meta_data.vtpass_response
 * - Extracts token using same logic as ElectricityService.extractToken
 * - Writes into TransactionHistory.electricity_token and meta_data.electricity_token
 *
 * Safe to run multiple times; only fills missing tokens.
 */

const { PrismaClient, TransactionType } = require('@prisma/client');

const prisma = new PrismaClient();

function extractTokenFromResponse(responseData) {
  if (!responseData || typeof responseData !== 'object') return null;

  const raw =
    responseData.token ||
    responseData.Token ||
    responseData.mainToken ||
    responseData.purchased_code ||
    null;

  if (!raw || typeof raw !== 'string') return null;

  const cleaned = raw
    .replace(/^Token\s*:\s*/i, '')
    .replace(/^token:\s*/i, '')
    .trim();

  return cleaned || null;
}

async function processBatch(cursorId) {
  const whereClause = {
    transaction_type: TransactionType.electricity,
    electricity_token: null,
  };

  const args = {
    where: whereClause,
    orderBy: { createdAt: 'asc' },
    take: 100,
  };

  if (cursorId) {
    args.skip = 1;
    args.cursor = { id: cursorId };
  }

  const transactions = await prisma.transactionHistory.findMany(args);
  if (!transactions.length) return { count: 0, lastId: null };

  let updated = 0;

  for (const tx of transactions) {
    const meta = (tx.meta_data || {});
    const vt = meta.vtpass_response || {};

    const txSection = vt.content && vt.content.transactions ? vt.content.transactions : null;

    const tokenFromTx = txSection ? extractTokenFromResponse(txSection) : null;
    const tokenFromRoot = extractTokenFromResponse(vt);
    const token = tokenFromTx || tokenFromRoot;

    if (!token) {
      // Nothing to backfill; skip quietly.
      continue;
    }

    // Keep meta_data and column in sync
    const newMeta = { ...meta, electricity_token: meta.electricity_token || token };

    await prisma.transactionHistory.update({
      where: { id: tx.id },
      data: {
        electricity_token: tx.electricity_token || token,
        meta_data: newMeta,
      },
    });

    updated += 1;
  }

  const last = transactions[transactions.length - 1];
  return { count: updated, lastId: last.id };
}

async function main() {
  console.log('Starting electricity_token backfill...');

  let totalUpdated = 0;
  let cursorId = null;

  // Cap iterations defensively so we don't accidentally loop forever
  for (let i = 0; i < 1000; i++) {
    const { count, lastId } = await processBatch(cursorId);
    totalUpdated += count;

    console.log(`Batch ${i + 1}: updated ${count} rows.`);

    if (!lastId) break;
    cursorId = lastId;
  }

  console.log(`Backfill complete. Total rows updated: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


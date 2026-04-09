import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/** VTpass-backed purchase types only (excludes transfers, deposits, bonuses). */
const VTPASS_FAILURE_TYPES: TransactionType[] = [
  'airtime',
  'data',
  'cable',
  'electricity',
  'education',
  'betting',
];

/**
 * Blocks new VTpass purchases when the user has too many failed utility txs
 * in a short window. Counts persisted `failed` rows only (same source as admin ledger).
 *
 * TX_FAILURE_COOLDOWN_MAX_FAILURES=0 disables the check (rollback switch).
 */
@Injectable()
export class VtpassFailureCooldownService {
  constructor(private readonly prisma: PrismaService) {}

  async assertNotInFailureCooldown(userId: string): Promise<void> {
    const maxFailures = parseInt(process.env.TX_FAILURE_COOLDOWN_MAX_FAILURES || '3', 10); // number of failures to check for
    if (!Number.isFinite(maxFailures) || maxFailures <= 0) return;

    const windowSec = parseInt(process.env.TX_FAILURE_COOLDOWN_WINDOW_SECONDS || '180', 10);
    const cooldownSec = parseInt(process.env.TX_FAILURE_COOLDOWN_SECONDS || '300', 10);
    if (!Number.isFinite(windowSec) || windowSec <= 0) return;
    if (!Number.isFinite(cooldownSec) || cooldownSec <= 0) return;

    const since = new Date(Date.now() - windowSec * 1000);
    const failures = await this.prisma.transactionHistory.findMany({
      where: {
        user_id: userId,
        status: 'failed',
        transaction_type: { in: VTPASS_FAILURE_TYPES },
        createdAt: { gte: since },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (failures.length < maxFailures) return;

    const latestFailureMs = Math.max(...failures.map((f) => f.createdAt.getTime()));
    const blockUntil = latestFailureMs + cooldownSec * 1000;
    const now = Date.now();
    if (now >= blockUntil) return;

    const retryAfterSec = Math.max(1, Math.ceil((blockUntil - now) / 1000));

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many failed purchases. Please wait before trying again.',
        error: 'TX_FAILURE_COOLDOWN',
        data: { retry_after: retryAfterSec },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

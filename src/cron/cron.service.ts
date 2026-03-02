import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import axios from 'axios';
import * as colors from 'colors';
import { PrismaService } from 'src/prisma/prisma.service';
import { VtpassTransactionOrchestrator } from 'src/utility-services/vtpass-service/vtpass-transaction.orchestrator';
import { BankingService } from 'src/banking/banking.service';

const VTPASS_REQUERY_MAP: Record<string, { serviceLabel: string; auditAction: string; auditFailAction: string; cashbackServiceType: string }> = {
  airtime:     { serviceLabel: 'Airtime',     auditAction: 'AIRTIME_PURCHASE',     auditFailAction: 'AIRTIME_PURCHASE_FAILED',     cashbackServiceType: 'airtime' },
  data:        { serviceLabel: 'Data',         auditAction: 'DATA_PURCHASE',        auditFailAction: 'DATA_PURCHASE_FAILED',        cashbackServiceType: 'data' },
  cable:       { serviceLabel: 'Cable',        auditAction: 'CABLE_PURCHASE',       auditFailAction: 'CABLE_PURCHASE_FAILED',       cashbackServiceType: 'cable' },
  electricity: { serviceLabel: 'Electricity',  auditAction: 'ELECTRICITY_PURCHASE', auditFailAction: 'ELECTRICITY_PURCHASE_FAILED', cashbackServiceType: 'electricity' },
  education:   { serviceLabel: 'Education',    auditAction: 'EDUCATION_PURCHASE',   auditFailAction: 'EDUCATION_PURCHASE_FAILED',   cashbackServiceType: 'education' },
};

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: VtpassTransactionOrchestrator,
    private readonly bankingService: BankingService,
  ) {}

  onModuleInit() {
    console.log(colors.blue("Initializing cron jobs..."));

    let url: string;
    if (process.env.NODE_ENV === 'production') {
      url = 'https://0999ca2c49d7.ngrok-free.app/api/v1/auth/health';
    } else {
      url = 'http://localhost:3000/api/v1/auth/health';
    }

    // VTpass transaction requery - runs every 3 minutes - production only
    if (process.env.NODE_ENV === 'production') {
      cron.schedule('*/3 * * * *', async () => {
          await this.requeryPendingVtpassTransactions();
        });
    }

    // Paystack transaction requery - runs every 20 minutes (pending deposits)
    if (process.env.NODE_ENV === 'production') {
      cron.schedule('*/2 * * * *', async () => {
        await this.requeryPendingPaystackTransactions();
      });
    }

    // Stale Paystack transaction cleanup - runs every 30 mins
    // Catches abandoned/failed payments that slipped through (user closed browser, network issues)
    cron.schedule('*/3 * * * *', async () => {
      await this.cleanupStalePaystackTransactions();
    });
  }

  /**
   * Requery ALL pending VTpass transactions (airtime, data, cable, electricity, education)
   * via the centralized orchestrator.
   */
  private async requeryPendingVtpassTransactions(): Promise<void> {
    try {
      this.logger.log('[Cron] Starting requery of pending VTpass transactions...');

      const twentyNineMinutesAgo = new Date(Date.now() - 29 * 60 * 1000);

      const pendingTransactions = await this.prisma.transactionHistory.findMany({
        where: {
          status: 'pending',
          transaction_type: { in: Object.keys(VTPASS_REQUERY_MAP) as any },
          createdAt: { gte: twentyNineMinutesAgo },
          transaction_reference: { not: null },
        },
        select: { id: true, transaction_reference: true, transaction_type: true },
        take: 50,
      });

      if (pendingTransactions.length === 0) {
        this.logger.log('[Cron] No pending VTpass transactions to requery');
        return;
      }

      this.logger.log(`[Cron] Found ${pendingTransactions.length} pending VTpass transactions to requery`);

      const batchSize = 5;
      for (let i = 0; i < pendingTransactions.length; i += batchSize) {
        const batch = pendingTransactions.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (tx) => {
            if (!tx.transaction_reference) return;
            const cfg = VTPASS_REQUERY_MAP[tx.transaction_type ?? ''];
            if (!cfg) return;

            try {
              await this.orchestrator.requeryTransaction(tx.transaction_reference, {
                transactionType: tx.transaction_type ?? '',
                ...cfg,
              });
            } catch (error: any) {
              this.logger.error(`[Cron] Error requerying ${tx.transaction_reference}: ${error.message}`);
            }
          }),
        );

        if (i + batchSize < pendingTransactions.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      this.logger.log('[Cron] Finished requerying pending VTpass transactions');
    } catch (error: any) {
      this.logger.error(`[Cron] Error in VTpass requery job: ${error.message}`, error.stack);
    }
  }

  /**
   * Requery pending Paystack (deposit) transactions.
   * Runs every 30 minutes.
   */
  private async requeryPendingPaystackTransactions(): Promise<void> {
    try {
      this.logger.log(colors.america('[Cron] Starting requery of pending Paystack transactions...'));

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const pending = await this.prisma.transactionHistory.findMany({
        where: {
          status: 'pending',
          transaction_type: 'deposit',
          payment_method: 'paystack',
          transaction_reference: { not: null },
          createdAt: { gte: thirtyMinutesAgo },
        },
        select: { transaction_reference: true },
        take: 50,
      });

      const refs = pending
        .map((t) => t.transaction_reference)
        .filter((r): r is string => r != null);
      if (refs.length === 0) {
        this.logger.log('[Cron] No pending Paystack transactions to requery');
        return;
      }

      this.logger.log(`[Cron] Found ${refs.length} pending Paystack transactions to requery`);
      const batchSize = 5;
      for (let i = 0; i < refs.length; i += batchSize) {
        const batch = refs.slice(i, i + batchSize);
        await Promise.all(
          batch.map((ref) =>
            this.bankingService.requeryPendingPaystackTransaction(ref).catch((err: any) => {
              this.logger.error(`[Cron] Paystack requery ${ref}: ${err?.message || err}`);
            }),
          ),
        );
        if (i + batchSize < refs.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      this.logger.log('[Cron] Finished requerying pending Paystack transactions');
    } catch (error: any) {
      this.logger.error(`[Cron] Error in Paystack requery job: ${error.message}`, error.stack);
    }
  }

  /**
   * Cleanup stale Paystack pending deposits older than 2 hours.
   * These are transactions where the user likely closed the browser, lost network,
   * or abandoned payment without the frontend ever calling verify or cancel.
   * We verify each with Paystack and mark them as cancelled/failed/success accordingly.
   */
  private async cleanupStalePaystackTransactions(): Promise<void> {
    try {
      this.logger.log('[Cron] Starting stale Paystack transaction cleanup...');

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const stale = await this.prisma.transactionHistory.findMany({
        where: {
          status: 'pending',
          transaction_type: 'deposit',
          payment_channel: 'paystack',
          transaction_reference: { not: null },
          createdAt: { lt: twoHoursAgo },
        },
        select: { transaction_reference: true },
        take: 100,
      });

      const refs = stale
        .map((t) => t.transaction_reference)
        .filter((r): r is string => r != null);

      if (refs.length === 0) {
        this.logger.log('[Cron] No stale Paystack transactions to clean up');
        return;
      }

      this.logger.log(`[Cron] Found ${refs.length} stale Paystack transactions (>2h old)`);

      const batchSize = 5;
      for (let i = 0; i < refs.length; i += batchSize) {
        const batch = refs.slice(i, i + batchSize);
        await Promise.all(
          batch.map((ref) =>
            this.bankingService.requeryPendingPaystackTransaction(ref).catch((err: any) => {
              this.logger.error(`[Cron] Stale cleanup ${ref}: ${err?.message || err}`);
            }),
          ),
        );
        if (i + batchSize < refs.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      this.logger.log('[Cron] Finished stale Paystack transaction cleanup');
    } catch (error: any) {
      this.logger.error(`[Cron] Error in stale Paystack cleanup: ${error.message}`, error.stack);
    }
  }
}

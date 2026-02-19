import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import axios from 'axios';
import * as colors from 'colors';
import { PrismaService } from 'src/prisma/prisma.service';
import { DataService } from 'src/utility-services/vtpass-service/data/data.service';
import { AirtimeService } from 'src/utility-services/vtpass-service/airtime/airtime.service';
import { BankingService } from 'src/banking/banking.service';

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataService: DataService,
    private readonly airtimeService: AirtimeService,
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

    // Keep-alive ping (only in production)
    if (process.env.NODE_ENV === 'production') {
      // cron.schedule('*/3 * * * *', async () => {  // Runs every 3 minutes
      //   try {
      //     this.logger.log("Pinging service to keep alive...");
      //     await axios.get(url); // Replace with your actual endpoint
      //     this.logger.log(colors.america("Service is up"));
      //   } catch (error: any) {
      //     this.logger.error("Failed to ping service:", error.message);
      //   }
      // });
    }

    // VTpass transaction requery - runs every 3 minutes - production only
    if (process.env.NODE_ENV === 'production') {
      cron.schedule('*/3 * * * *', async () => {
          await this.requeryPendingVtpassTransactions();
        });
    }

    // Paystack transaction requery - runs every 1 minute (pending deposits)
    cron.schedule('* * * * *', async () => {
      await this.requeryPendingPaystackTransactions();
    });
  }

  /**
   * Requery pending VTpass transactions (data and airtime)
   * Runs every 3 minutes, queries transactions up to 3 times max
   */
  private async requeryPendingVtpassTransactions(): Promise<void> {
    try {
      this.logger.log('[Cron] Starting requery of pending VTpass transactions...');

      // Find pending transactions (data and airtime) created in the last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const pendingTransactions = await this.prisma.transactionHistory.findMany({
        where: {
          status: 'pending',
          transaction_type: {
            in: ['data', 'airtime'],
          },
          createdAt: {
            gte: thirtyMinutesAgo,
          },
          transaction_reference: {
            not: null,
          },
        },
        select: {
          id: true,
          transaction_reference: true,
          transaction_type: true,
        },
        take: 50, // Limit to 50 transactions per run to avoid overwhelming the API
      });

      if (pendingTransactions.length === 0) {
        this.logger.log('[Cron] No pending transactions to requery');
        return;
      }

      this.logger.log(`[Cron] Found ${pendingTransactions.length} pending transactions to requery`);

      // Process transactions in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < pendingTransactions.length; i += batchSize) {
        const batch = pendingTransactions.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (tx) => {
            if (!tx.transaction_reference) return;

            try {
              // Use appropriate service based on transaction type
              if (tx.transaction_type === 'data') {
                await this.dataService.requeryPendingTransaction(tx.transaction_reference);
              } else if (tx.transaction_type === 'airtime') {
                await this.airtimeService.requeryPendingTransaction(tx.transaction_reference);
              }
            } catch (error: any) {
              this.logger.error(
                `[Cron] Error requerying transaction ${tx.transaction_reference}: ${error.message}`
              );
            }
          })
        );

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < pendingTransactions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      this.logger.log('[Cron] Finished requerying pending transactions');
    } catch (error: any) {
      this.logger.error(`[Cron] Error in requery job: ${error.message}`, error.stack);
    }
  }

  /**
   * Requery pending Paystack (deposit) transactions.
   * Runs every 1 minute.
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
}

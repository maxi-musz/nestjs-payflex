import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatsService } from 'src/common/stats/stats.service';
import { VtpassTransactionOrchestrator } from 'src/utility-services/vtpass-service/vtpass-transaction.orchestrator';
import {
  normalizeVtpassResponseCode,
  determineTransactionStatus,
} from 'src/utility-services/vtpass-service/airtime/airtime.validators';
import * as colors from 'colors/safe';

@Injectable()
export class VtpassWebhookService {
  private readonly logger = new Logger(VtpassWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
    private readonly orchestrator: VtpassTransactionOrchestrator,
  ) {}

  /**
   * Handle VTpass webhook events
   * VTpass sends webhooks for transaction updates and variation code updates
   */
  async handleWebhookEvent(payload: any): Promise<void> {
    try {
      const { type, data } = payload;

      this.logger.log(colors.cyan(`Received VTpass webhook: type=${type}`));

      switch (type) {
        case 'transaction-update':
          await this.handleTransactionUpdate(data);
          break;

        case 'variation-update':
          // Handle variation code updates if needed
          this.logger.log(colors.yellow('Variation update received (not handled)'));
          break;

        default:
          this.logger.warn(colors.yellow(`Unhandled VTpass webhook type: ${type}`));
      }
    } catch (error: any) {
      this.logger.error(`Error handling VTpass webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle transaction update webhook
   * Updates transaction status when VTpass sends final status
   */
  private async handleTransactionUpdate(data: any): Promise<void> {
    try {
      const { code, content, requestId, response_description, amount } = data;
      const transaction = content?.transactions || {};
      const transactionStatus = transaction.status?.toLowerCase() || '';
      const transactionId = transaction.transactionId;

      this.logger.log(
        colors.cyan(
          `Processing transaction update: requestId=${requestId}, status=${transactionStatus}, code=${code}`
        )
      );

      // Find transaction by request_id (VTpass requestId)
      const dbTransaction = await this.prisma.transactionHistory.findUnique({
        where: { transaction_reference: requestId },
      });

      if (!dbTransaction) {
        this.logger.warn(
          colors.yellow(`Transaction not found for requestId: ${requestId}`)
        );
        return;
      }

      // Skip if already resolved to a terminal state
      if (dbTransaction.status === 'success' || dbTransaction.status === 'failed') {
        this.logger.log(colors.yellow(`Transaction ${requestId} already resolved as '${dbTransaction.status}', ignoring webhook`));
        return;
      }

      const normalizedCode = normalizeVtpassResponseCode(code);
      const metaData = dbTransaction.meta_data as any || {};

      this.logger.log(
        colors.cyan(`[Webhook] VTpass raw: code=${JSON.stringify(code)}, normalized=${normalizedCode}, txStatus=${transactionStatus}, desc="${response_description}"`),
      );

      const { finalStatus, shouldRefund } = determineTransactionStatus(
        normalizedCode, transactionStatus, response_description || '', this.logger,
      );

      // Update transaction status in database
      await this.prisma.transactionHistory.update({
        where: { transaction_reference: requestId },
        data: {
          status: finalStatus,
          transaction_number: transactionId?.toString() || dbTransaction.transaction_number,
          commission: typeof transaction.commission === 'number'
            ? transaction.commission
            : Number(transaction.commission) || dbTransaction.commission || 0,
          meta_data: {
            ...metaData,
            vtpass_webhook: data,
            vtpass_status: transactionStatus,
            vtpass_code: code,
            webhook_received_at: new Date().toISOString(),
          },
        },
      });

      // Idempotent refund via orchestrator (handles flag check + correct amounts)
      if (shouldRefund) {
        const walletRefund = typeof metaData.wallet_charged === 'number'
          ? metaData.wallet_charged : Number(dbTransaction.amount || 0);
        const cashbackRefund = typeof metaData.cashback_used === 'number'
          ? metaData.cashback_used : 0;
        await this.orchestrator.applyVtpassFailureRefundOnce(
          requestId, dbTransaction.user_id, walletRefund, cashbackRefund, 'VTpass Webhook',
        );
      }

      // Update daily stats when status changes to success (commission + markup + volume)
      if (dbTransaction.status === 'pending' && finalStatus === 'success') {
        const amount = Number(dbTransaction.smipay_amount ?? dbTransaction.amount ?? 0);
        const markupVal = typeof dbTransaction.markup_value === 'number' ? dbTransaction.markup_value : 0;
        const commissionVal = typeof transaction.commission === 'number' ? transaction.commission : Number(transaction.commission) || 0;
        this.statsService
          .onTransactionStatusChanged('pending', 'success', amount, markupVal, commissionVal)
          .catch((e) => this.logger.warn(`Stats update failed for ${requestId}: ${e.message}`));
      }

      this.logger.log(
        colors.green(`Transaction ${requestId} updated to status: ${finalStatus}`)
      );
    } catch (error: any) {
      this.logger.error(
        `Error processing transaction update: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}


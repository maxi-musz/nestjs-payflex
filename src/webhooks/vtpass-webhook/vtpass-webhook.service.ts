import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from 'colors/safe';

@Injectable()
export class VtpassWebhookService {
  private readonly logger = new Logger(VtpassWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

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

      // Check if already processed
      if (dbTransaction.status === 'success' && transactionStatus === 'delivered') {
        this.logger.log(colors.yellow(`Transaction ${requestId} already marked as successful`));
        return;
      }

      // Determine final status based on VTpass status
      let finalStatus: 'pending' | 'success' | 'failed' = 'pending';
      let shouldRefund = false;
      const metaData = dbTransaction.meta_data as any || {};

      if (transactionStatus === 'delivered') {
        finalStatus = 'success';
        this.logger.log(colors.green(`Transaction ${requestId} delivered successfully`));
      } else if (transactionStatus === 'reversed' || code === '040') {
        // Transaction reversal - refund the user
        finalStatus = 'failed';
        shouldRefund = true;
        this.logger.warn(
          colors.yellow(`Transaction ${requestId} reversed. Refunding user.`)
        );
      } else if (transactionStatus === 'failed' || code === '016') {
        // Transaction failed - refund the user
        finalStatus = 'failed';
        shouldRefund = true;
        this.logger.warn(
          colors.yellow(`Transaction ${requestId} failed. Refunding user.`)
        );
      } else {
        // Still pending or other status
        finalStatus = 'pending';
        this.logger.log(
          colors.cyan(`Transaction ${requestId} still processing. Status: ${transactionStatus}`)
        );
      }

      // Update transaction in database
      await this.prisma.$transaction(async (tx) => {
        // Update transaction status
        await tx.transactionHistory.update({
          where: { transaction_reference: requestId },
          data: {
            status: finalStatus,
            transaction_number: transactionId?.toString() || dbTransaction.transaction_number,
            fee: typeof transaction.commission === 'number' 
              ? transaction.commission 
              : Number(transaction.commission) || dbTransaction.fee || 0,
            meta_data: {
              ...metaData,
              vtpass_webhook: data,
              vtpass_status: transactionStatus,
              vtpass_code: code,
              webhook_received_at: new Date().toISOString(),
            },
          },
        });

        // Refund user if transaction failed or was reversed
        if (shouldRefund && dbTransaction.status !== 'failed') {
          const refundAmount = dbTransaction.smipay_amount || dbTransaction.amount || 0;
          if (refundAmount > 0) {
            await tx.wallet.update({
              where: { user_id: dbTransaction.user_id },
              data: { current_balance: { increment: Number(refundAmount) } },
            });
            this.logger.log(
              colors.green(`Refunded ${refundAmount} to user ${dbTransaction.user_id}`)
            );
          }
        }
      });

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


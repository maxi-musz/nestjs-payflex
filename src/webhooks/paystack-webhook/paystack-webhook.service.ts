import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendDepositNotificationEmail } from 'src/common/mailer/send-email';
import * as colors from 'colors/safe';
import * as crypto from 'crypto';

@Injectable()
export class PaystackWebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verify Paystack webhook signature
   */
  verifySignature(rawBody: Buffer, signature: string): boolean {
    const secretKey = 
      process.env.NODE_ENV === 'development'
        ? this.configService.get<string>('PAYSTACK_TEST_SECRET_KEY')
        : this.configService.get<string>('PAYSTACK_LIVE_SECRET_KEY');

    if (!secretKey) {
      console.warn(colors.yellow('Paystack secret key not configured, skipping signature verification'));
      return false;
    }

    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');
    
    return computedHash === signature;
  }

  /**
   * Handle Paystack webhook events
   */
  async handleWebhookEvent(payload: any, rawBody: Buffer, signature: string): Promise<void> {
    // Verify webhook signature
    if (signature && rawBody) {
      const isValid = this.verifySignature(rawBody, signature);
      
      if (!isValid) {
        console.error(colors.red('Invalid Paystack webhook signature'));
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const { event, data } = payload;
    console.log(colors.green(`Processing Paystack event: ${event}`));

    // Handle different Paystack events
    switch (event) {
      case 'charge.success':
      case 'transaction.success':
        await this.handlePaymentSuccess(data);
        break;

      case 'charge.failed':
      case 'transaction.failed':
        await this.handlePaymentFailed(data);
        break;

      case 'transfer.success':
        await this.handleTransferSuccess(data);
        break;

      case 'transfer.failed':
        await this.handleTransferFailed(data);
        break;

      default:
        console.warn(colors.yellow(`Unhandled Paystack event: ${event}`));
    }
  }

  /**
   * Handle Paystack payment success webhook
   * Handles both regular payments and DVA (Dedicated Virtual Account) payments
   */
  private async handlePaymentSuccess(data: any): Promise<void> {
    try {
      const { reference, amount, status, customer, channel, authorization } = data;
      
      console.log(colors.cyan(`Processing Paystack payment success for reference: ${reference}`));
      console.log(colors.cyan(`Payment channel: ${channel}, Customer: ${customer?.customer_code || 'N/A'}`));

      // Check if this is a DVA payment (bank transfer to dedicated virtual account)
      const isDvaPayment = channel === 'bank_transfer' && 
                           authorization?.receiver_bank_account_number &&
                           authorization?.account_name;

      if (isDvaPayment) {
        // Handle DVA payment
        await this.handleDvaPayment(data);
        return;
      }

      // Handle regular payment (existing logic for card payments, etc.)
      // Find the transaction in database
      const transaction = await this.prisma.transactionHistory.findFirst({
        where: { transaction_reference: reference }
      });

      if (!transaction) {
        console.log(colors.red(`Transaction not found for reference: ${reference}`));
        console.log(colors.yellow(`This might be a DVA payment. Checking customer code...`));
        
        // If no transaction found but we have a customer, try to handle as DVA
        if (customer?.customer_code) {
          console.log(colors.cyan(`Attempting to process as DVA payment...`));
          await this.handleDvaPayment(data);
        }
        return;
      }

      // Check if already processed
      if (transaction.status === 'success') {
        console.log(colors.yellow(`Transaction ${reference} already processed`));
        return;
      }

      // Verify amount matches (amount is in kobo from Paystack)
      const amountInKobo = Math.round((transaction.amount || 0) * 100);
      if (amount !== amountInKobo) {
        console.error(colors.red(`Amount mismatch for transaction ${reference}. Expected: ${amountInKobo}, Got: ${amount}`));
        return;
      }

      // Get user wallet
      const wallet = await this.prisma.wallet.findFirst({
        where: { user_id: transaction.user_id }
      });

      if (!wallet) {
        console.log(colors.red(`Wallet not found for user: ${transaction.user_id}`));
        return;
      }

      // Update transaction status
      await this.prisma.transactionHistory.update({
        where: { id: transaction.id },
        data: {
          status: 'success',
          updatedAt: new Date()
        }
      });

      // Update wallet balance
      const transactionAmount = transaction.amount || 0;
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          current_balance: wallet.current_balance + transactionAmount,
          all_time_fuunding: wallet.all_time_fuunding + transactionAmount,
          updatedAt: new Date()
        }
      });

      console.log(colors.green(`Successfully processed Paystack payment for reference: ${reference}`));
    } catch (error: any) {
      console.error(colors.red(`Error processing Paystack payment success: ${error.message}`));
      console.error(colors.red(`Error stack: ${error.stack}`));
      throw error;
    }
  }

  /**
   * Handle DVA (Dedicated Virtual Account) payment webhook
   * This processes payments received directly to a user's DVA account
   */
  private async handleDvaPayment(data: any): Promise<void> {
    try {
      const { reference, amount, customer, authorization, paid_at, createdAt } = data;
      
      console.log(colors.cyan(`Processing DVA payment for reference: ${reference}`));
      console.log(colors.cyan(`Customer code: ${customer?.customer_code}, Amount: ${amount} kobo`));
      
      // Log full authorization object to see what sender details are available
      if (authorization) {
        console.log(colors.blue(`Authorization details: ${JSON.stringify(authorization, null, 2)}`));
      }
      
      // Extract sender information (Paystack provides this for bank transfers)
      const senderName = authorization?.sender_name || authorization?.sender?.name || null;
      const senderAccountNumber = authorization?.sender_account_number || authorization?.sender?.account_number || null;
      const senderBank = authorization?.sender_bank || authorization?.sender?.bank || null;

      // Validate required data
      if (!customer?.customer_code) {
        console.error(colors.red(`DVA payment missing customer_code in webhook payload`));
        throw new Error('Customer code is required for DVA payment processing');
      }

      if (!reference) {
        console.error(colors.red(`DVA payment missing reference in webhook payload`));
        throw new Error('Transaction reference is required for DVA payment processing');
      }

      // Check for idempotency - prevent duplicate processing
      const existingTransaction = await this.prisma.transactionHistory.findFirst({
        where: { transaction_reference: reference }
      });

      if (existingTransaction) {
        if (existingTransaction.status === 'success') {
          console.log(colors.yellow(`DVA payment ${reference} already processed successfully`));
          return;
        }
        console.log(colors.yellow(`DVA payment ${reference} exists but not successful, updating...`));
      }

      // Find user by Paystack customer code
      const user = await this.prisma.user.findUnique({
        where: { paystack_customer_code: customer.customer_code },
        include: { wallet: true }
      });

      if (!user) {
        console.error(colors.red(`User not found for customer code: ${customer.customer_code}`));
        throw new Error(`User not found for Paystack customer code: ${customer.customer_code}`);
      }

      if (!user.wallet) {
        console.error(colors.red(`Wallet not found for user: ${user.id}`));
        throw new Error(`Wallet not found for user: ${user.id}`);
      }

      // Convert amount from kobo to NGN
      const amountInNgn = amount / 100;
      console.log(colors.cyan(`Processing DVA payment: ${amountInNgn} NGN for user ${user.email}`));

      // Get current wallet balance
      const balanceBefore = user.wallet.current_balance;
      const balanceAfter = balanceBefore + amountInNgn;

      // Create or update transaction history
      let transactionRecord;
      if (existingTransaction) {
        transactionRecord = await this.prisma.transactionHistory.update({
          where: { id: existingTransaction.id },
          data: {
            status: 'success',
            amount: amountInNgn,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            meta_data: {
              paystack_webhook_payload: data,
              webhook_received_at: new Date().toISOString(),
            },
            updatedAt: new Date()
          }
        });
        console.log(colors.green(`Updated transaction record for DVA payment: ${reference}`));
        
        // Store sender details if available and not already stored
        if (senderName && senderAccountNumber && senderBank) {
          try {
            // Check if sender details already exist
            const existingSenderDetails = await this.prisma.senderDetails.findUnique({
              where: { transaction_id: transactionRecord.id }
            });

            if (existingSenderDetails) {
              // Update existing sender details
              await this.prisma.senderDetails.update({
                where: { transaction_id: transactionRecord.id },
                data: {
                  sender_name: senderName,
                  sender_account_number: senderAccountNumber,
                  sender_bank: senderBank,
                }
              });
              console.log(colors.cyan(`✅ Updated sender details for transaction ${reference}`));
            } else {
              // Create new sender details
              await this.prisma.senderDetails.create({
                data: {
                  transaction_id: transactionRecord.id,
                  sender_name: senderName,
                  sender_account_number: senderAccountNumber,
                  sender_bank: senderBank,
                }
              });
              console.log(colors.cyan(`✅ Stored sender details for transaction ${reference}`));
            }
          } catch (senderError: any) {
            // Log but don't fail if sender details creation/update fails
            console.warn(colors.yellow(`⚠️  Could not store sender details: ${senderError.message}`));
          }
        }
      } else {
        // Find the DVA account for this user
        const dvaAccount = await this.prisma.account.findFirst({
          where: {
            user_id: user.id,
            account_status: 'active',
            account_number: authorization?.receiver_bank_account_number || undefined,
          }
        });

        transactionRecord = await this.prisma.transactionHistory.create({
          data: {
            user_id: user.id,
            account_id: dvaAccount?.id || null,
            amount: amountInNgn,
            transaction_type: 'deposit',
            credit_debit: 'credit',
            description: `DVA Payment received via ${authorization?.receiver_bank || 'Bank Transfer'}`,
            status: 'success',
            currency_type: 'ngn',
            payment_method: 'bank_transfer',
            payment_channel: 'paystack',
            transaction_reference: reference,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            meta_data: {
              paystack_webhook_payload: data,
              webhook_received_at: new Date().toISOString(),
            },
            createdAt: paid_at ? new Date(paid_at) : new Date(),
          }
        });
        console.log(colors.green(`Created transaction record for DVA payment: ${reference}`));
        
        // Store sender details if available
        if (senderName && senderAccountNumber && senderBank) {
          try {
            await this.prisma.senderDetails.create({
              data: {
                transaction_id: transactionRecord.id,
                sender_name: senderName,
                sender_account_number: senderAccountNumber,
                sender_bank: senderBank,
              }
            });
            console.log(colors.cyan(`✅ Stored sender details for transaction ${reference}`));
          } catch (senderError: any) {
            // Log but don't fail if sender details creation fails
            console.warn(colors.yellow(`⚠️  Could not store sender details: ${senderError.message}`));
          }
        } else {
          console.log(colors.yellow(`⚠️  Sender details not available in webhook payload`));
        }
      }

      // Update wallet balance
      await this.prisma.wallet.update({
        where: { id: user.wallet.id },
        data: {
          current_balance: balanceAfter,
          all_time_fuunding: user.wallet.all_time_fuunding + amountInNgn,
          updatedAt: new Date()
        }
      });

      console.log(colors.green(`✅ Successfully processed DVA payment:`));
      console.log(colors.green(`   Reference: ${reference}`));
      console.log(colors.green(`   User: ${user.email}`));
      console.log(colors.green(`   Amount: ${amountInNgn} NGN`));
      console.log(colors.green(`   Balance: ${balanceBefore} → ${balanceAfter} NGN`));
      console.log(colors.green(`   Account: ${authorization?.receiver_bank_account_number || 'N/A'}`));

      // Send deposit notification email (non-blocking - don't fail if email fails)
      try {
        // Get bank name from authorization or DVA account
        const bankName = authorization?.receiver_bank || 
                        (await this.prisma.account.findFirst({
                          where: {
                            user_id: user.id,
                            account_status: 'active',
                            account_number: authorization?.receiver_bank_account_number || undefined,
                          }
                        }))?.bank_name || 
                        'Bank Transfer';

        const transactionDate = new Date(paid_at || createdAt || new Date()).toLocaleString('en-NG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Lagos'
        });

        await sendDepositNotificationEmail(
          user.email,
          user.first_name || 'Valued Customer',
          amountInNgn,
          balanceAfter,
          reference,
          authorization?.receiver_bank_account_number || 'N/A',
          bankName,
          transactionDate,
          senderName,
          senderAccountNumber,
          senderBank
        );
        
        console.log(colors.cyan(`📧 Deposit notification email sent to ${user.email}`));
      } catch (emailError: any) {
        // Log email error but don't fail the webhook processing
        console.warn(colors.yellow(`⚠️  Failed to send deposit notification email: ${emailError.message}`));
      }

    } catch (error: any) {
      console.error(colors.red(`Error processing DVA payment: ${error.message}`));
      console.error(colors.red(`Error stack: ${error.stack}`));
      throw error;
    }
  }

  /**
   * Handle Paystack payment failed webhook
   */
  private async handlePaymentFailed(data: any): Promise<void> {
    try {
      const { reference } = data;
      
      console.log(colors.cyan(`Processing Paystack payment failure for reference: ${reference}`));

      // Find and update transaction
      const transaction = await this.prisma.transactionHistory.findFirst({
        where: { transaction_reference: reference }
      });

      if (transaction && transaction.status !== 'failed') {
        await this.prisma.transactionHistory.update({
          where: { id: transaction.id },
          data: {
            status: 'failed',
            updatedAt: new Date()
          }
        });

        console.log(colors.green(`Transaction ${reference} marked as failed`));
      }
    } catch (error: any) {
      console.error(colors.red(`Error processing Paystack payment failure: ${error.message}`));
    }
  }

  /**
   * Handle Paystack transfer success webhook
   */
  private async handleTransferSuccess(data: any): Promise<void> {
    try {
      const { reference, amount, status } = data;
      
      console.log(colors.cyan(`Processing Paystack transfer success for reference: ${reference}`));

      const transaction = await this.prisma.transactionHistory.findFirst({
        where: { transaction_reference: reference }
      });

      if (transaction && transaction.status !== 'success') {
        await this.prisma.transactionHistory.update({
          where: { id: transaction.id },
          data: {
            status: 'success',
            updatedAt: new Date()
          }
        });

        console.log(colors.green(`Transfer ${reference} marked as successful`));
      }
    } catch (error: any) {
      console.error(colors.red(`Error processing Paystack transfer success: ${error.message}`));
    }
  }

  /**
   * Handle Paystack transfer failed webhook
   */
  private async handleTransferFailed(data: any): Promise<void> {
    try {
      const { reference, reason } = data;
      
      console.log(colors.cyan(`Processing Paystack transfer failure for reference: ${reference}`));

      const transaction = await this.prisma.transactionHistory.findFirst({
        where: { transaction_reference: reference }
      });

      if (transaction && transaction.status !== 'failed') {
        await this.prisma.transactionHistory.update({
          where: { id: transaction.id },
          data: {
            status: 'failed',
            updatedAt: new Date()
          }
        });

        console.log(colors.green(`Transfer ${reference} marked as failed. Reason: ${reason || 'Unknown'}`));
      }
    } catch (error: any) {
      console.error(colors.red(`Error processing Paystack transfer failure: ${error.message}`));
    }
  }
}


import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider } from './email-providers/email-provider.interface';
import { EmailProviderFactory } from './email-providers/email-provider.factory';
import {
  otpVerificationCodeTemplate,
  depositNotificationTemplate,
  cablePurchaseSuccessTemplate,
} from './email.template';
import {
  supportTicketConfirmationTemplate,
  supportTicketUpdateTemplate,
} from './email-templates/customer-support';

/**
 * Email Service
 * Handles email sending using configured email provider
 * 
 * Supports multiple email providers (Gmail SMTP, SendGrid, etc.)
 * Switch providers via EMAIL_PROVIDER env variable
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private emailProvider: IEmailProvider;

  constructor(
    private configService: ConfigService,
    private emailProviderFactory: EmailProviderFactory,
  ) {
    // Initialize email provider
    this.emailProvider = this.emailProviderFactory.getProvider();
    this.logger.log(
      `Email Service initialized with provider: ${this.emailProvider.getProviderName()}`,
    );
  }

  /**
   * Get current email provider name
   */
  getCurrentProvider(): string {
    return this.emailProvider.getProviderName();
  }

  /**
   * Switch email provider (useful for testing or fallback)
   */
  switchProvider(providerName: string): void {
    this.emailProvider = this.emailProviderFactory.getProvider();
    this.logger.log(`Switched email provider to: ${this.emailProvider.getProviderName()}`);
  }

  /**
   * Send OTP verification email
   */
  async sendOTPEmail(email: string, otp: string, expiryTime: string = '5 minutes'): Promise<void> {
    try {
      this.logger.log(`Sending OTP email to ${email}...`);
      
      const htmlContent = otpVerificationCodeTemplate(email, otp, expiryTime);
      const subject = `Login OTP Confirmation Code: ${otp}`;

      await this.emailProvider.sendEmail(email, subject, htmlContent);
      
      this.logger.log(`OTP email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Error sending OTP email to ${email}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send deposit notification email
   */
  async sendDepositNotificationEmail(
    email: string,
    firstName: string,
    amount: number,
    balanceAfter: number,
    transactionReference: string,
    accountNumber: string,
    bankName: string,
    transactionDate: string,
    senderName?: string | null,
    senderAccountNumber?: string | null,
    senderBank?: string | null,
  ): Promise<void> {
    try {
      this.logger.log(`Sending deposit notification email to ${email}...`);

      const htmlContent = depositNotificationTemplate(
        firstName,
        amount,
        balanceAfter,
        transactionReference,
        accountNumber,
        bankName,
        transactionDate,
        senderName,
        senderAccountNumber,
        senderBank,
      );

      const subject = `✅ Deposit Successful - ${new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(amount)}`;

      await this.emailProvider.sendEmail(email, subject, htmlContent);
      
      this.logger.log(`Deposit notification email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Error sending deposit notification email to ${email}: ${error.message}`,
        error.stack,
      );
      // Don't throw error - email failure shouldn't break transaction processing
      // Just log it for monitoring
    }
  }

  /**
   * Send cable purchase success notification email
   */
  async sendCablePurchaseSuccessEmail(
    email: string,
    firstName: string,
    serviceName: string,
    billersCode: string,
    amount: number,
    transactionReference: string,
    transactionDate: string,
    productName?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Sending cable purchase success email to ${email}...`);

      const htmlContent = cablePurchaseSuccessTemplate(
        firstName,
        serviceName,
        billersCode,
        amount,
        transactionReference,
        transactionDate,
        productName,
      );

      const subject = `✅ ${serviceName} Subscription Successful - ${new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(amount)}`;

      await this.emailProvider.sendEmail(email, subject, htmlContent);
      
      this.logger.log(`Cable purchase success email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Error sending cable purchase success email to ${email}: ${error.message}`,
        error.stack,
      );
      // Don't throw error - email failure shouldn't break transaction processing
      // Just log it for monitoring
    }
  }

  /**
   * Send support ticket confirmation email
   */
  async sendSupportTicketConfirmationEmail(
    email: string,
    ticketNumber: string,
    subject: string,
    description: string,
    createdAt: Date,
  ): Promise<void> {
    try {
      this.logger.log(`Sending support ticket confirmation email to ${email}...`);

      const formattedDate = createdAt.toLocaleString('en-NG', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Africa/Lagos',
      });

      const htmlContent = supportTicketConfirmationTemplate(
        email,
        ticketNumber,
        subject,
        description,
        formattedDate,
      );

      const emailSubject = `Support Ticket Created - ${ticketNumber}`;

      await this.emailProvider.sendEmail(email, emailSubject, htmlContent);
      
      this.logger.log(`Support ticket confirmation email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Error sending support ticket confirmation email to ${email}: ${error.message}`,
        error.stack,
      );
      // Don't throw error - email failure shouldn't break ticket creation
      // Just log it for monitoring
    }
  }

  /**
   * Send support ticket update email (when new message is added to existing ticket)
   */
  async sendSupportTicketUpdateEmail(
    email: string,
    ticketNumber: string,
    subject: string,
    messages: Array<{
      id: string;
      message: string;
      is_from_user: boolean;
      sender_email: string | null;
      sender_name: string | null;
      created_at: Date;
      attachments: any;
    }>,
    totalMessages: number,
    latestMessageDate: Date,
  ): Promise<void> {
    try {
      this.logger.log(`Sending support ticket update email to ${email}...`);

      const formattedDate = latestMessageDate.toLocaleString('en-NG', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Africa/Lagos',
      });

      const htmlContent = supportTicketUpdateTemplate(
        email,
        ticketNumber,
        subject,
        messages,
        totalMessages,
        formattedDate,
      );

      const emailSubject = `New Enquiry Added to Support Ticket - ${ticketNumber}`;

      await this.emailProvider.sendEmail(email, emailSubject, htmlContent);
      
      this.logger.log(`Support ticket update email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Error sending support ticket update email to ${email}: ${error.message}`,
        error.stack,
      );
      // Don't throw error - email failure shouldn't break message addition
      // Just log it for monitoring
    }
  }

  /**
   * Send generic email (for custom use cases)
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    fromName?: string,
    fromEmail?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Sending email to ${to}...`);
      await this.emailProvider.sendEmail(to, subject, htmlContent, fromName, fromEmail);
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending email to ${to}: ${error.message}`, error.stack);
      throw error;
    }
  }
}


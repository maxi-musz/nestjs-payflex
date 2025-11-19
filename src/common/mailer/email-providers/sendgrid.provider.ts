import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider } from './email-provider.interface';

/**
 * SendGrid Email Provider
 * Professional email service with high deliverability
 * 
 * Setup:
 * - SENDGRID_API_KEY: Your SendGrid API key
 * - SENDGRID_FROM_EMAIL: Default sender email
 * - SENDGRID_FROM_NAME: Default sender name (optional, defaults to "SmiPay MFB")
 * 
 * To use SendGrid:
 * 1. Sign up at https://sendgrid.com
 * 2. Create an API key
 * 3. Set SENDGRID_API_KEY in .env
 * 4. Set EMAIL_PROVIDER=sendgrid in .env
 */
@Injectable()
export class SendGridProvider implements IEmailProvider {
  private readonly logger = new Logger(SendGridProvider.name);

  constructor(private configService: ConfigService) {
    // Note: Install @sendgrid/mail package when ready to use
    // npm install @sendgrid/mail
  }

  getProviderName(): string {
    return 'SendGrid';
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    fromName: string = 'SmiPay MFB',
    fromEmail?: string,
  ): Promise<void> {
    try {
      const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
      const defaultFromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');
      
      if (!apiKey) {
        throw new Error('SENDGRID_API_KEY is required but not configured');
      }

      if (!fromEmail && !defaultFromEmail) {
        throw new Error('SENDGRID_FROM_EMAIL is required but not configured');
      }

      // TODO: Implement SendGrid email sending
      // Example implementation (requires @sendgrid/mail package):
      /*
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(apiKey);

      const msg = {
        to: to,
        from: {
          email: fromEmail || defaultFromEmail,
          name: fromName,
        },
        subject: subject,
        html: htmlContent,
      };

      await sgMail.send(msg);
      */

      this.logger.log(`Sending email via SendGrid to ${to}...`);
      
      // Placeholder - implement when ready
      this.logger.warn('SendGrid provider not yet implemented. Please install @sendgrid/mail and uncomment the implementation.');
      throw new Error('SendGrid provider not yet implemented');
      
      // this.logger.log(`Email sent successfully to ${to} via SendGrid`);
    } catch (error) {
      this.logger.error(`Error sending email via SendGrid to ${to}: ${error.message}`, error.stack);
      throw new Error(`Failed to send email via SendGrid: ${error.message}`);
    }
  }
}


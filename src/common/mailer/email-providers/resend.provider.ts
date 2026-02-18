import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { IEmailProvider } from './email-provider.interface';

/**
 * Resend Email Provider
 * Uses Resend API for transactional email (https://resend.com)
 *
 * Setup:
 * - RESEND_API_KEY: Your Resend API key (from https://resend.com/api-keys)
 * - RESEND_FROM_EMAIL: Sender email (must be from a verified domain, or use onboarding@resend.dev for testing)
 * - RESEND_FROM_NAME: Sender name (optional, defaults to "SmiPay MFB")
 *
 * To use Resend:
 * 1. Sign up at https://resend.com
 * 2. Create an API key
 * 3. Verify your domain (or use onboarding@resend.dev for testing)
 * 4. Set RESEND_API_KEY and RESEND_FROM_EMAIL in .env
 * 5. Set EMAIL_PROVIDER=resend in .env
 */
@Injectable()
export class ResendProvider implements IEmailProvider {
  private readonly logger = new Logger(ResendProvider.name);
  private readonly resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured. Email sending will fail.');
    }
    this.resend = new Resend(apiKey);
    this.logger.log('Resend provider initialized');
  }

  getProviderName(): string {
    return 'Resend';
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    fromName: string = 'SmiPay MFB',
    fromEmail?: string,
  ): Promise<void> {
    const defaultFromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');
    const displayName =
      this.configService.get<string>('RESEND_FROM_NAME') || fromName;

    const fromAddress = fromEmail || defaultFromEmail;
    if (!fromAddress) {
      throw new Error(
        'RESEND_FROM_EMAIL is required but not configured (or pass fromEmail)',
      );
    }

    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required but not configured');
    }

    const from = `${displayName} <${fromAddress}>`;

    try {
      this.logger.log(`Sending email via Resend to ${to}...`);
      const { data, error } = await this.resend.emails.send({
        from,
        to: [to],
        subject,
        html: htmlContent,
      });

      if (error) {
        this.logger.error(
          `Resend API error for ${to}: ${error.message}`,
          JSON.stringify(error),
        );
        throw new Error(`Resend failed: ${error.message}`);
      }

      this.logger.log(`Email sent successfully to ${to} via Resend (id: ${data?.id})`);
    } catch (error: any) {
      this.logger.error(
        `Error sending email via Resend to ${to}: ${error?.message || error}`,
        error?.stack,
      );
      throw new Error(`Failed to send email via Resend: ${error?.message || error}`);
    }
  }
}

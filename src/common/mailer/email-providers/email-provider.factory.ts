import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider } from './email-provider.interface';
import { GmailSmtpProvider } from './gmail-smtp.provider';
import { SendGridProvider } from './sendgrid.provider';

/**
 * Email Provider Factory
 * Creates and returns the appropriate email provider based on configuration
 * 
 * To switch providers, set EMAIL_PROVIDER in .env:
 * - "gmail" or "gmail-smtp" (default - uses Gmail SMTP)
 * - "sendgrid" (professional email service)
 * 
 * Default: "gmail"
 */
@Injectable()
export class EmailProviderFactory {
  private readonly logger = new Logger(EmailProviderFactory.name);

  constructor(private configService: ConfigService) {}

  /**
   * Get the configured email provider
   */
  getProvider(): IEmailProvider {
    const providerName = this.configService
      .get<string>('EMAIL_PROVIDER')
      ?.toLowerCase() || 'gmail'; // Default to Gmail

    this.logger.log(`Initializing email provider: ${providerName}`);

    switch (providerName) {
      case 'gmail':
      case 'gmail-smtp':
        return new GmailSmtpProvider(this.configService);

      case 'sendgrid':
        return new SendGridProvider(this.configService);

      default:
        this.logger.warn(
          `Unknown email provider "${providerName}", defaulting to Gmail SMTP`,
        );
        return new GmailSmtpProvider(this.configService);
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return ['gmail', 'gmail-smtp', 'sendgrid'];
  }
}

 
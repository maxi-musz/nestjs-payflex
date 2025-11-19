import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailProviderFactory } from './email-providers/email-provider.factory';
import { GmailSmtpProvider } from './email-providers/gmail-smtp.provider';
import { SendGridProvider } from './email-providers/sendgrid.provider';

/**
 * Email Module
 * Provides email sending functionality with provider switching capability
 */
@Module({
  providers: [
    EmailService,
    EmailProviderFactory,
    GmailSmtpProvider,
    SendGridProvider,
  ],
  exports: [EmailService],
})
export class EmailModule {}


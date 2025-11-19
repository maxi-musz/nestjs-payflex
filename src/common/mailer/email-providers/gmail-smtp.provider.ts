import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailProvider } from './email-provider.interface';

/**
 * Gmail SMTP Email Provider
 * Uses Gmail SMTP server with nodemailer
 * 
 * Setup:
 * - EMAIL_USER: Your Gmail address
 * - EMAIL_PASSWORD: Gmail app password (not regular password)
 * - GOOGLE_SMTP_HOST: smtp.gmail.com (default)
 * - GOOGLE_SMTP_PORT: 587 (default)
 */
@Injectable()
export class GmailSmtpProvider implements IEmailProvider {
  private readonly logger = new Logger(GmailSmtpProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  getProviderName(): string {
    return 'Gmail SMTP';
  }

  /**
   * Initialize nodemailer transporter
   */
  private initializeTransporter(): void {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');
    const host = this.configService.get<string>('GOOGLE_SMTP_HOST') || 'smtp.gmail.com';
    const port = this.configService.get<number>('GOOGLE_SMTP_PORT') || 587;

    if (!emailUser || !emailPassword) {
      this.logger.warn('Gmail SMTP credentials not configured. Email sending will fail.');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: host,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    this.logger.log('Gmail SMTP transporter initialized');
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    fromName: string = 'SmiPay MFB',
    fromEmail?: string,
  ): Promise<void> {
    try {
      const emailUser = this.configService.get<string>('EMAIL_USER');
      
      if (!emailUser || !this.configService.get<string>('EMAIL_PASSWORD')) {
        throw new Error('Gmail SMTP credentials missing in environment variables');
      }

      const mailOptions = {
        from: {
          name: fromName,
          address: fromEmail || emailUser,
        },
        to: to,
        subject: subject,
        html: htmlContent,
      };

      this.logger.log(`Sending email via Gmail SMTP to ${to}...`);
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to} via Gmail SMTP`);
    } catch (error) {
      this.logger.error(`Error sending email via Gmail SMTP to ${to}: ${error.message}`, error.stack);
      throw new Error(`Failed to send email via Gmail SMTP: ${error.message}`);
    }
  }
}


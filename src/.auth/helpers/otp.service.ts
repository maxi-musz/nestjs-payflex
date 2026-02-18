import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SmsProviderFactory } from './sms-providers/sms-provider.factory';
import { ISmsProvider } from './sms-providers/sms-provider.interface';

/**
 * OTP Service for Phone Number Verification
 * Handles OTP generation, storage, and sending
 * 
 * Supports multiple SMS providers (Termii, BulkSMS, etc.)
 * Switch providers via SMS_PROVIDER env variable
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 5;
  private smsProvider: ISmsProvider;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private smsProviderFactory: SmsProviderFactory,
  ) {
    // Initialize SMS provider
    this.smsProvider = this.smsProviderFactory.getProvider();
    this.logger.log(
      `OTP Service initialized with provider: ${this.smsProvider.getProviderName()}`,
    );
  }

  /**
   * Generate 4-digit OTP
   */
  generateOTP(): string {
    const otp = crypto.randomInt(100000, 999999).toString().slice(0, 6); // Generate 6-digit OTP
    this.logger.log(`Generated OTP: ${otp}`);
    return otp;
  }

  /**
   * Store OTP in registration progress
   */
  async storeOTP(phoneNumber: string, otp: string): Promise<void> {
    try {
      const otpExpiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      await this.prisma.registrationProgress.upsert({
        where: { phone_number: phoneNumber },
        update: {
          otp,
          otp_expires_at: otpExpiresAt,
        },
        create: {
          phone_number: phoneNumber,
          otp,
          otp_expires_at: otpExpiresAt,
          current_step: 1,
          total_steps: 9,
        },
      });

      this.logger.log(`OTP stored for ${phoneNumber}. Expires at: ${otpExpiresAt.toISOString()}`);
    } catch (error) {
      this.logger.error(`Error storing OTP for ${phoneNumber}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send OTP via SMS using configured provider
   * Provider is determined by SMS_PROVIDER env variable
   * 
   * Supported providers:
   * - termii (recommended - fastest, 1-3 seconds delivery)
   * - bulksms (legacy)
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    try {
      const providerName = this.smsProvider.getProviderName();
      this.logger.log(`Sending OTP to ${phoneNumber} via ${providerName}...`);

      // Prepare SMS message
      const message = `Your SmiPay verification code is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Never share this code with anyone. If you didn't request this code, please ignore this message and contact support.`;

      // Send SMS via configured provider
      await this.smsProvider.sendSms(phoneNumber, message, otp);

      this.logger.log(`OTP sent successfully to ${phoneNumber} via ${providerName}`);
    } catch (error) {
      this.logger.error(
        `Error sending OTP to ${phoneNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get current SMS provider name
   */
  getCurrentProvider(): string {
    return this.smsProvider.getProviderName();
  }

  /**
   * Switch SMS provider (useful for testing or fallback)
   */
  switchProvider(providerName: string): void {
    // Re-initialize provider factory to get new provider
    // Note: This creates a new instance, for production consider caching
    this.smsProvider = this.smsProviderFactory.getProvider();
    this.logger.log(`Switched SMS provider to: ${this.smsProvider.getProviderName()}`);
  }

  /**
   * Generate and send OTP
   */
  async generateAndSendOTP(phoneNumber: string): Promise<string> {
    try {
      this.logger.log(`Generating and sending OTP for ${phoneNumber}...`);
      const otp = this.generateOTP();
      await this.storeOTP(phoneNumber, otp);
      await this.sendOTP(phoneNumber, otp);
      this.logger.log(`OTP generation and sending completed for ${phoneNumber}`);
      return otp;
    } catch (error) {
      this.logger.error(`Error in generateAndSendOTP for ${phoneNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get OTP expiry time in seconds
   */
  getOTPExpirySeconds(): number {
    return this.OTP_EXPIRY_MINUTES * 60;
  }
}



import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ISmsProvider } from './sms-provider.interface';

/**
 * BulkSMS Nigeria Provider
 * Legacy provider, kept for backward compatibility
 * 
 * Setup:
 * - BULKSMSTOKEN: Your BulkSMS API token
 */
@Injectable()
export class BulkSmsProvider implements ISmsProvider {
  private readonly logger = new Logger(BulkSmsProvider.name);

  constructor(private configService: ConfigService) {}

  getProviderName(): string {
    return 'BulkSMS Nigeria';
  }

  async sendSms(phoneNumber: string, message: string, otp?: string): Promise<void> {
    try {
      this.logger.log(`Sending SMS via BulkSMS to ${phoneNumber}...`);

      const token = this.configService.get<string>('BULKSMSTOKEN');
      if (!token) {
        this.logger.error('BULKSMSTOKEN is not configured');
        throw new Error('BULKSMSTOKEN is not configured');
      }

      // Format phone number (remove + if present, BulkSMS expects format like 2348012345678)
      const formattedPhone = phoneNumber.replace(/^\+/, '');

      // Send SMS via BulkSMS API
      const response = await axios.request({
        url: 'https://www.bulksmsnigeria.com/api/v2/sms',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          from: 'SmiPay',
          to: formattedPhone,
          body: message,
          gateway: '1', // Default gateway
          append_sender: '1',
        },
        timeout: 20000,
        maxRedirects: 10,
        validateStatus: () => true,
      });

      this.logger.log(`BulkSMS Response: ${JSON.stringify(response.data)}`);

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`SMS sent successfully via BulkSMS to ${phoneNumber}`);
      } else {
        const errorMessage =
          response.data?.error?.message ||
          response.data?.message ||
          `Failed to send SMS via BulkSMS. Status: ${response.status}`;
        
        this.logger.error(`BulkSMS error: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(
        `Error sending SMS via BulkSMS to ${phoneNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}


import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ISmsProvider } from './sms-provider.interface';

/**
 * Termii SMS Provider
 * Fast delivery (1-3 seconds), reliable, recommended for OTP
 * 
 * Setup:
 * - TERMII_LIVE_API_KEY: Your Termii API key
 * - TERMII_BASE_URL: https://v3.api.termii.com
 * - TERMII_SENDER_ID: Your sender ID (e.g., "SmiPay")
 * - TERMII_CHANNEL: "dnd" (recommended) or "generic"
 */
@Injectable()
export class TermiiProvider implements ISmsProvider {
  private readonly logger = new Logger(TermiiProvider.name);

  constructor(private configService: ConfigService) {}

  getProviderName(): string {
    return 'Termii';
  }

  async sendSms(phoneNumber: string, message: string, otp?: string): Promise<void> {
    try {
      this.logger.log(`Sending SMS via Termii to ${phoneNumber}...`);

      const apiKey = this.configService.get<string>('TERMII_LIVE_API_KEY');
      const baseUrl = this.configService.get<string>('TERMII_BASE_URL') || 'https://v3.api.termii.com';
      // Use custom sender ID if provided, otherwise use Termii's default "Termii"
      const customSenderId = this.configService.get<string>('TERMII_SENDER_ID');
      const senderId = customSenderId || 'Best Tech'; // Default to "Termii" if not set
      
      // Note: "dnd" channel requires registered sender ID. Use "generic" if sender ID not verified
      // "generic" channel works without sender ID registration but has time restrictions for MTN
      const preferredChannel = this.configService.get<string>('TERMII_CHANNEL');
      const channel = preferredChannel || 'dnd'; // Default to "generic" which works without registration

      if (!apiKey) {
        this.logger.error('TERMII_LIVE_API_KEY is required but not configured');
        throw new Error('TERMII_LIVE_API_KEY is required but not configured');
      }

      // Format phone number (Termii expects: 234XXXXXXXXXX, no +)
      const formattedPhone = phoneNumber.replace(/^\+/, '');

      // Prepare request data
      const requestData = {
        api_key: apiKey,
        to: formattedPhone,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: channel,
      };

      this.logger.log(
        `Using sender ID: ${senderId}${customSenderId ? '' : ' (Termii default - use this while your custom sender ID is being verified)'}`,
      );

      // Send SMS via Termii API
      const response = await axios.post(
        `${baseUrl}/api/sms/send`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000, // 15 seconds timeout
          validateStatus: () => true, // Don't throw on non-2xx
        },
      );

      this.logger.log(`Termii Response: ${JSON.stringify(response.data)}`);

      // Check response
      if (response.data && response.data.code === 'ok') {
        this.logger.log(
          `SMS sent successfully via Termii to ${phoneNumber}. Message ID: ${response.data.message_id || 'N/A'}`,
        );
        
        // Log balance if available
        if (response.data.balance) {
          this.logger.log(`Termii account balance: ${response.data.balance}`);
        }
      } else {
        const errorMessage =
          response.data?.message ||
          response.data?.error ||
          `Failed to send SMS via Termii. Status: ${response.status}`;
        
        // Check if error is about sender ID not being verified
        if (
          errorMessage.includes('ApplicationSenderId not found') ||
          errorMessage.includes('senderName') ||
          errorMessage.includes('Sender ID')
        ) {
          // If using "dnd" channel and sender ID not verified, try "generic" channel
          if (channel === 'dnd') {
            this.logger.warn(
              `Sender ID "${senderId}" is not verified for DND channel. Retrying with "generic" channel (works without sender ID registration).`,
            );
            
            // Retry with "generic" channel (doesn't require sender ID registration)
            requestData.channel = 'generic';
            
            const retryResponse = await axios.post(
              `${baseUrl}/api/sms/send`,
              requestData,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                timeout: 15000,
                validateStatus: () => true,
              },
            );

            this.logger.log(`Termii Retry Response (generic channel): ${JSON.stringify(retryResponse.data)}`);

            if (retryResponse.data && retryResponse.data.code === 'ok') {
              this.logger.log(
                `SMS sent successfully via Termii using "generic" channel to ${phoneNumber}. Message ID: ${retryResponse.data.message_id || 'N/A'}`,
              );
              
              if (retryResponse.data.balance) {
                this.logger.log(`Termii account balance: ${retryResponse.data.balance}`);
              }
              
              // Log warning about using generic channel
              this.logger.warn(
                `Using "generic" channel (sender ID not verified for DND). Note: Generic channel has time restrictions for MTN (8PM-8AM). To use DND channel, please register your sender ID "${senderId}" in Termii dashboard.`,
              );
              return; // Success, exit early
            } else {
              const retryErrorMessage =
                retryResponse.data?.message ||
                retryResponse.data?.error ||
                `Failed to send SMS via Termii. Status: ${retryResponse.status}`;
              
              this.logger.error(`Termii retry error (generic channel): ${retryErrorMessage}`);
              throw new Error(
                `${retryErrorMessage}. Please register a sender ID in Termii dashboard or contact Termii support.`,
              );
            }
          } else {
            // Already using generic channel, sender ID still not working
            this.logger.error(
              `Termii error: ${errorMessage}. Sender ID "${senderId}" is not registered. Please register it in Termii dashboard or contact Termii support.`,
            );
            throw new Error(
              `${errorMessage}. Please register your sender ID "${senderId}" in Termii dashboard. Visit: https://termii.com/dashboard`,
            );
          }
        } else {
          // Other error, throw as is
          this.logger.error(`Termii error: ${errorMessage}`);
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error sending SMS via Termii to ${phoneNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}


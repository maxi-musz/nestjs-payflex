import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsProvider } from './sms-provider.interface';
import { TermiiProvider } from './termii.provider';
import { BulkSmsProvider } from './bulksms.provider';

/**
 * SMS Provider Factory
 * Creates and returns the appropriate SMS provider based on configuration
 * 
 * To switch providers, set SMS_PROVIDER in .env:
 * - "termii" (recommended - fastest)
 * - "bulksms" (legacy)
 * 
 * Default: "termii"
 */
@Injectable()
export class SmsProviderFactory {
  private readonly logger = new Logger(SmsProviderFactory.name);

  constructor(private configService: ConfigService) {}

  /**
   * Get the configured SMS provider
   */
  getProvider(): ISmsProvider {
    const providerName = this.configService
      .get<string>('SMS_PROVIDER')
      ?.toLowerCase() || 'termii'; // Default to Termii

    this.logger.log(`Initializing SMS provider: ${providerName}`);

    switch (providerName) {
      case 'termii':
        return new TermiiProvider(this.configService);

      case 'bulksms':
      case 'bulksmsnigeria':
        return new BulkSmsProvider(this.configService);

      default:
        this.logger.warn(
          `Unknown SMS provider "${providerName}", defaulting to Termii`,
        );
        return new TermiiProvider(this.configService);
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return ['termii', 'bulksms'];
  }
}


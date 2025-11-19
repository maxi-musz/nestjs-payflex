import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IKycProvider } from './kyc-provider.interface';
import { NoneProvider } from './none.provider';
import { DojahProvider } from './dojah.provider';
import { SmileIdProvider } from './smileid.provider';

/**
 * KYC Provider Factory
 * Creates and returns the appropriate KYC provider based on configuration
 * 
 * To switch providers, set KYC_PROVIDER in .env:
 * - "none" (for testing - fake verification)
 * - "dojah" (recommended)
 * - "smileid" (placeholder - not yet implemented)
 * 
 * Default: "none" (for development)
 */
@Injectable()
export class KycProviderFactory {
  private readonly logger = new Logger(KycProviderFactory.name);

  constructor(private configService: ConfigService) {}

  /**
   * Get the configured KYC provider
   */
  getProvider(): IKycProvider {
    const providerName = this.configService
      .get<string>('KYC_PROVIDER')
      ?.toLowerCase() || 'none'; // Default to 'none' for development

    this.logger.log(`Initializing KYC provider: ${providerName}`);

    switch (providerName) {
      case 'none':
        return new NoneProvider();

      case 'dojah':
        return new DojahProvider(this.configService);

      case 'smileid':
      case 'smile_id':
        return new SmileIdProvider(this.configService);

      default:
        this.logger.warn(
          `Unknown KYC provider "${providerName}", defaulting to None`,
        );
        return new NoneProvider();
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return ['none', 'dojah', 'smileid'];
  }
}


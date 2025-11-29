import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IBankProvider } from './bank-provider.interface';
import { PaystackBankProvider } from './paystack-bank.provider';
import { FlutterwaveBankProvider } from './flutterwave-bank.provider';

/**
 * Bank Provider Factory
 * Creates and returns the appropriate bank provider based on configuration
 *
 * To switch providers, set BANK_PROVIDER in .env:
 * - "paystack"
 * - "flutterwave"
 *
 * Default: "paystack"
 */
@Injectable()
export class BankProviderFactory {
  private readonly logger = new Logger(BankProviderFactory.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the configured bank provider
   */
  getProvider(): IBankProvider {
    const providerName =
      this.configService.get<string>('BANK_PROVIDER')?.toLowerCase() ||
      'paystack'; // Default to Paystack

    this.logger.log(`Initializing Bank provider: ${providerName}`);

    switch (providerName) {
      case 'paystack':
        return new PaystackBankProvider(this.configService);

      case 'flutterwave':
        return new FlutterwaveBankProvider(this.configService);

      default:
        this.logger.warn(
          `Unknown BANK_PROVIDER "${providerName}", defaulting to Paystack`,
        );
        return new PaystackBankProvider(this.configService);
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return ['paystack', 'flutterwave'];
  }
}



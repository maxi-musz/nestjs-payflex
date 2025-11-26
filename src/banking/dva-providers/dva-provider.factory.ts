import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { IDvaProvider } from './dva-provider.interface';
import { PaystackDvaProvider } from './paystack-dva.provider';
import { WemaDvaProvider } from './wema-dva.provider';

/**
 * DVA Provider Factory
 * Creates and returns the appropriate DVA provider based on configuration
 * 
 * To switch providers, set DVA_PROVIDER in .env:
 * - "paystack" (recommended - fully implemented)
 * - "wema" (placeholder - not yet implemented)
 * 
 * Default: "paystack"
 */
@Injectable()
export class DvaProviderFactory {
  private readonly logger = new Logger(DvaProviderFactory.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get the configured DVA provider
   */
  getProvider(): IDvaProvider {
    const providerName = this.configService
      .get<string>('DVA_PROVIDER')
      ?.toLowerCase() || 'paystack'; // Default to Paystack

    this.logger.log(`Initializing DVA provider: ${providerName}`);

    switch (providerName) {
      case 'paystack':
        return new PaystackDvaProvider(this.configService, this.prisma);

      case 'wema':
        return new WemaDvaProvider(this.configService, this.prisma);

      default:
        this.logger.warn(
          `Unknown DVA provider "${providerName}", defaulting to Paystack`,
        );
        return new PaystackDvaProvider(this.configService, this.prisma);
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return ['paystack', 'wema'];
  }
}


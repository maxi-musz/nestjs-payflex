import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { IDvaProvider, DvaAssignmentResult, DvaAssignmentOptions } from './dva-provider.interface';

/**
 * Wema DVA Provider
 * Assigns dedicated virtual accounts using Wema Bank API
 * 
 * Setup:
 * - WEMA_API_KEY: Your Wema Bank API key
 * - WEMA_API_URL: Wema Bank API base URL
 * 
 * Note: This is a placeholder implementation. Actual Wema Bank API integration
 * should be implemented based on their API documentation.
 */
@Injectable()
export class WemaDvaProvider implements IDvaProvider {
  private readonly logger = new Logger(WemaDvaProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getProviderName(): string {
    return 'Wema';
  }

  async assignDva(
    userId: string,
    userEmail: string,
    options?: DvaAssignmentOptions,
  ): Promise<DvaAssignmentResult> {
    this.logger.log(`Assigning DVA via Wema for user: ${userEmail}`);

    // TODO: Implement Wema Bank DVA assignment
    // This is a placeholder - actual implementation should:
    // 1. Call Wema Bank API to create virtual account
    // 2. Store account details in database
    // 3. Return account information

    throw new HttpException(
      'Wema Bank DVA provider is not yet implemented. Please use Paystack provider.',
      HttpStatus.NOT_IMPLEMENTED
    );
  }
}


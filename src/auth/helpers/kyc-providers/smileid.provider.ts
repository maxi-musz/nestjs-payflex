import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IKycProvider, KycVerificationResult } from './kyc-provider.interface';

/**
 * SmileID KYC Provider
 * Placeholder for SmileID integration
 * 
 * TODO: Implement SmileID verification
 * Setup:
 * - SMILEID_API_KEY: Your SmileID API key
 * - SMILEID_PARTNER_ID: Your SmileID Partner ID
 * - SMILEID_BASE_URL: SmileID API base URL
 */
@Injectable()
export class SmileIdProvider implements IKycProvider {
  private readonly logger = new Logger(SmileIdProvider.name);

  constructor(private configService: ConfigService) {}

  getProviderName(): string {
    return 'SmileID';
  }

  async verifyNIN(nin: string): Promise<KycVerificationResult> {
    this.logger.warn(`SmileID NIN verification not yet implemented for ${nin.substring(0, 3)}***${nin.substring(8)}`);
    
    // TODO: Implement SmileID NIN verification
    return {
      success: false,
      verified: false,
      error: 'SmileID provider not yet implemented',
    };
  }

  async verifyBVN(bvn: string): Promise<KycVerificationResult> {
    this.logger.warn(`SmileID BVN verification not yet implemented for ${bvn.substring(0, 3)}***${bvn.substring(8)}`);
    
    // TODO: Implement SmileID BVN verification
    return {
      success: false,
      verified: false,
      error: 'SmileID provider not yet implemented',
    };
  }
}


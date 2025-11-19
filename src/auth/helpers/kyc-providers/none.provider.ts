import { Injectable, Logger } from '@nestjs/common';
import { IKycProvider, KycVerificationResult } from './kyc-provider.interface';

/**
 * None KYC Provider
 * For development/testing - returns fake verification without calling external services
 * 
 * Special test cases:
 * - NIN/BVN "1111111111" (10 ones) will return verified: true
 * - All other NINs/BVNs will return verified: false (pending)
 * 
 * Use this when you want to test the flow without real KYC verification
 */
@Injectable()
export class NoneProvider implements IKycProvider {
  private readonly logger = new Logger(NoneProvider.name);

  getProviderName(): string {
    return 'None';
  }

  async verifyNIN(nin: string): Promise<KycVerificationResult> {
    this.logger.log(`[TEST MODE] Fake NIN verification for ${nin.substring(0, 3)}***${nin.substring(8)}`);
    
    // If NIN is 1111111111 (10 ones), mark as verified for testing
    const isVerified = nin === '1111111111';
    
    // Stock African avatar image URL
    const stockAvatarUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces&auto=format';
    
    // Return fake data for testing
    return {
      success: true,
      verified: isVerified,
      data: {
        nin: nin,
        first_name: 'Test',
        last_name: 'User',
        middle_name: '',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        phone_number: '',
        email: '',
        photo: stockAvatarUrl,
      },
      provider_response: {
        mode: 'test',
        message: isVerified 
          ? 'Fake verification - NIN 1111111111 marked as verified for testing'
          : 'Fake verification - no external service called',
      },
    };
  }

  async verifyBVN(bvn: string): Promise<KycVerificationResult> {
    this.logger.log(`[TEST MODE] Fake BVN verification for ${bvn.substring(0, 3)}***${bvn.substring(8)}`);
    
    // If BVN is 1111111111 (10 ones), mark as verified for testing
    const isVerified = bvn === '1111111111';
    
    // Stock African avatar image URL
    const stockAvatarUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces&auto=format';
    
    // Return fake data for testing
    return {
      success: true,
      verified: isVerified,
      data: {
        bvn: bvn,
        first_name: 'Test',
        last_name: 'User',
        middle_name: '',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        phone_number: '',
        email: '',
        photo: stockAvatarUrl,
      },
      provider_response: {
        mode: 'test',
        message: isVerified 
          ? 'Fake verification - BVN 1111111111 marked as verified for testing'
          : 'Fake verification - no external service called',
      },
    };
  }
}


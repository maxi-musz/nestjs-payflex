import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycProviderFactory } from './kyc-providers/kyc-provider.factory';
import { IKycProvider, KycVerificationResult } from './kyc-providers/kyc-provider.interface';
import * as colors from 'colors';

/**
 * KYC Service
 * Handles KYC verification (NIN, BVN, Voters Card) using configured provider
 * 
 * Supports multiple KYC providers (Dojah, SmileID, None)
 * Switch providers via KYC_PROVIDER env variable
 */
@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private kycProvider: IKycProvider;

  constructor(
    private configService: ConfigService,
    private kycProviderFactory: KycProviderFactory,
  ) {
    // Initialize KYC provider
    this.kycProvider = this.kycProviderFactory.getProvider();
    this.logger.log(
      colors.cyan(
        `KYC Service initialized with provider: ${this.kycProvider.getProviderName()}`,
      ),
    );
  }

  /**
   * Verify NIN (National Identification Number)
   * @param nin - NIN number
   * @returns Promise<KycVerificationResult>
   */
  async verifyNIN(nin: string): Promise<KycVerificationResult> {
    try {
      this.logger.log(colors.cyan(`Verifying NIN: ${nin.substring(0, 3)}***${nin.substring(8)}`));
      
      const result = await this.kycProvider.verifyNIN(nin);
      
      if (result.success && result.verified) {
        this.logger.log(
          colors.green(
            `NIN verification successful: ${nin.substring(0, 3)}***${nin.substring(8)}`,
          ),
        );
      } else {
        this.logger.warn(
          colors.yellow(
            `NIN verification failed: ${result.error || 'Unknown error'}`,
          ),
        );
      }
      
      return result;
    } catch (error: any) {
      this.logger.error(
        colors.red(`NIN verification error: ${error.message}`),
        error.stack,
      );
      
      return {
        success: false,
        verified: false,
        error: error.message || 'Verification failed',
      };
    }
  }

  /**
   * Verify BVN (Bank Verification Number)
   * @param bvn - BVN number
   * @returns Promise<KycVerificationResult>
   */
  async verifyBVN(bvn: string): Promise<KycVerificationResult> {
    try {
      this.logger.log(colors.cyan(`Verifying BVN: ${bvn.substring(0, 3)}***${bvn.substring(8)}`));
      
      const result = await this.kycProvider.verifyBVN(bvn);
      
      if (result.success && result.verified) {
        this.logger.log(
          colors.green(
            `BVN verification successful: ${bvn.substring(0, 3)}***${bvn.substring(8)}`,
          ),
        );
      } else {
        this.logger.warn(
          colors.yellow(
            `BVN verification failed: ${result.error || 'Unknown error'}`,
          ),
        );
      }
      
      return result;
    } catch (error: any) {
      this.logger.error(
        colors.red(`BVN verification error: ${error.message}`),
        error.stack,
      );
      
      return {
        success: false,
        verified: false,
        error: error.message || 'Verification failed',
      };
    }
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.kycProvider.getProviderName();
  }
}


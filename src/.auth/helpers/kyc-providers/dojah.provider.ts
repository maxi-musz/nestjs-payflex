import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IKycProvider, KycVerificationResult } from './kyc-provider.interface';

/**
 * Dojah KYC Provider
 * Verifies NIN and BVN using Dojah API
 * 
 * Setup:
 * - DOJAH_APP_ID: Your Dojah App ID
 * - DOJAH_SECRET_KEY: Your Dojah Secret Key (Authorization header)
 * - DOJAH_BASE_URL: https://api.dojah.io (default)
 */
@Injectable()
export class DojahProvider implements IKycProvider {
  private readonly logger = new Logger(DojahProvider.name);

  constructor(private configService: ConfigService) {}

  getProviderName(): string {
    return 'Dojah';
  }

  async verifyNIN(nin: string): Promise<KycVerificationResult> {
    try {
      this.logger.log(`Verifying NIN via Dojah: ${nin.substring(0, 3)}***${nin.substring(8)}`);

      const appId = this.configService.get<string>('DOJAH_APP_ID');
      const secretKey = this.configService.get<string>('DOJAH_SECRET_KEY');
      const baseUrl = this.configService.get<string>('DOJAH_BASE_URL') || 'https://api.dojah.io';

      if (!appId || !secretKey) {
        this.logger.error('DOJAH_APP_ID and DOJAH_SECRET_KEY are required');
        throw new Error('Dojah credentials not configured');
      }

      // Call Dojah NIN lookup endpoint
      const response = await axios.get(`${baseUrl}/api/v1/kyc/nin`, {
        params: {
          nin: nin,
        },
        headers: {
          'AppId': appId,
          'Authorization': secretKey,
        },
      });

      if (response.data && response.data.entity) {
        const entity = response.data.entity;
        
        this.logger.log(`NIN verification successful for ${nin.substring(0, 3)}***${nin.substring(8)}`);

        return {
          success: true,
          verified: true,
          data: {
            nin: nin,
            first_name: entity.first_name || '',
            last_name: entity.last_name || '',
            middle_name: entity.middle_name || '',
            date_of_birth: entity.date_of_birth || '',
            gender: entity.gender || '',
            phone_number: entity.phone_number || '',
            email: entity.email || '',
            photo: entity.photo || '',
            employment_status: entity.employment_status || '',
            marital_status: entity.marital_status || '',
          },
          provider_response: response.data,
        };
      }

      throw new Error('Invalid response from Dojah API');
    } catch (error: any) {
      this.logger.error(`Dojah NIN verification failed: ${error.message}`);

      // Handle specific error cases
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 404 || status === 400) {
          return {
            success: false,
            verified: false,
            error: data?.message || 'NIN not found or invalid',
            provider_response: data,
          };
        }

        return {
          success: false,
          verified: false,
          error: data?.message || 'Verification failed',
          provider_response: data,
        };
      }

      return {
        success: false,
        verified: false,
        error: error.message || 'Verification failed',
      };
    }
  }

  async verifyBVN(bvn: string): Promise<KycVerificationResult> {
    try {
      this.logger.log(`Verifying BVN via Dojah: ${bvn.substring(0, 3)}***${bvn.substring(8)}`);

      const appId = this.configService.get<string>('DOJAH_APP_ID');
      const secretKey = this.configService.get<string>('DOJAH_SECRET_KEY');
      const baseUrl = this.configService.get<string>('DOJAH_BASE_URL') || 'https://api.dojah.io';

      if (!appId || !secretKey) {
        this.logger.error('DOJAH_APP_ID and DOJAH_SECRET_KEY are required');
        throw new Error('Dojah credentials not configured');
      }

      // Call Dojah BVN lookup endpoint
      // Note: Adjust endpoint based on Dojah's actual BVN API
      const response = await axios.get(`${baseUrl}/api/v1/kyc/bvn`, {
        params: {
          bvn: bvn,
        },
        headers: {
          'AppId': appId,
          'Authorization': secretKey,
        },
      });

      if (response.data && response.data.entity) {
        const entity = response.data.entity;
        
        this.logger.log(`BVN verification successful for ${bvn.substring(0, 3)}***${bvn.substring(8)}`);

        return {
          success: true,
          verified: true,
          data: {
            bvn: bvn,
            first_name: entity.first_name || '',
            last_name: entity.last_name || '',
            middle_name: entity.middle_name || '',
            date_of_birth: entity.date_of_birth || '',
            gender: entity.gender || '',
            phone_number: entity.phone_number || '',
            email: entity.email || '',
            photo: entity.photo || '',
          },
          provider_response: response.data,
        };
      }

      throw new Error('Invalid response from Dojah API');
    } catch (error: any) {
      this.logger.error(`Dojah BVN verification failed: ${error.message}`);

      // Handle specific error cases
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 404 || status === 400) {
          return {
            success: false,
            verified: false,
            error: data?.message || 'BVN not found or invalid',
            provider_response: data,
          };
        }

        return {
          success: false,
          verified: false,
          error: data?.message || 'Verification failed',
          provider_response: data,
        };
      }

      return {
        success: false,
        verified: false,
        error: error.message || 'Verification failed',
      };
    }
  }
}


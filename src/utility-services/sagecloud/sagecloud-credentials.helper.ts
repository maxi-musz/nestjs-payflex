import { Logger } from "@nestjs/common";

/**
 * Helper for managing Sagecloud API credentials
 */
export interface SagecloudCredentials {
  baseUrl: string;
  accessToken: string;
}

export class SagecloudCredentialsHelper {
  private static readonly logger = new Logger(SagecloudCredentialsHelper.name);
  /**
   * Get Sagecloud credentials from environment variables
   */
  static getCredentials(): SagecloudCredentials {
    const baseUrl = process.env.SAGECLOUD_BASE_URL || 'https://api.sagecloud.com';
    const accessToken = process.env.SAGECLOUD_ACCESS_TOKEN || '';

    if (!accessToken) {
      this.logger.error('SAGECLOUD_ACCESS_TOKEN is not configured');
      // throw new Error('SAGECLOUD_ACCESS_TOKEN is not configured');
    }

    return {
      baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
      accessToken,
    };
  }

  /**
   * Validate that credentials are configured
   */
  static validateCredentials(): void {
    const credentials = this.getCredentials();
    
    if (!credentials.accessToken) {
      this.logger.error('SAGECLOUD_ACCESS_TOKEN is required');
      // throw new Error('SAGECLOUD_ACCESS_TOKEN is required');
    }
  }
}


import { Injectable } from '@nestjs/common';
import { IUtilityProvider } from './utility-provider.interface';

/**
 * Factory for creating utility service providers based on environment variables
 * 
 * Environment variables:
 * - AIRTIME_PROVIDER: 'vtpass' | 'sagecloud' | 'giftbill' (default: 'vtpass')
 * - DATA_PROVIDER: 'vtpass' | 'sagecloud' | 'giftbill' (default: 'vtpass')
 * - CABLE_PROVIDER: 'vtpass' | 'sagecloud' | 'giftbill' (default: 'vtpass')
 * - ELECTRICITY_PROVIDER: 'vtpass' | 'sagecloud' | 'giftbill' (default: 'vtpass')
 */
@Injectable()
export class UtilityProviderFactory {
  private providers: Map<string, IUtilityProvider> = new Map();

  constructor() {
    // Register providers here
    // This will be populated when providers are implemented
  }

  /**
   * Register a provider
   */
  registerProvider(name: string, provider: IUtilityProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  /**
   * Get provider for airtime service
   */
  getAirtimeProvider(): IUtilityProvider {
    const providerName = (process.env.AIRTIME_PROVIDER || 'vtpass').toLowerCase();
    return this.getProvider(providerName, 'AIRTIME_PROVIDER');
  }

  /**
   * Get provider for data service
   */
  getDataProvider(): IUtilityProvider {
    const providerName = (process.env.DATA_PROVIDER || 'vtpass').toLowerCase();
    return this.getProvider(providerName, 'DATA_PROVIDER');
  }

  /**
   * Get provider for cable service
   */
  getCableProvider(): IUtilityProvider {
    const providerName = (process.env.CABLE_PROVIDER || 'vtpass').toLowerCase();
    return this.getProvider(providerName, 'CABLE_PROVIDER');
  }

  /**
   * Get provider for electricity service
   */
  getElectricityProvider(): IUtilityProvider {
    const providerName = (process.env.ELECTRICITY_PROVIDER || 'vtpass').toLowerCase();
    return this.getProvider(providerName, 'ELECTRICITY_PROVIDER');
  }

  /**
   * Get a provider by name
   */
  private getProvider(providerName: string, envVarName: string): IUtilityProvider {
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(
        `Provider "${providerName}" not found for ${envVarName}. ` +
        `Available providers: ${Array.from(this.providers.keys()).join(', ')}`
      );
    }

    return provider;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IUtilityProvider[] {
    return Array.from(this.providers.values());
  }
}


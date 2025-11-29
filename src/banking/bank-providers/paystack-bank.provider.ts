import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as colors from 'colors/safe';
import { IBankProvider, BankInfo, AccountVerificationResult } from './bank-provider.interface';

export class PaystackBankProvider implements IBankProvider {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = 'https://api.paystack.co';
  }

  getProviderName(): string {
    return 'paystack';
  }

  private getHeaders() {
    const secretKey =
      this.configService.get<string>('PAYSTACK_SECRET_KEY') ||
      this.configService.get<string>('PAYSTACK_TEST_SECRET_KEY');

    return {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async fetchAllBanks(): Promise<BankInfo[]> {
    console.log(colors.cyan('[PaystackBankProvider] Fetching all banks...'));

    const response = await axios.get(`${this.baseUrl}/bank`, {
      headers: this.getHeaders(),
    });

    const { status, data } = response.data;
    if (!status) {
      throw new Error('Paystack returned unsuccessful status while fetching banks');
    }

    const formatted: BankInfo[] = data.map((bank: any) => ({
      id: bank.id,
      name: bank.name,
      code: bank.code,
    }));

    console.log(colors.magenta('[PaystackBankProvider] Fetched all banks successfully'));
    return formatted;
  }

  async verifyAccountNumber(
    account_number: string,
    bank_code: string,
  ): Promise<AccountVerificationResult> {
    console.log(colors.cyan('[PaystackBankProvider] Verifying account number...'));

    try {
      const response = await axios.get(`${this.baseUrl}/bank/resolve`, {
        params: { account_number, bank_code },
        headers: this.getHeaders(),
      });

      const { status, data, message } = response.data;

      if (status) {
        console.log(
          colors.green(
            `[PaystackBankProvider] Account name successfully retrieved: ${data.account_name}`,
          ),
        );
        return {
          success: true,
          account_name: data.account_name,
          provider_response: response.data,
        };
      }

      console.log(
        colors.red(
          `[PaystackBankProvider] Failed to verify bank details: ${message || data?.message}`,
        ),
      );
      return {
        success: false,
        error: message || data?.message || 'Failed to verify bank details',
        provider_response: response.data,
      };
    } catch (error: any) {
      const providerError =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        'Unknown error from Paystack';

      console.error(
        colors.red('[PaystackBankProvider] Error verifying bank details:'),
        error?.response?.data || error,
      );

      return {
        success: false,
        error: providerError,
        provider_response: error?.response?.data || null,
      };
    }
  }
}



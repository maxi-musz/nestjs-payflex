import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import * as colors from 'colors/safe';
import { IBankProvider, BankInfo, AccountVerificationResult } from './bank-provider.interface';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

export class FlutterwaveBankProvider implements IBankProvider {
  private readonly baseUrl: string;
  private readonly logger = new Logger(FlutterwaveBankProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('FLW_BASE_URL') ||
      'https://api.flutterwave.com/v3';
  }

  getProviderName(): string {
    return 'flutterwave';
  }

  private getHeaders() {
    const secretKey =
      this.configService.get<string>('FLW_SECRET_KEY') ||
      this.configService.get<string>('FLUTTERWAVE_SECRET_KEY');

    return {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async fetchAllBanks(): Promise<BankInfo[]> {
    this.logger.log(colors.cyan('[FlutterwaveBankProvider] Fetching all banks...'));

    const response = await axios.get(`${this.baseUrl}/banks/NG`, {
      headers: this.getHeaders(),
    });

    const { status, data } = response.data;
    if (!status) {
      this.logger.error(
        colors.red('[FlutterwaveBankProvider] Failed to fetch banks'),
        response.data,
      );
      // Propagate error to service, which will convert to ApiResponseDto for client
      throw new Error('Flutterwave returned unsuccessful status while fetching banks');
    }

    const formatted: BankInfo[] = data.map((bank: any) => ({
      id: bank.id,
      name: bank.name,
      code: bank.code,
    }));

    this.logger.log(colors.magenta('[FlutterwaveBankProvider] Fetched all banks successfully'));
    return formatted;
  }

  async verifyAccountNumber(
    account_number: string,
    bank_code: string,
  ): Promise<AccountVerificationResult> {
    this.logger.log(colors.cyan('[FlutterwaveBankProvider] Verifying account number...'));

    try {
      const response = await axios.post(
        `${this.baseUrl}/accounts/resolve`,
        {
          account_number,
          account_bank: bank_code,
        },
        {
          headers: this.getHeaders(),
        },
      );

      const { status, data, message } = response.data;

      if (status === 'success' || status === true) {
        this.logger.log(
          colors.green(
            `[FlutterwaveBankProvider] Account name successfully retrieved: ${data.account_name}`,
          ),
        );
        return {
          success: true,
          account_name: data.account_name,
          provider_response: response.data,
        };
      }

      this.logger.error(
        colors.red(
          `[FlutterwaveBankProvider] Failed to verify bank details: ${message || data?.message}`,
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
        'Unknown error from Flutterwave';

      this.logger.error(
        colors.red('[FlutterwaveBankProvider] Error verifying bank details:'),
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



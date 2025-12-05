/**
 * Bank Provider Interface
 * Used for fetching banks and verifying account numbers
 */

export interface BankInfo {
  id: string | number;
  name: string;
  code: string;
  logo_url?: string | null; // Bank logo URL (optional)
}

export interface AccountVerificationResult {
  success: boolean;
  account_name?: string | null;
  error?: string;
  provider_response?: any;
}

export interface IBankProvider {
  /**
   * Fetch list of all banks
   */
  fetchAllBanks(): Promise<BankInfo[]>;

  /**
   * Verify account number + bank code
   */
  verifyAccountNumber(
    account_number: string,
    bank_code: string,
  ): Promise<AccountVerificationResult>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}



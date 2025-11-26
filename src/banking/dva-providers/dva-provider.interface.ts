/**
 * DVA Provider Interface
 * All DVA (Dedicated Virtual Account) providers must implement this interface
 */

export interface DvaAssignmentResult {
  success: boolean;
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_slug?: string;
  currency: string;
  provider_response?: any; // Raw response from provider
  error?: string;
}

export interface DvaAssignmentOptions {
  customer_code?: string;
  preferred_bank?: string;
  country?: string;
  phone_number?: string;
}

export interface IDvaProvider {
  /**
   * Assign a dedicated virtual account to a user
   * @param userId - User ID
   * @param userEmail - User email (can be null, will use phone number as fallback)
   * @param options - Additional options for DVA assignment
   * @returns Promise<DvaAssignmentResult>
   */
  assignDva(
    userId: string,
    userEmail: string | null,
    options?: DvaAssignmentOptions,
  ): Promise<DvaAssignmentResult>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}


/**
 * KYC Provider Interface
 * All KYC verification providers must implement this interface
 */

export interface KycVerificationResult {
  success: boolean;
  verified: boolean;
  data?: {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    date_of_birth?: string;
    gender?: string;
    phone_number?: string;
    email?: string;
    photo?: string;
    // Additional fields for NIN
    nin?: string;
    birth_country?: string;
    birth_lga?: string;
    birth_state?: string;
    residence_address_line_1?: string;
    residence_lga?: string;
    residence_state?: string;
    // Additional fields for BVN
    bvn?: string;
    // Common fields
    [key: string]: any;
  };
  error?: string;
  provider_response?: any; // Raw response from provider
}

export interface IKycProvider {
  /**
   * Verify NIN (National Identification Number)
   * @param nin - NIN number
   * @returns Promise<KycVerificationResult>
   */
  verifyNIN(nin: string): Promise<KycVerificationResult>;

  /**
   * Verify BVN (Bank Verification Number)
   * @param bvn - BVN number
   * @returns Promise<KycVerificationResult>
   */
  verifyBVN(bvn: string): Promise<KycVerificationResult>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}


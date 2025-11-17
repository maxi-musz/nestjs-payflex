/**
 * SMS Provider Interface
 * All SMS providers must implement this interface
 */
export interface ISmsProvider {
  /**
   * Send SMS/OTP to a phone number
   * @param phoneNumber - Phone number in E.164 format (+234XXXXXXXXXX)
   * @param message - Message to send
   * @param otp - Optional OTP code (for logging purposes)
   * @returns Promise<void>
   */
  sendSms(phoneNumber: string, message: string, otp?: string): Promise<void>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}


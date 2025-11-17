/**
 * Phone Number Validation and Formatting Utilities
 */

export class PhoneValidator {
  /**
   * Validates phone number format (E.164: +234XXXXXXXXXX)
   */
  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+234[0-9]{10}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Formats phone number to E.164 format
   * Converts: 08012345678, 2348012345678, 8012345678 → +2348012345678
   */
  static formatPhoneToE164(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // If starts with 0, replace with +234
    if (digits.startsWith('0')) {
      return '+234' + digits.substring(1);
    }

    // If starts with 234, add +
    if (digits.startsWith('234')) {
      return '+' + digits;
    }

    // If 10 digits, assume Nigerian number
    if (digits.length === 10) {
      return '+234' + digits;
    }

    // If already in E.164 format, return as is
    if (phone.startsWith('+234')) {
      return phone;
    }

    return phone;
  }

  /**
   * Validates referral code format
   */
  static validateReferralCode(code: string): boolean {
    if (!code) return false;
    const referralRegex = /^[A-Za-z0-9]{3,20}$/;
    return referralRegex.test(code);
  }
}


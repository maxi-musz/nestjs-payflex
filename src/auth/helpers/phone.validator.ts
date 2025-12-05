/**
 * Phone Number Validation and Formatting Utilities
 * 
 * Note: Phone numbers are stored and validated in format: 234XXXXXXXXXX (no + prefix)
 * This format is compatible with Termii and other SMS providers that don't require the + sign
 */

export class PhoneValidator {
  /**
   * Validates phone number format (234XXXXXXXXXX - 13 digits total: 234 + 10 digits)
   */
  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^234[0-9]{10}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Formats phone number to standard format: 234XXXXXXXXXX (no + prefix)
   * Converts: 08012345678, +2348012345678, 2348012345678, 8012345678 → 2348012345678
   */
  static formatPhoneToE164(phone: string): string {
    // Remove all non-digits (including + sign)
    const digits = phone.replace(/\D/g, '');

    // If starts with 0, replace with 234
    if (digits.startsWith('0')) {
      return '234' + digits.substring(1);
    }

    // If already starts with 234, return as is (fix bug where it was duplicating)
    if (digits.startsWith('234')) {
      return digits; // Return digits as-is, don't duplicate 234
    }

    // If 10 digits, assume Nigerian number and add 234 prefix
    if (digits.length === 10) {
      return '234' + digits;
    }

    // If already in correct format (starts with 234), return as is
    if (phone.startsWith('234')) {
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


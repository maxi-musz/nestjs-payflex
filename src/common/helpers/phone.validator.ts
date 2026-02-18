export class PhoneValidator {
  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^234[0-9]{10}$/;
    return phoneRegex.test(phone);
  }

  static formatPhoneToE164(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    if (digits.startsWith('0')) {
      return '234' + digits.substring(1);
    }

    if (digits.startsWith('234')) {
      return digits;
    }

    if (digits.length === 10) {
      return '234' + digits;
    }

    if (phone.startsWith('234')) {
      return phone;
    }

    return phone;
  }

  static validateReferralCode(code: string): boolean {
    if (!code) return false;
    const referralRegex = /^[A-Za-z0-9]{3,20}$/;
    return referralRegex.test(code);
  }
}

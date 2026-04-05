/**
 * End-user messages for VTpass-backed purchases.
 * Raw provider strings are logged server-side; clients should only see these.
 */

export const DEFAULT_VTPASS_PURCHASE_USER_MESSAGE =
  "We couldn't complete this purchase. Please try again in a few minutes. If the problem continues, contact SmiPay support.";

/**
 * Maps VTpass / network error text to a safe, user-readable message.
 * Unknown or empty input → {@link DEFAULT_VTPASS_PURCHASE_USER_MESSAGE}.
 */
export function toUserFriendlyVtpassPurchaseError(
  raw: string | undefined | null,
): string {
  if (raw == null || typeof raw !== 'string') {
    return DEFAULT_VTPASS_PURCHASE_USER_MESSAGE;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_VTPASS_PURCHASE_USER_MESSAGE;
  }

  const u = trimmed.toUpperCase();

  // VTpass merchant wallet / float (e.g. 018 LOW WALLET BALANCE) or generic insufficient — not SmiPay user balance (that fails earlier)
  if (
    u.includes('LOW WALLET') ||
    u.includes('LOW_WALLET') ||
    u.includes('ADEQUATE FUNDS') ||
    u.includes('NOT ENOUGH FUNDS') ||
    u.includes('INSUFFICIENT')
  ) {
    return DEFAULT_VTPASS_PURCHASE_USER_MESSAGE;
  }

  if (
    u.includes('INVALID METER') ||
    u.includes('WRONG BILLER') ||
    u.includes('WRONG BILLERS') ||
    u.includes('INVALID CUSTOMER') ||
    u.includes('UNKNOWN METER') ||
    u.includes('METER NUMBER')
  ) {
    return 'Please check the meter or account number you entered and try again.';
  }

  if (
    u.includes('INVALID PHONE') ||
    u.includes('INVALID MSISDN') ||
    u.includes('INVALID PHONENUMBER') ||
    u.includes('INVALID PHONE NUMBER')
  ) {
    return 'Please check the phone number you entered and try again.';
  }

  if (
    u.includes('INVALID IUC') ||
    u.includes('INVALID SMARTCARD') ||
    u.includes('INVALID SMART CARD')
  ) {
    return 'Please check your decoder or smart card number and try again.';
  }

  if (
    u.includes('DUPLICATE') ||
    u.includes('DUPLI') ||
    u.includes('ALREADY EXIST') ||
    u.includes('ALREADY BEEN USED')
  ) {
    return 'This purchase may already be in progress. Please wait a moment and check your transaction history before trying again.';
  }

  if (
    u.includes('TIMEOUT') ||
    u.includes('TIMED OUT') ||
    u.includes('ECONNRESET') ||
    u.includes('NETWORK') ||
    u.includes('UNAVAILABLE') ||
    u.includes('SERVICE UNAVAILABLE') ||
    u.includes('TRY AGAIN LATER')
  ) {
    return DEFAULT_VTPASS_PURCHASE_USER_MESSAGE;
  }

  if (u.includes('PRODUCT IS NOT WHITELISTED') || u.includes('NOT WHITELISTED')) {
    return 'This product is temporarily unavailable. Please try again later or contact SmiPay support.';
  }

  if (u.includes('INVALID CREDENTIALS') || u.includes('AUTHENTICATION')) {
    return 'Service is temporarily unavailable. Please try again later or contact SmiPay support.';
  }

  if (u.includes('REVERSAL') || u.includes('REVERSED')) {
    return "This transaction couldn't be completed. If you were charged, your wallet will be updated. Please try again later or contact SmiPay support.";
  }

  return DEFAULT_VTPASS_PURCHASE_USER_MESSAGE;
}

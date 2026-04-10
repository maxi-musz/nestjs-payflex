/**
 * Canonical VTpass response code map — derived from the official VTpass documentation.
 *
 * Source: https://vtpass.com/documentation/response-codes/
 *
 * VTpass says:
 *   "Take any response that differs from the guidelines provided here as pending,
 *    and initiate a transaction requery accordingly."
 *   "If transaction times out or response is not received, treat as pending."
 *   "For any unclear transaction response, always initiate a requery to confirm status."
 *
 * So the SAFE DEFAULT is always **pending** (requery later). Only explicitly documented
 * failure codes should trigger a refund.
 */

// ─── Category types ────────────────────────────────────────────────

export type VtpassCodeCategory =
  | 'success'         // code 000 + delivered — purchase completed
  | 'processing'      // still in-flight; DO NOT refund; requery later
  | 'failed'          // definitive failure; safe to refund
  | 'reversed'        // provider reversed the tx; safe to refund
  | 'input_error'     // bad request data (variation, amount, phone); VTpass never charged — refund
  | 'merchant_error'  // SmiPay/VTpass account problem (locked, suspended, IP, creds); refund
  | 'ambiguous';      // unclear state; treat as pending, requery

// ─── Per-code metadata ─────────────────────────────────────────────

interface VtpassCodeInfo {
  meaning: string;
  category: VtpassCodeCategory;
}

/**
 * Every code documented by VTpass, plus `txStatus` overrides (handled separately).
 * If a code is missing from this map, it is treated as **ambiguous → pending**.
 */
export const VTPASS_RESPONSE_CODES: Record<string, VtpassCodeInfo> = {
  // ── Success / Processing (code 000 needs txStatus sub-check) ──
  '000': { meaning: 'TRANSACTION PROCESSED — check content.transactions.status', category: 'success' },
  '099': { meaning: 'TRANSACTION IS PROCESSING',   category: 'processing' },
  '089': { meaning: 'REQUEST IS PROCESSING',        category: 'processing' },

  // ── Definitive failure ──
  '016': { meaning: 'TRANSACTION FAILED',           category: 'failed' },
  '091': { meaning: 'TRANSACTION NOT PROCESSED',    category: 'failed' },

  // ── Reversal ──
  '040': { meaning: 'TRANSACTION REVERSAL',         category: 'reversed' },

  // ── Input / validation errors (VTpass never processed the purchase) ──
  '010': { meaning: 'VARIATION CODE DOES NOT EXIST',       category: 'input_error' },
  '011': { meaning: 'INVALID ARGUMENTS',                   category: 'input_error' },
  '012': { meaning: 'PRODUCT DOES NOT EXIST',              category: 'input_error' },
  '013': { meaning: 'BELOW MINIMUM AMOUNT ALLOWED',        category: 'input_error' },
  '017': { meaning: 'ABOVE MAXIMUM AMOUNT ALLOWED',        category: 'input_error' },
  '019': { meaning: 'LIKELY DUPLICATE TRANSACTION',        category: 'input_error' },
  '025': { meaning: 'RECIPIENT BANK INVALID',              category: 'input_error' },
  '026': { meaning: 'RECIPIENT ACCOUNT COULD NOT BE VERIFIED', category: 'input_error' },
  '030': { meaning: 'BILLER NOT REACHABLE',                category: 'input_error' },
  '031': { meaning: 'BELOW MINIMUM QUANTITY ALLOWED',      category: 'input_error' },
  '032': { meaning: 'ABOVE MAXIMUM QUANTITY ALLOWED',      category: 'input_error' },
  '034': { meaning: 'SERVICE SUSPENDED',                   category: 'input_error' },
  '035': { meaning: 'SERVICE INACTIVE',                    category: 'input_error' },
  '085': { meaning: 'IMPROPER REQUEST ID FORMAT',          category: 'input_error' },

  // ── Merchant / account errors (our VTpass account, not the end-user) ──
  '018': { meaning: 'LOW WALLET BALANCE (merchant)',       category: 'merchant_error' },
  '021': { meaning: 'ACCOUNT LOCKED',                      category: 'merchant_error' },
  '022': { meaning: 'ACCOUNT SUSPENDED',                   category: 'merchant_error' },
  '023': { meaning: 'API ACCESS NOT ENABLED FOR USER',     category: 'merchant_error' },
  '024': { meaning: 'ACCOUNT INACTIVE',                    category: 'merchant_error' },
  '027': { meaning: 'IP NOT WHITELISTED',                  category: 'merchant_error' },
  '028': { meaning: 'PRODUCT NOT WHITELISTED ON ACCOUNT',  category: 'merchant_error' },
  '083': { meaning: 'SYSTEM ERROR',                        category: 'merchant_error' },
  '087': { meaning: 'INVALID CREDENTIALS',                 category: 'merchant_error' },

  // ── Ambiguous (keep pending, requery) ──
  '001': { meaning: 'TRANSACTION QUERY',                   category: 'ambiguous' },
  '014': { meaning: 'REQUEST ID ALREADY EXIST',            category: 'ambiguous' },
  '015': { meaning: 'INVALID REQUEST ID (requery)',        category: 'ambiguous' },
  '044': { meaning: 'TRANSACTION RESOLVED — contact VTpass', category: 'ambiguous' },
};

// ─── Helpers ────────────────────────────────────────────────────────

export function getVtpassCodeInfo(normalizedCode: string): VtpassCodeInfo | undefined {
  return VTPASS_RESPONSE_CODES[normalizedCode];
}

/**
 * Should this code category trigger a wallet refund?
 * Only definitive failures, reversals, input errors, and merchant errors.
 * NEVER for processing, ambiguous, or unknown codes.
 */
export function shouldRefundForCategory(cat: VtpassCodeCategory): boolean {
  return cat === 'failed' || cat === 'reversed' || cat === 'input_error' || cat === 'merchant_error';
}

/**
 * Should this code category throw an error to the user?
 * Same as refund — if we're refunding, we should tell the user it failed.
 */
export function shouldThrowForCategory(cat: VtpassCodeCategory): boolean {
  return shouldRefundForCategory(cat);
}

/**
 * Map a category to the final transaction status we store in the DB.
 */
export function categoryToStatus(cat: VtpassCodeCategory): 'success' | 'failed' | 'pending' {
  switch (cat) {
    case 'success':       return 'success';
    case 'failed':
    case 'reversed':
    case 'input_error':
    case 'merchant_error': return 'failed';
    case 'processing':
    case 'ambiguous':      return 'pending';
  }
}

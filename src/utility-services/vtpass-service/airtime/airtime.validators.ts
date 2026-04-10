import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import {
  getVtpassCodeInfo,
  categoryToStatus,
  shouldRefundForCategory,
  shouldThrowForCategory,
} from '../vtpass-response-codes';

export interface VtpassCredentials {
  apiKey: string;
  publicKey: string;
  secretKey: string;
  isDevelopment: boolean;
}

export interface TransactionStatusResult {
  finalStatus: 'pending' | 'success' | 'failed';
  shouldRefund: boolean;
  shouldThrow: boolean;
  errorMessage: string;
}

/**
 * VTpass sometimes returns numeric codes (e.g. 0 for success). Using `code || ''`
 * turns 0 into '' and breaks status detection. Normalize to a comparable string.
 */
export function normalizeVtpassResponseCode(code: unknown): string {
  if (code === null || code === undefined) return '';
  if (typeof code === 'number') {
    if (!Number.isFinite(code)) return '';
    if (code === 0) return '000';
    const n = Math.trunc(code);
    const s = String(Math.abs(n));
    return s.length <= 3 ? s.padStart(3, '0') : s;
  }
  const s = String(code).trim();
  if (s === '0' || s === '0.0') return '000';
  return s;
}

/**
 * Masks a key for logging purposes (shows first 8 and last 4 characters)
 */
export function maskKey(key: string | undefined | null): string {
  if (!key) return 'NOT SET';
  if (key.length <= 12) return '***';
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
}

/**
 * Validates and logs VTpass credentials during service initialization
 */
export function validateCredentialsOnInit(
  credentials: VtpassCredentials,
  logger: Logger,
): void {
  const { apiKey, publicKey, secretKey, isDevelopment } = credentials;

  // Log credential status (masked for security)
  logger.log(
    `VTpass credentials status: api-key=${maskKey(apiKey)}, public-key=${maskKey(publicKey)}, secret-key=${maskKey(secretKey)}`,
  );

  if (!apiKey || !publicKey) {
    logger.warn('VTpass API credentials are not fully configured (api/public).');
  }

  if (!secretKey) {
    logger.error(
      'VTpass secret key is not configured (needed for POST requests). This will cause 401 errors on purchase operations.',
    );
  } else if (!secretKey.startsWith('SK_')) {
    logger.warn(
      `VTpass secret key format may be incorrect. Expected format: SK_xxxxx, got: ${secretKey.substring(0, 10)}...`,
    );
  }
}

/**
 * Validates base URL configuration
 */
export function validateBaseUrl(
  baseUrl: string | undefined,
  isDevelopment: boolean,
): string {
  if (!baseUrl) {
    const which = isDevelopment
      ? 'VT_PASS_SANDBOX_API_URL'
      : 'VT_PASS_LIVE_API_URL';
    throw new HttpException(
      `VTpass base URL not configured. Please set ${which}.`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Validates credentials before making POST requests
 */
export function validateCredentialsForPost(
  credentials: VtpassCredentials,
  logger: Logger,
): void {
  const { apiKey, secretKey, publicKey, isDevelopment } = credentials;

  // Check if credentials are missing
  if (!apiKey || !secretKey) {
    const missingKeys: string[] = [];
    if (!apiKey) missingKeys.push('api-key');
    if (!secretKey) missingKeys.push('secret-key');
    logger.error(`Missing VTpass credentials: ${missingKeys.join(', ')}`);
    throw new HttpException(
      `VTpass credentials not configured. Missing: ${missingKeys.join(', ')}. ` +
        `Please set ${isDevelopment ? 'VT_PASS_SANDBOX_' : 'VT_PASS_LIVE_'}${missingKeys
          .map((k: string) => k.toUpperCase().replace('-', '_'))
          .join(' and ')}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // Validate secret key format
  if (!secretKey.startsWith('SK_')) {
    logger.error(
      `Invalid secret key format. Expected format: SK_xxxxx, got: ${secretKey.substring(0, 15)}...`,
    );
    throw new HttpException(
      'VTpass secret key format is invalid. Secret keys should start with "SK_". ' +
        'Please verify your secret key in your VTpass profile and ensure it matches your API key.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // Warn if public key format might be incorrect
  if (publicKey && !publicKey.startsWith('PK_')) {
    logger.warn(
      `Public key format may be incorrect. Expected format: PK_xxxxx`,
    );
  }
}

/**
 * Validates secret key exists before generating POST headers
 */
export function validateSecretKeyForHeaders(
  secretKey: string | undefined,
  logger: Logger,
): void {
  if (!secretKey) {
    logger.error('Secret key is missing! Cannot make POST requests without secret-key.');
    throw new HttpException(
      'VTpass secret key is not configured. Please set VT_PASS_SANDBOX_SECRET_KEY or VT_PASS_SECRET_KEY.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Validates wallet has sufficient balance
 */
export function validateWalletBalance(
  currentBalance: number,
  amount: number,
): void {
  if (currentBalance < amount) {
    throw new HttpException(
      'Insufficient wallet balance',
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Determines transaction status from VTpass API response.
 *
 * Built on the canonical code map in vtpass-response-codes.ts (from official VTpass docs).
 * VTpass rule: "Take any response that differs from the guidelines as pending and requery."
 * So the SAFE DEFAULT is always pending — only documented failure codes trigger a refund.
 */
export function determineTransactionStatus(
  responseCode: unknown,
  txStatus: string,
  responseDescription: string,
  logger?: Logger,
): TransactionStatusResult {
  const code = normalizeVtpassResponseCode(responseCode);
  const codeInfo = getVtpassCodeInfo(code);

  // ── 1. Code 000 is special — need to check content.transactions.status ──
  if (code === '000') {
    if (txStatus === 'delivered') {
      return { finalStatus: 'success', shouldRefund: false, shouldThrow: false, errorMessage: '' };
    }
    if (txStatus === 'failed') {
      return {
        finalStatus: 'failed',
        shouldRefund: true,
        shouldThrow: true,
        errorMessage: responseDescription || 'Transaction failed',
      };
    }
    // pending / initiated / empty → still processing
    logger?.log(`Code 000 but txStatus="${txStatus}" — treating as pending (requery later)`);
    return { finalStatus: 'pending', shouldRefund: false, shouldThrow: false, errorMessage: '' };
  }

  // ── 2. txStatus override: if VTpass says "reversed" regardless of code ──
  if (txStatus === 'reversed') {
    return {
      finalStatus: 'failed',
      shouldRefund: true,
      shouldThrow: true,
      errorMessage: responseDescription || 'Transaction was reversed',
    };
  }

  // ── 3. Look up the code in the canonical map ──
  if (codeInfo) {
    const status = categoryToStatus(codeInfo.category);
    const refund = shouldRefundForCategory(codeInfo.category);
    const throwErr = shouldThrowForCategory(codeInfo.category);

    if (status === 'pending') {
      logger?.log(`VTpass code ${code} (${codeInfo.meaning}) → pending. Will requery.`);
    }
    if (status === 'failed') {
      logger?.warn(`VTpass code ${code} (${codeInfo.meaning}) → failed. Refund=${refund}.`);
    }

    return {
      finalStatus: status,
      shouldRefund: refund,
      shouldThrow: throwErr,
      errorMessage: throwErr
        ? (responseDescription || codeInfo.meaning)
        : '',
    };
  }

  // ── 4. Unknown code — per VTpass docs, treat as PENDING and requery ──
  logger?.warn(
    `Unknown VTpass code "${code}" (raw=${JSON.stringify(responseCode)}), ` +
    `txStatus="${txStatus}", desc="${responseDescription}" → treating as PENDING (safe default).`,
  );
  return { finalStatus: 'pending', shouldRefund: false, shouldThrow: false, errorMessage: '' };
}

/**
 * Handles 401 authentication errors with detailed logging
 * Returns HttpException if it's an authentication error, null otherwise
 */
export function handleAuthenticationError(
  error: any,
  credentials: VtpassCredentials,
  logger: Logger,
): HttpException | null {
  const errorCode = error.response?.data?.code;
  const errorMessage =
    error.response?.data?.message ||
    error.response?.data?.response_description;

  if (errorCode === '087' || errorMessage?.includes('INVALID CREDENTIALS')) {
    const { apiKey, secretKey, isDevelopment } = credentials;

    logger.error(
      'VTpass authentication failed. Possible causes:\n' +
        '1. Secret key does not match the API key (they must be from the same key pair)\n' +
        '2. Secret key is for a different environment (sandbox vs live)\n' +
        '3. Secret key was regenerated and the old one is invalid\n' +
        '4. Keys are from different VTpass accounts\n\n' +
        `Current environment: ${isDevelopment ? 'SANDBOX' : 'LIVE'}\n` +
        `API Key: ${maskKey(apiKey)}\n` +
        `Secret Key: ${maskKey(secretKey)}\n\n` +
        'Action: Please verify your credentials in your VTpass profile and ensure:\n' +
        '- API key and secret key are from the same key pair\n' +
        '- Keys match the environment (sandbox/live)\n' +
        '- Keys have not been regenerated since last update',
    );

    return new HttpException(
      'INVALID CREDENTIALS: Your VTpass secret key does not match your API key. ' +
        'Please verify in your VTpass profile that the secret key and API key are from the same key pair. ' +
        'If you regenerated your keys, update your environment variables.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  // Return null if not an authentication error (caller should handle other errors)
  return null;
}

/**
 * Checks if transaction should be requeried based on age and attempt count
 */
export function shouldRequeryTransaction(
  transactionAge: number,
  requeryCount: number,
  maxRequeryAttempts: number = 3,
  maxAgeMinutes: number = 30,
): { shouldRequery: boolean; reason?: string } {
  if (requeryCount >= maxRequeryAttempts) {
    return {
      shouldRequery: false,
      reason: `Exceeded max requery attempts (${maxRequeryAttempts})`,
    };
  }

  const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
  if (transactionAge > maxAge) {
    return {
      shouldRequery: false,
      reason: `Transaction is too old (${Math.round(transactionAge / 60000)} minutes)`,
    };
  }

  return { shouldRequery: true };
}

/**
 * Generates a VTpass-compliant request ID
 * Format: YYYYMMDDHHII + random alphanumeric suffix (must be 12+ chars, first 12 must be numeric date)
 */
export function generateVtpassRequestId(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const ii = pad(now.getMinutes());
  const base = `${yyyy}${mm}${dd}${hh}${ii}`;
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${base}${suffix}`;
}

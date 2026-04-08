import { HttpException, HttpStatus, Logger } from '@nestjs/common';

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
 * Determines transaction status from VTpass API response
 */
export function determineTransactionStatus(
  responseCode: unknown,
  txStatus: string,
  responseDescription: string,
  logger?: Logger,
): TransactionStatusResult {
  const code = normalizeVtpassResponseCode(responseCode);

  // Determine transaction status based on VTpass documentation
  // Code "000" with status "delivered" = success
  // Code "000" with status "pending" or "initiated" = processing (keep as pending, don't refund)
  // Code "099" = TRANSACTION IS PROCESSING (keep as pending, requery recommended)
  // Code "016" = TRANSACTION FAILED (actual failure)
  // Code "040" = TRANSACTION REVERSAL (refund)
  // Other codes = check response_description for actual status

  const isProcessing =
    (code === '000' && (txStatus === 'pending' || txStatus === 'initiated')) ||
    code === '099' ||
    responseDescription.includes('PROCESSING') ||
    responseDescription.includes('PENDING');

  const isDelivered = code === '000' && txStatus === 'delivered';
  const isReversed = code === '040' || txStatus === 'reversed';
  // Merchant float / partner errors (e.g. 018 LOW WALLET BALANCE) — definitive failure, refund user
  const descU = (responseDescription || '').toUpperCase();
  const isMerchantInsufficient =
    descU.includes('LOW WALLET') ||
    descU.includes('LOW_WALLET') ||
    descU.includes('ADEQUATE FUNDS') ||
    code === '018';
  const isFailed =
    code === '016' ||
    (code === '000' && txStatus === 'failed') ||
    isMerchantInsufficient ||
    (!isProcessing && !isDelivered && !isReversed && code !== '000' && code !== '');

  let finalStatus: 'pending' | 'success' | 'failed' = 'pending';
  let shouldRefund = false;
  let shouldThrow = false;
  let errorMessage = '';

  if (isDelivered) {
    finalStatus = 'success';
  } else if (isReversed) {
    finalStatus = 'failed';
    shouldRefund = true;
    errorMessage = responseDescription || 'Transaction was reversed';
    shouldThrow = true;
  } else if (isFailed) {
    finalStatus = 'failed';
    shouldRefund = true;
    errorMessage = responseDescription || `Transaction failed with code: ${code || 'unknown'}`;
    shouldThrow = true;
  } else if (isProcessing) {
    // Keep as pending - transaction is processing, don't refund yet
    finalStatus = 'pending';
    if (logger) {
      logger.log(
        `Transaction is processing: ${responseDescription || `Status: ${txStatus}`}`,
      );
    }
  } else {
    // Unknown status - treat as pending and log for investigation
    finalStatus = 'pending';
    if (logger) {
      logger.warn(
        `Unknown transaction status. Code: ${responseCode}, Status: ${txStatus}, Description: ${responseDescription}`,
      );
    }
  }

  return {
    finalStatus,
    shouldRefund,
    shouldThrow,
    errorMessage,
  };
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

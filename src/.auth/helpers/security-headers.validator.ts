import { BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Security Headers Validation
 * Validates X-Timestamp, X-Nonce, X-Signature, X-Request-ID, X-Device-ID, X-Device-Fingerprint
 */
export class SecurityHeadersValidator {
  private static readonly logger = new Logger(SecurityHeadersValidator.name);
  /**
   * Validate timestamp (must be within 5 minutes)
   */
  static validateTimestamp(timestamp: string | undefined): void {
    if (!timestamp) {
      SecurityHeadersValidator.logger.error('X-Timestamp header is missing');
      throw new BadRequestException('X-Timestamp header is required');
    }

    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum)) {
      SecurityHeadersValidator.logger.error(`Invalid X-Timestamp format: ${timestamp}`);
      throw new BadRequestException('Invalid X-Timestamp format');
    }

    const now = Date.now();
    const timeDiff = Math.abs(now - timestampNum);
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > maxAge) {
      SecurityHeadersValidator.logger.error(
        `Request expired. Timestamp is too old. Time diff: ${timeDiff}ms, Max age: ${maxAge}ms`,
      );
      throw new BadRequestException('Request expired. Timestamp is too old.');
    }
  }

  /**
   * Validate nonce (must be present)
   */
  static validateNonce(nonce: string | undefined): void {
    if (!nonce) {
      SecurityHeadersValidator.logger.error('X-Nonce header is missing');
      throw new BadRequestException('X-Nonce header is required');
    }

    if (nonce.length < 10) {
      SecurityHeadersValidator.logger.error(`Invalid X-Nonce format. Length: ${nonce.length}, Expected: >= 10`);
      throw new BadRequestException('Invalid X-Nonce format');
    }
  }

  /**
   * Validate signature (basic check - full verification can be added later)
   */
  static validateSignature(signature: string | undefined): void {
    if (!signature) {
      SecurityHeadersValidator.logger.error('X-Signature header is missing');
      throw new BadRequestException('X-Signature header is required');
    }

    if (signature.length < 32) {
      SecurityHeadersValidator.logger.error(`Invalid X-Signature format. Length: ${signature.length}, Expected: >= 32`);
      throw new BadRequestException('Invalid X-Signature format');
    }
  }

  /**
   * Validate request ID (must be present)
   */
  static validateRequestId(requestId: string | undefined): void {
    if (!requestId) {
      SecurityHeadersValidator.logger.error('X-Request-ID header is missing');
      throw new BadRequestException('X-Request-ID header is required');
    }
  }

  /**
   * Validate device ID (must be present)
   */
  static validateDeviceId(deviceId: string | undefined): void {
    if (!deviceId) {
      SecurityHeadersValidator.logger.error('X-Device-ID header is missing');
      throw new BadRequestException('X-Device-ID header is required');
    }
  }

  /**
   * Validate device fingerprint (must be present)
   */
  static validateDeviceFingerprint(fingerprint: string | undefined): void {
    if (!fingerprint) {
      SecurityHeadersValidator.logger.error('X-Device-Fingerprint header is missing');
      throw new BadRequestException('X-Device-Fingerprint header is required');
    }
  }

  /**
   * Validate all security headers
   */
  static validateAllHeaders(headers: {
    'x-timestamp'?: string;
    'x-nonce'?: string;
    'x-signature'?: string;
    'x-request-id'?: string;
    'x-device-id'?: string;
    'x-device-fingerprint'?: string;
  }): void {
    try {
      SecurityHeadersValidator.logger.log('Validating security headers...');
      SecurityHeadersValidator.validateTimestamp(headers['x-timestamp']);
      SecurityHeadersValidator.validateNonce(headers['x-nonce']);
      SecurityHeadersValidator.validateSignature(headers['x-signature']);
      SecurityHeadersValidator.validateRequestId(headers['x-request-id']);
      SecurityHeadersValidator.validateDeviceId(headers['x-device-id']);
      SecurityHeadersValidator.validateDeviceFingerprint(headers['x-device-fingerprint']);
      SecurityHeadersValidator.logger.log('All security headers validated successfully');
    } catch (error) {
      SecurityHeadersValidator.logger.error(`Security header validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify HMAC signature (for future implementation)
   * This would verify the signature against a stored client secret
   */
  static async verifySignature(
    method: string,
    endpoint: string,
    body: any,
    timestamp: string,
    nonce: string,
    signature: string,
    clientSecret: string,
  ): Promise<boolean> {
    const bodyString = JSON.stringify(body);
    const message = `${method}${endpoint}${timestamp}${nonce}${bodyString}`;
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(message)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}


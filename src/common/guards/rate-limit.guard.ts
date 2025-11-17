import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { RegistrationRateLimiter } from 'src/auth/helpers/rate-limiter';
import { SecurityEventService } from 'src/auth/helpers/security-event.service';
import { Reflector } from '@nestjs/core';
import { formatTimeDuration } from 'src/common/helper_functions/time-formatter';

/**
 * Rate Limit Configuration Interface
 */
export interface RateLimitConfig {
  phoneLimit?: number; // Max requests per hour for phone number
  ipLimit?: number; // Max requests per hour for IP
  deviceLimit?: number; // Max requests per hour for device
  windowMs?: number; // Time window in milliseconds
}

/**
 * Metadata key for rate limit configuration
 */
export const RATE_LIMIT_CONFIG_KEY = 'rateLimitConfig';

/**
 * Decorator to configure rate limits per endpoint
 * 
 * Usage:
 * @RateLimit({ phoneLimit: 5, ipLimit: 20, deviceLimit: 10 })
 * @Post('endpoint')
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_CONFIG_KEY, config);

/**
 * Rate Limit Guard
 * Applies rate limiting based on phone number, IP address, and device ID
 * 
 * Usage:
 * @UseGuards(RateLimitGuard)
 * @RateLimit({ phoneLimit: 3, ipLimit: 10, deviceLimit: 5 })
 * @Post('endpoint')
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private rateLimiter: RegistrationRateLimiter,
    private securityEventService: SecurityEventService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Get rate limit configuration from decorator or use defaults
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_CONFIG_KEY,
      handler,
    ) || {
      phoneLimit: 3, // Default: 3 requests per hour
      ipLimit: 10, // Default: 10 requests per hour
      deviceLimit: 5, // Default: 5 requests per hour
      windowMs: 60 * 60 * 1000, // Default: 1 hour
    };

    // Extract identifiers from request
    const phoneNumber = this.extractPhoneNumber(request);
    const deviceId = this.extractDeviceId(request);
    const ipAddress =
      request.ip ||
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.socket.remoteAddress ||
      'unknown';

    // Check phone number rate limit (if phone number is available)
    if (phoneNumber && config.phoneLimit) {
      const phoneLimit = await this.rateLimiter.checkPhoneRateLimit(
        phoneNumber,
      );
      if (!phoneLimit.allowed) {
        const retryAfter = Math.ceil(
          (phoneLimit.resetAt - Date.now()) / 1000,
        );
        await this.securityEventService.logRateLimitExceeded({
          phoneNumber,
          limitType: 'phone',
          retryAfter,
        });
        throw this.createRateLimitError(
          'Too many requests from this phone number',
          retryAfter,
        );
      }
    }

    // Check IP rate limit
    if (config.ipLimit) {
      const ipLimit = await this.rateLimiter.checkIPRateLimit(ipAddress);
      if (!ipLimit.allowed) {
        const retryAfter = Math.ceil((ipLimit.resetAt - Date.now()) / 1000);
        await this.securityEventService.logRateLimitExceeded({
          ipAddress,
          limitType: 'ip',
          retryAfter,
        });
        throw this.createRateLimitError(
          'Too many requests from this IP address',
          retryAfter,
        );
      }
    }

    // Check device rate limit (if device ID is available)
    if (deviceId && config.deviceLimit) {
      const deviceLimit = await this.rateLimiter.checkDeviceRateLimit(deviceId);
      if (!deviceLimit.allowed) {
        const retryAfter = Math.ceil(
          (deviceLimit.resetAt - Date.now()) / 1000,
        );
        await this.securityEventService.logRateLimitExceeded({
          deviceId,
          limitType: 'device',
          retryAfter,
        });
        throw this.createRateLimitError(
          'Too many requests from this device',
          retryAfter,
        );
      }
    }

    return true;
  }

  /**
   * Extract phone number from request body or headers
   */
  private extractPhoneNumber(request: any): string | null {
    return (
      request.body?.phone_number ||
      request.body?.phoneNumber ||
      request.query?.phone_number ||
      null
    );
  }

  /**
   * Extract device ID from request headers or body
   */
  private extractDeviceId(request: any): string | null {
    return (
      request.headers['x-device-id'] ||
      request.headers['X-Device-ID'] ||
      request.body?.device_metadata?.device_id ||
      null
    );
  }

  /**
   * Create rate limit error response
   */
  private createRateLimitError(message: string, retryAfter: number) {
    const formattedTime = formatTimeDuration(retryAfter);

    return new HttpException(
      {
        success: false,
        message: `${message}. Please try again in ${formattedTime}.`,
        error: 'RATE_LIMIT_EXCEEDED',
        retry_after: retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}


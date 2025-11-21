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
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

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

    // Get global rate limit configuration (simple: X requests per Y seconds)
    // Uses environment variables: GLOBAL_RATE_LIMIT_REQUESTS and GLOBAL_RATE_LIMIT_WINDOW_SECONDS
    const maxRequests = process.env.GLOBAL_RATE_LIMIT_REQUESTS
      ? parseInt(process.env.GLOBAL_RATE_LIMIT_REQUESTS, 10)
      : 10; // Default: 10 requests

    const windowSeconds = process.env.GLOBAL_RATE_LIMIT_WINDOW_SECONDS
      ? parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_SECONDS, 10)
      : 60; // Default: 60 seconds (1 minute)

    const windowMs = windowSeconds * 1000;

    // Use same limit for phone, IP, and device (global rate limit)
    const config: RateLimitConfig = {
      phoneLimit: maxRequests,
      ipLimit: maxRequests,
      deviceLimit: maxRequests,
      windowMs: windowMs,
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
   * Returns error in ApiResponseDto format for consistency
   */
  private createRateLimitError(message: string, retryAfter: number) {
    const formattedTime = formatTimeDuration(retryAfter);
    const errorMessage = `${message}. Please try again in ${formattedTime}.`;

    // Create ApiResponseDto format for consistency with other endpoints
    const responseData = {
      error: 'RATE_LIMIT_EXCEEDED',
      retry_after: retryAfter,
      retry_after_formatted: formattedTime,
    };

    // Return as HttpException with ApiResponseDto format
    return new HttpException(
      {
        success: false,
        message: errorMessage,
        data: responseData,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}


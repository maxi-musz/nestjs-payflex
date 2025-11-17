import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Rate Limiting Service for Registration
 * Uses in-memory store (can be upgraded to Redis for production)
 */
@Injectable()
export class RegistrationRateLimiter {
  private readonly logger = new Logger(RegistrationRateLimiter.name);
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * Get rate limit configuration from environment
   */
  private getRateLimitConfig() {
    const windowMs = process.env.REGISTRATION_RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.REGISTRATION_RATE_LIMIT_WINDOW_MS, 10)
      : 60 * 60 * 1000; // Default: 1 hour

    const maxRequests = process.env.REGISTRATION_MAX_REQUESTS_PER_HOUR
      ? parseInt(process.env.REGISTRATION_MAX_REQUESTS_PER_HOUR, 10)
      : 3; // Default: 3 requests per hour

    return { windowMs, maxRequests };
  }

  /**
   * Check if phone number has exceeded rate limit
   */
  async checkPhoneRateLimit(phoneNumber: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    this.logger.log(`Checking phone number rate limit for ${phoneNumber}`);
    const { windowMs, maxRequests } = this.getRateLimitConfig();
    const key = `phone:${phoneNumber}`;
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // New window or expired
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      this.logger.log(`Phone number rate limit set for ${phoneNumber}`);
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    if (entry.count >= maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for phone: ${phoneNumber}. Count: ${entry.count}/${maxRequests}`,
      );
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetTime,
      };
    }

    entry.count++;
    this.logger.log(`Phone number rate limit now ${entry.count} for ${phoneNumber}`);
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetTime,
    };
  }

  /**
   * Check if IP address has exceeded rate limit
   */
  async checkIPRateLimit(ipAddress: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 10; // 10 requests per hour per IP
    const key = `ip:${ipAddress}`;
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      this.logger.log(`IP address rate limit set for ${ipAddress}`);
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    if (entry.count >= maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for IP: ${ipAddress}. Count: ${entry.count}/${maxRequests}`,
      );
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetTime,
      };
    }

    entry.count++;
    this.logger.log(`IP address rate limit now ${entry.count} for ${ipAddress}`);
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetTime,
    };
  }

  /**
   * Check if device has exceeded rate limit
   */
  async checkDeviceRateLimit(deviceId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    this.logger.log(`Checking device rate limit for ${deviceId}`);
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 5; // 5 requests per hour per device
    const key = `device:${deviceId}`;
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      this.logger.log(`Device rate limit set for ${deviceId}`);
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    if (entry.count >= maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for device: ${deviceId}. Count: ${entry.count}/${maxRequests}`,
      );
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetTime,
      };
    }

    entry.count++;
    this.logger.log(`Device rate limit now ${entry.count} for ${deviceId}`);
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetTime,
    };
  }

  /**
   * Clean up expired rate limit entries (run periodically)
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    let cleanedCount = 0;
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }
}


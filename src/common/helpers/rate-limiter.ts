import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RegistrationRateLimiter {
  private readonly logger = new Logger(RegistrationRateLimiter.name);
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(private prisma: PrismaService) {}

  private getRateLimitConfig() {
    const maxRequests = process.env.GLOBAL_RATE_LIMIT_REQUESTS
      ? parseInt(process.env.GLOBAL_RATE_LIMIT_REQUESTS, 10)
      : 10;

    const windowSeconds = process.env.GLOBAL_RATE_LIMIT_WINDOW_SECONDS
      ? parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_SECONDS, 10)
      : 60;

    const windowMs = windowSeconds * 1000;

    return { windowMs, maxRequests };
  }

  async checkPhoneRateLimit(
    phoneNumber: string,
    customLimit?: number,
    customWindowMs?: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    this.logger.log(`Checking phone number rate limit for ${phoneNumber}`);
    const globalConfig = this.getRateLimitConfig();
    const maxRequests = customLimit ?? globalConfig.maxRequests;
    const windowMs = customWindowMs ?? globalConfig.windowMs;
    const key = `phone:${phoneNumber}`;
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    if (entry.count >= maxRequests) {
      this.logger.warn(`Rate limit exceeded for phone: ${phoneNumber}. Count: ${entry.count}/${maxRequests}`);
      return { allowed: false, remaining: 0, resetAt: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetTime };
  }

  async checkIPRateLimit(
    ipAddress: string,
    customLimit?: number,
    customWindowMs?: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const globalConfig = this.getRateLimitConfig();
    const maxRequests = customLimit ?? globalConfig.maxRequests;
    const windowMs = customWindowMs ?? globalConfig.windowMs;
    const key = `ip:${ipAddress}`;
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    if (entry.count >= maxRequests) {
      this.logger.warn(`Rate limit exceeded for IP: ${ipAddress}. Count: ${entry.count}/${maxRequests}`);
      return { allowed: false, remaining: 0, resetAt: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetTime };
  }

  async checkDeviceRateLimit(
    deviceId: string,
    customLimit?: number,
    customWindowMs?: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const globalConfig = this.getRateLimitConfig();
    const maxRequests = customLimit ?? globalConfig.maxRequests;
    const windowMs = customWindowMs ?? globalConfig.windowMs;
    const key = `device:${deviceId}`;
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    if (entry.count >= maxRequests) {
      this.logger.warn(`Rate limit exceeded for device: ${deviceId}. Count: ${entry.count}/${maxRequests}`);
      return { allowed: false, remaining: 0, resetAt: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetTime };
  }

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

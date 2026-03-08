import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Request-level rate limiter using in-memory sliding windows.
 * Tracks actual HTTP requests (not DB records) per user and per IP.
 *
 * For distributed deployments (multiple instances), replace the
 * static Maps with Redis (e.g., ioredis + sorted sets).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private static userBuckets: Map<string, number[]> = new Map();
  private static ipBuckets: Map<string, number[]> = new Map();
  private static lastCleanup = Date.now();
  private static readonly CLEANUP_INTERVAL_MS = 60_000;

  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const ip: string = (req.ip || req.headers['x-forwarded-for'] || '').toString();

    const routePath = req.url || req.path || '';
    const serviceName = this.detectService(routePath);
    const configPrefix = serviceName.toUpperCase();

    // Per-user: requests per window (authenticated users)
    if (user?.sub) {
      const userWindow = Number(this.config.get(`${configPrefix}_RATE_WINDOW_SECONDS`) || 60);
      const userMax = Number(this.config.get(`${configPrefix}_RATE_MAX_REQUESTS`) || 30);
      const userKey = `${user.sub}:${serviceName}`;

      if (this.isOverLimit(RateLimitGuard.userBuckets, userKey, userWindow * 1000, userMax)) {
        this.logger.warn(`User ${user.sub} rate limited on ${serviceName} (${userMax}/${userWindow}s)`);
        throw new ForbiddenException('Rate limit exceeded. Please slow down.');
      }
    }

    // Per-IP: requests per window (catches unauthenticated abuse too)
    if (ip) {
      const ipWindow = Number(this.config.get(`${configPrefix}_IP_RATE_WINDOW_SECONDS`) || 60);
      const ipMax = Number(this.config.get(`${configPrefix}_IP_RATE_MAX_REQUESTS`) || 60);
      const ipKey = `${ip}:${serviceName}`;

      if (this.isOverLimit(RateLimitGuard.ipBuckets, ipKey, ipWindow * 1000, ipMax)) {
        this.logger.warn(`IP ${ip} rate limited on ${serviceName} (${ipMax}/${ipWindow}s)`);
        throw new ForbiddenException('Too many requests from this IP. Please slow down.');
      }
    }

    this.periodicCleanup();
    return true;
  }

  /**
   * Sliding window check: records the current timestamp and returns
   * true if the number of requests in the window exceeds the limit.
   */
  private isOverLimit(
    buckets: Map<string, number[]>,
    key: string,
    windowMs: number,
    maxRequests: number,
  ): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;
    const bucket = (buckets.get(key) || []).filter(ts => ts > cutoff);
    bucket.push(now);
    buckets.set(key, bucket);
    return bucket.length > maxRequests;
  }

  private detectService(routePath: string): string {
    if (routePath.includes('/airtime')) return 'airtime';
    if (routePath.includes('/electricity')) return 'electricity';
    if (routePath.includes('/cable')) return 'cable';
    if (routePath.includes('/education')) return 'education';
    if (routePath.includes('/data')) return 'data';
    return 'utility';
  }

  /**
   * Prevent unbounded memory growth by pruning expired entries
   * every CLEANUP_INTERVAL_MS.
   */
  private periodicCleanup(): void {
    const now = Date.now();
    if (now - RateLimitGuard.lastCleanup < RateLimitGuard.CLEANUP_INTERVAL_MS) return;
    RateLimitGuard.lastCleanup = now;

    const maxWindow = 120_000; // 2 minutes — no window should be longer
    const cutoff = now - maxWindow;

    for (const [buckets] of [[RateLimitGuard.userBuckets], [RateLimitGuard.ipBuckets]]) {
      for (const [key, timestamps] of (buckets as Map<string, number[]>).entries()) {
        const filtered = timestamps.filter(ts => ts > cutoff);
        if (filtered.length === 0) {
          (buckets as Map<string, number[]>).delete(key);
        } else {
          (buckets as Map<string, number[]>).set(key, filtered);
        }
      }
    }
  }
}

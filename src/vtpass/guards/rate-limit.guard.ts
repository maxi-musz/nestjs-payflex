import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  // In-memory IP buckets (per-instance). For distributed rate limiting, use Redis or a DB.
  private static ipBuckets: Map<string, number[]> = new Map();
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.sub) return false;
    const ip: string = (req.ip || req.headers['x-forwarded-for'] || '').toString();
    
    // Detect service type from route path (e.g., /vtpass/airtime, /vtpass/data, /vtpass/cable)
    const routePath = req.url || req.path || '';
    let serviceType: 'airtime' | 'data' | 'cable' = 'data';
    let serviceName = 'utility';
    
    if (routePath.includes('/airtime')) {
      serviceType = 'airtime';
      serviceName = 'airtime';
    } else if (routePath.includes('/cable')) {
      serviceType = 'cable';
      serviceName = 'cable';
    } else if (routePath.includes('/data')) {
      serviceType = 'data';
      serviceName = 'data';
    }

    this.logger.log(`${serviceName} Rate limit guard - IP: ${ip}`);

    // Rate limiting rules: A user can make max 5 transactions per 60 seconds, and an IP can make max 10 requests per 60 seconds
    // To change limits: Update {SERVICE}_RATE_WINDOW_SECONDS (time window), {SERVICE}_RATE_MAX_REQUESTS (user limit), {SERVICE}_IP_RATE_MAX_REQUESTS (IP limit)
    // Example: AIRTIME_RATE_WINDOW_SECONDS=60, AIRTIME_RATE_MAX_REQUESTS=5, AIRTIME_IP_RATE_MAX_REQUESTS=10
    const configPrefix = serviceName.toUpperCase();
    const windowSeconds = Number(this.config.get(`${configPrefix}_RATE_WINDOW_SECONDS`) || 60);
    const maxRequests = Number(this.config.get(`${configPrefix}_RATE_MAX_REQUESTS`) || 5);
    const ipWindowSeconds = Number(this.config.get(`${configPrefix}_IP_RATE_WINDOW_SECONDS`) || windowSeconds);
    const ipMaxRequests = Number(this.config.get(`${configPrefix}_IP_RATE_MAX_REQUESTS`) || maxRequests * 2);

    const since = new Date(Date.now() - windowSeconds * 1000);
    const count = await this.prisma.transactionHistory.count({
      where: {
        user_id: user.sub,
        transaction_type: serviceType,
        createdAt: { gte: since },
      }
    });

    if (count >= maxRequests) {
      throw new ForbiddenException('Rate limit exceeded. Please slow down.');
    }

    // Per-IP sliding window bucket
    if (ip) {
      const now = Date.now();
      const windowStart = now - ipWindowSeconds * 1000;
      const bucket = RateLimitGuard.ipBuckets.get(ip) || [];
      const recent = bucket.filter(ts => ts >= windowStart);
      recent.push(now);
      RateLimitGuard.ipBuckets.set(ip, recent);
      if (recent.length > ipMaxRequests) {
        throw new ForbiddenException('IP rate limit exceeded. Please slow down.');
      }
    }
    return true;
  }
}


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
    this.logger.log(`Rate limit guard - IP: ${ip}`);

    const windowSeconds = Number(this.config.get('DATA_RATE_WINDOW_SECONDS') || 60);
    const maxRequests = Number(this.config.get('DATA_RATE_MAX_REQUESTS') || 5);
    const ipWindowSeconds = Number(this.config.get('DATA_IP_RATE_WINDOW_SECONDS') || windowSeconds);
    const ipMaxRequests = Number(this.config.get('DATA_IP_RATE_MAX_REQUESTS') || maxRequests * 2);

    const since = new Date(Date.now() - windowSeconds * 1000);
    const count = await this.prisma.transactionHistory.count({
      where: {
        user_id: user.sub,
        transaction_type: 'data',
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


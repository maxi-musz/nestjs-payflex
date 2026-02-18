import { Module, Global } from '@nestjs/common';
import { SecurityHeadersGuard } from './guards/security-headers.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RegistrationRateLimiter } from './helpers/rate-limiter';
import { SecurityEventService } from './helpers/security-event.service';

@Global()
@Module({
  providers: [
    SecurityHeadersGuard,
    RateLimitGuard,
    RegistrationRateLimiter,
    SecurityEventService,
  ],
  exports: [SecurityHeadersGuard, RateLimitGuard, RegistrationRateLimiter, SecurityEventService],
})
export class CommonModule {}

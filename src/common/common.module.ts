import { Module, Global } from '@nestjs/common';
import { SecurityHeadersGuard } from './guards/security-headers.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RegistrationRateLimiter } from 'src/auth/helpers/rate-limiter';
import { SecurityEventService } from 'src/auth/helpers/security-event.service';

/**
 * Common Module
 * Provides shared guards and utilities across the application
 */
@Global()
@Module({
  providers: [
    SecurityHeadersGuard,
    RateLimitGuard,
    RegistrationRateLimiter, // Required by RateLimitGuard
    SecurityEventService, // Required by RateLimitGuard
  ],
  exports: [SecurityHeadersGuard, RateLimitGuard],
})
export class CommonModule {}


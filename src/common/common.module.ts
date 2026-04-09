import { Module, Global } from '@nestjs/common';
import { SecurityHeadersGuard } from './guards/security-headers.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RegistrationRateLimiter } from './helpers/rate-limiter';
import { SecurityEventService } from './helpers/security-event.service';
import { WalletIntegrityService } from './wallet-integrity/wallet-integrity.service';

@Global()
@Module({
  providers: [
    SecurityHeadersGuard,
    RateLimitGuard,
    RegistrationRateLimiter,
    SecurityEventService,
    WalletIntegrityService,
  ],
  exports: [
    SecurityHeadersGuard,
    RateLimitGuard,
    RegistrationRateLimiter,
    SecurityEventService,
    WalletIntegrityService,
  ],
})
export class CommonModule {}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SecurityHeadersValidator } from 'src/auth/helpers/security-headers.validator';

/**
 * Security Headers Guard
 * Validates required security headers for protected endpoints
 * 
 * Can be bypassed in development mode or when BYPASS_SECURITY_HEADERS=true
 * 
 * Usage:
 * @UseGuards(SecurityHeadersGuard)
 * @Post('endpoint')
 */
@Injectable()
export class SecurityHeadersGuard implements CanActivate {
  private readonly logger = new Logger(SecurityHeadersGuard.name);

  canActivate(context: ExecutionContext): boolean {
    // Check if security headers should be bypassed (for development/testing)
    const bypassSecurityHeaders = 
      process.env.BYPASS_SECURITY_HEADERS === 'true';

    if (bypassSecurityHeaders) {
      this.logger.warn(
        'Security headers validation bypassed (development mode or BYPASS_SECURITY_HEADERS=true)',
      );
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    try {
      SecurityHeadersValidator.validateAllHeaders({
        'x-timestamp': headers['x-timestamp'] || headers['X-Timestamp'],
        'x-nonce': headers['x-nonce'] || headers['X-Nonce'],
        'x-signature': headers['x-signature'] || headers['X-Signature'],
        'x-request-id': headers['x-request-id'] || headers['X-Request-ID'],
        'x-device-id': headers['x-device-id'] || headers['X-Device-ID'],
        'x-device-fingerprint':
          headers['x-device-fingerprint'] || headers['X-Device-Fingerprint'],
      });

      return true;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Security headers validation failed',
      );
    }
  }
}


import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { SecurityHeadersValidator } from 'src/auth/helpers/security-headers.validator';

/**
 * Security Headers Guard
 * Validates required security headers for protected endpoints
 * 
 * Usage:
 * @UseGuards(SecurityHeadersGuard)
 * @Post('endpoint')
 */
@Injectable()
export class SecurityHeadersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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


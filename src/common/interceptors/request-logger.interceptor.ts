import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as colors from 'colors';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, headers, ip } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const startTime = Date.now();

    // Extract user info if authenticated
    const user = (request as any).user;
    const userId = user?.sub || user?.id || 'Anonymous';
    const userEmail = user?.email || 'N/A';

    // Sanitize sensitive data from body (skip Buffers - e.g. Paystack webhook raw body)
    const sanitizedBody = this.sanitizeRequestBody(body);

    // Log incoming request
    this.logger.log(
      colors.cyan(
        `→ ${method} ${url} | User: ${userId} (${userEmail}) | IP: ${ip || 'Unknown'}`,
      ),
    );

    // Log request body if present (sanitized). Skip Buffers - spreading them produces index→byte noise.
    if (Buffer.isBuffer(body)) {
      this.logger.debug(colors.blue(`  Body: [raw Buffer, ${body.length} bytes]`));
    } else if (sanitizedBody && typeof sanitizedBody === 'object' && Object.keys(sanitizedBody).length > 0) {
      this.logger.debug(
        colors.blue(`  Body: ${JSON.stringify(sanitizedBody, null, 2)}`),
      );
    }

    // Log important headers
    const importantHeaders = {
      'x-request-id': headers['x-request-id'] || headers['X-Request-ID'],
      'x-device-id': headers['x-device-id'] || headers['X-Device-ID'],
      'content-type': headers['content-type'] || headers['Content-Type'],
    };

    if (Object.values(importantHeaders).some((v) => v)) {
      this.logger.debug(
        colors.blue(`  Headers: ${JSON.stringify(importantHeaders, null, 2)}`),
      );
    }

    // Handle response
    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Extract key info from response for concise logging
          let responseSummary = '';
          if (data && typeof data === 'object') {
            // For ApiResponseDto format
            if (data.success !== undefined) {
              responseSummary = `success: ${data.success}`;
              if (data.message) {
                const shortMessage = data.message.length > 60 
                  ? data.message.substring(0, 60) + '...' 
                  : data.message;
                responseSummary += ` | message: "${shortMessage}"`;
              }
            } else {
              // For other response formats, just show type
              responseSummary = `type: ${data.constructor?.name || 'object'}`;
            }
          }

          // Log concise response
          this.logger.log(
            colors.green(
              `← ${method} ${url} | ${statusCode} | ${duration}ms | User: ${userId}${responseSummary ? ' | ' + responseSummary : ''}`,
            ),
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || error.statusCode || 500;

          // Log error
          this.logger.error(
            colors.red(
              `✗ ${method} ${url} | ${statusCode} | ${duration}ms | User: ${userId}`,
            ),
          );

          // Log error details
          this.logger.error(
            colors.red(
              `  Error: ${error.message || 'Unknown error'} | Stack: ${error.stack?.substring(0, 200)}...`,
            ),
          );
        },
      }),
    );
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object' || Buffer.isBuffer(body)) {
      return body;
    }

    const sensitiveFields = [
      'password',
      'pin',
      'transactionPin',
      'currentPin',
      'newPin',
      'otp',
      'token',
      'access_token',
      'refresh_token',
      'authorization',
      'secret',
      'apiKey',
      'api_key',
      'privateKey',
      'private_key',
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}


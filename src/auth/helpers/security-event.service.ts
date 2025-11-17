import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatTimeDuration } from 'src/common/helper_functions/time-formatter';
import * as colors from 'colors';

/**
 * Security Event Logging Service
 * Logs security-related events for fraud detection and monitoring
 */
@Injectable()
export class SecurityEventService {
  private readonly logger = new Logger(SecurityEventService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log a security event
   */
  async logEvent(data: {
    eventType: string;
    eventCategory: 'registration' | 'authentication' | 'transaction' | 'fraud' | 'device' | 'rate_limit';
    severity: 'low' | 'medium' | 'high' | 'critical';
    phoneNumber?: string;
    userId?: string;
    registrationProgressId?: string;
    deviceId?: string;
    deviceFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
    description: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.securityEvent.create({
        data: {
          event_type: data.eventType,
          event_category: data.eventCategory,
          severity: data.severity,
          phone_number: data.phoneNumber || null,
          user_id: data.userId || null,
          registration_progress_id: data.registrationProgressId || null,
          device_id: data.deviceId || null,
          device_fingerprint: data.deviceFingerprint || null,
          ip_address: data.ipAddress || null,
          user_agent: data.userAgent || null,
          description: data.description,
          metadata: data.metadata || null,
        },
      });

      // Log based on severity
      const logMessage = `[${data.severity.toUpperCase()}] ${data.eventType}: ${data.description}`;
      
      switch (data.severity) {
        case 'critical':
          this.logger.error(colors.red(logMessage));
          break;
        case 'high':
          this.logger.warn(colors.yellow(logMessage));
          break;
        case 'medium':
          this.logger.warn(colors.cyan(logMessage));
          break;
        case 'low':
          this.logger.log(colors.gray(logMessage));
          break;
      }
    } catch (error) {
      // Don't throw - security event logging failure shouldn't break the flow
      this.logger.error(
        `Failed to log security event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log device change during registration
   */
  async logDeviceChange(data: {
    phoneNumber: string;
    registrationProgressId: string;
    previousDeviceId: string;
    currentDeviceId: string;
    previousDeviceMetadata?: any;
    currentDeviceMetadata?: any;
    ipAddress?: string;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'device_change_during_registration',
      eventCategory: 'device',
      severity: 'medium',
      phoneNumber: data.phoneNumber,
      registrationProgressId: data.registrationProgressId,
      deviceId: data.currentDeviceId,
      ipAddress: data.ipAddress,
      description: `Device change detected during registration. Previous device: ${data.previousDeviceId}, Current device: ${data.currentDeviceId}`,
      metadata: {
        previous_device_id: data.previousDeviceId,
        current_device_id: data.currentDeviceId,
        previous_device_metadata: data.previousDeviceMetadata,
        current_device_metadata: data.currentDeviceMetadata,
      },
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(data: {
    phoneNumber?: string;
    deviceId?: string;
    ipAddress?: string;
    limitType: 'phone' | 'ip' | 'device';
    retryAfter: number;
  }): Promise<void> {
    const formattedTime = formatTimeDuration(data.retryAfter);
    await this.logEvent({
      eventType: 'rate_limit_exceeded',
      eventCategory: 'rate_limit',
      severity: 'medium',
      phoneNumber: data.phoneNumber,
      deviceId: data.deviceId,
      ipAddress: data.ipAddress,
      description: `Rate limit exceeded for ${data.limitType}. Retry after ${formattedTime}`,
      metadata: {
        limit_type: data.limitType,
        retry_after_seconds: data.retryAfter,
        retry_after_formatted: formattedTime,
      },
    });
  }

  /**
   * Log suspicious registration activity
   */
  async logSuspiciousActivity(data: {
    phoneNumber: string;
    registrationProgressId?: string;
    activity: string;
    reason: string;
    metadata?: any;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'suspicious_registration_activity',
      eventCategory: 'fraud',
      severity: 'high',
      phoneNumber: data.phoneNumber,
      registrationProgressId: data.registrationProgressId,
      description: `Suspicious activity detected: ${data.activity}. Reason: ${data.reason}`,
      metadata: data.metadata,
    });
  }
}


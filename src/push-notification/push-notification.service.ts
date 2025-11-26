import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as colors from 'colors';
import { RegisterDeviceTokenDto, SendPushNotificationDto } from './dto/push-notification.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
  }

  /**
   * Send a batch of messages to Expo Push API
   */
  private async sendToExpo(messages: Array<Record<string, any>>) {
    this.logger.log(colors.cyan(`Sending messages to Expo Push API: ${JSON.stringify(messages)}`));
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };

    const expoAccessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
    if (expoAccessToken) {
      headers.Authorization = `Bearer ${expoAccessToken}`;
    }

    const { data } = await axios.post(this.expoPushUrl, messages, { headers });
    return data;
  }

  /**
   * Register or update a device token for a user
   */
  async registerDeviceToken(
    dto: RegisterDeviceTokenDto,
    userId: string,
  ): Promise<ApiResponseDto<any>> {
    try {
      this.logger.log(colors.cyan(`Registering device token for user: ${userId}`));

      // Check if token already exists
      const existingToken = await this.prisma.deviceToken.findUnique({
        where: { token: dto.token },
      });

      if (existingToken) {
        // Update existing token
        if (existingToken.user_id !== userId) {
          // Token belongs to different user, update it
          const updatedToken = await this.prisma.deviceToken.update({
            where: { token: dto.token },
            data: {
              user_id: userId,
              platform: dto.platform,
              is_active: true,
              device_id: dto.device_id,
              app_version: dto.app_version,
            },
          });

          this.logger.log(colors.green(`✅ Device token updated for user: ${userId}`));
          return new ApiResponseDto(
            true,
            'Device token updated successfully',
            { token_id: updatedToken.id },
          );
        } else {
          // Same user, just update metadata
          const updatedToken = await this.prisma.deviceToken.update({
            where: { token: dto.token },
            data: {
              is_active: true,
              device_id: dto.device_id,
              app_version: dto.app_version,
            },
          });

          this.logger.log(colors.green(`✅ Device token refreshed for user: ${userId}`));
          return new ApiResponseDto(
            true,
            'Device token refreshed successfully',
            { token_id: updatedToken.id },
          );
        }
      } else {
        // Create new token
        const newToken = await this.prisma.deviceToken.create({
          data: {
            user_id: userId,
            token: dto.token,
            platform: dto.platform,
            device_id: dto.device_id,
            app_version: dto.app_version,
            is_active: true,
          },
        });

        this.logger.log(colors.green(`✅ Device token registered for user: ${userId}`));
        return new ApiResponseDto(
          true,
          'Device token registered successfully',
          { token_id: newToken.id },
        );
      }
    } catch (error: any) {
      this.logger.error(colors.red(`Error registering device token: ${error.message}`));
      throw new BadRequestException(`Failed to register device token: ${error.message}`);
    }
  }

  /**
   * Remove a device token (when user logs out or uninstalls app)
   */
  async removeDeviceToken(token: string, userId: string): Promise<ApiResponseDto<any>> {
    try {
      this.logger.log(colors.cyan(`Removing device token for user: ${userId}`));

      const deviceToken = await this.prisma.deviceToken.findUnique({
        where: { token },
      });

      if (!deviceToken) {
        throw new NotFoundException('Device token not found');
      }

      if (deviceToken.user_id !== userId) {
        throw new BadRequestException('Device token does not belong to this user');
      }

      await this.prisma.deviceToken.delete({
        where: { token },
      });

      this.logger.log(colors.green(`✅ Device token removed for user: ${userId}`));
      return new ApiResponseDto(true, 'Device token removed successfully', null);
    } catch (error: any) {
      this.logger.error(colors.red(`Error removing device token: ${error.message}`));
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to remove device token: ${error.message}`);
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendNotificationToUser(
    userId: string,
    notification: SendPushNotificationDto,
  ): Promise<ApiResponseDto<any>> {
    try {
      this.logger.log(colors.cyan(`Sending notification to user: ${userId}`));

      // Get all active device tokens for the user
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      if (deviceTokens.length === 0) {
        this.logger.warn(colors.yellow(`⚠️  No active device tokens found for user: ${userId}`));
        return new ApiResponseDto(
          false,
          'No active device tokens found for this user',
          { sent: 0, failed: 0 },
        );
      }

      // Parse additional data if provided
      let additionalData: Record<string, any> = {};
      if (notification.data) {
        try {
          additionalData = JSON.parse(notification.data);
        } catch (error) {
          this.logger.warn(colors.yellow('⚠️  Invalid JSON in notification data, ignoring'));
        }
      }

      // Build Expo messages per token
      const messages = deviceTokens.map((dt) => ({
        to: dt.token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: {
          ...additionalData,
          timestamp: new Date().toISOString(),
        },
        badge: 1,
      }));

      const result = await this.sendToExpo(messages);

      // Expo responds with an array of receipts per message
      let success = 0;
      let failed = 0;
      if (Array.isArray(result?.data)) {
        result.data.forEach((r: any, idx: number) => {
          if (r?.status === 'ok') {
            success++;
          } else {
            failed++;
            const err = r?.message || r?.details?.error || 'unknown_error';
            this.logger.error(colors.red(`Expo send failed for token ${deviceTokens[idx].token}: ${err}`));

            // Deactivate invalid tokens (malformed or device unregistered)
            if (err.includes('DeviceNotRegistered') || err.includes('InvalidCredentials')) {
              this.prisma.deviceToken
                .update({ where: { token: deviceTokens[idx].token }, data: { is_active: false } })
                .catch((e) => this.logger.error(`Error deactivating token: ${e.message}`));
            }
          }
        });
      }

      this.logger.log(colors.green(`✅ Notification sent: ${success} successful, ${failed} failed`));

      return new ApiResponseDto(true, 'Notification sent', {
        sent: success,
        failed,
        total: deviceTokens.length,
        result,
      });
    } catch (error: any) {
      this.logger.error(colors.red(`Error sending notification: ${error.message}`));
      throw new BadRequestException(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendNotificationToUsers(
    userIds: string[],
    notification: SendPushNotificationDto,
  ): Promise<ApiResponseDto<any>> {
    try {
      this.logger.log(colors.cyan(`Sending notification to ${userIds.length} users`));

      let totalSent = 0;
      let totalFailed = 0;

      for (const userId of userIds) {
        try {
          const result = await this.sendNotificationToUser(userId, notification);
          if (result.data) {
            totalSent += result.data.sent || 0;
            totalFailed += result.data.failed || 0;
          }
        } catch (error: any) {
          this.logger.error(colors.red(`Error sending to user ${userId}: ${error.message}`));
          totalFailed++;
        }
      }

      return new ApiResponseDto(true, 'Bulk notification sent', {
        sent: totalSent,
        failed: totalFailed,
        total_users: userIds.length,
      });
    } catch (error: any) {
      this.logger.error(colors.red(`Error sending bulk notification: ${error.message}`));
      throw new BadRequestException(`Failed to send bulk notification: ${error.message}`);
    }
  }

  /**
   * Send transaction notification (helper method)
   */
  async sendTransactionNotification(
    userId: string,
    transactionType: string,
    amount: number,
    status: string,
    transactionId?: string,
  ): Promise<void> {
    try {
      const title = status === 'success' ? 'Transaction Successful 🥳' : 'Transaction Failed ❌';
      const body =
        status === 'success'
          ? `Your ${transactionType} of ₦${amount.toLocaleString()} was successful`
          : `Your ${transactionType} of ₦${amount.toLocaleString()} failed`;

      await this.sendNotificationToUser(userId, {
        title,
        body,
        data: transactionId
          ? JSON.stringify({
              type: 'transaction',
              transaction_id: transactionId,
              transaction_type: transactionType,
              amount,
              status,
            })
          : undefined,
      });
    } catch (error: any) {
      this.logger.error(colors.red(`Error sending transaction notification: ${error.message}`));
      // Don't throw - transaction notifications are non-critical
    }
  }

  /**
   * Get user's device tokens
   */
  async getUserDeviceTokens(userId: string): Promise<ApiResponseDto<any>> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        select: {
          id: true,
          platform: true,
          device_id: true,
          app_version: true,
          createdAt: true,
        },
      });

      return new ApiResponseDto(true, 'Device tokens retrieved', { tokens });
    } catch (error: any) {
      this.logger.error(colors.red(`Error fetching device tokens: ${error.message}`));
      throw new BadRequestException(`Failed to fetch device tokens: ${error.message}`);
    }
  }
}


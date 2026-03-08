import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as colors from 'colors';
import {
  RegisterDeviceTokenDto,
  SendPushNotificationDto,
} from './dto/push-notification.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';

const EXPO_MAX_MESSAGES_PER_REQUEST = 100;
const EXPO_RETRY_MAX_ATTEMPTS = 3;
const EXPO_RETRY_BASE_MS = 1000;
/** Dedupe window: don't send the same "notifications-off" confirmation to the same token twice within this ms */
const CONFIRMATION_OFF_DEDUPE_MS = 60_000;

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';
  /** Tokens we've sent "notifications-off" to recently (token -> timestamp) to avoid duplicate delivery */
  private readonly recentOffConfirmations = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Send a batch of messages to Expo Push API with retry on 429/5xx.
   */
  private async sendToExpo(
    messages: Array<Record<string, any>>,
  ): Promise<{ data?: any[]; errors?: any[] }> {
    if (messages.length === 0) {
      return {};
    }
    if (messages.length > EXPO_MAX_MESSAGES_PER_REQUEST) {
      this.logger.warn(
        colors.yellow(
          `Batch size ${messages.length} exceeds Expo limit ${EXPO_MAX_MESSAGES_PER_REQUEST}; sending in chunks`,
        ),
      );
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    const expoAccessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
    if (expoAccessToken) {
      headers.Authorization = `Bearer ${expoAccessToken}`;
    }

    const chunks: Array<Record<string, any>[]> = [];
    for (let i = 0; i < messages.length; i += EXPO_MAX_MESSAGES_PER_REQUEST) {
      chunks.push(messages.slice(i, i + EXPO_MAX_MESSAGES_PER_REQUEST));
    }

    const allData: any[] = [];
    for (const chunk of chunks) {
      let lastError: any;
      for (let attempt = 0; attempt < EXPO_RETRY_MAX_ATTEMPTS; attempt++) {
        try {
          const { data, status } = await axios.post(this.expoPushUrl, chunk, {
            headers,
            validateStatus: () => true,
          });
          if (data?.errors?.length) {
            this.logger.error(
              colors.red(
                `Expo request error: ${JSON.stringify(data.errors)}`,
              ),
            );
            throw new BadRequestException(
              data.errors.map((e: any) => e.message || e.code).join('; '),
            );
          }
          if (status === 429 || (status >= 500 && status < 600)) {
            const delay =
              EXPO_RETRY_BASE_MS * Math.pow(2, attempt) +
              Math.random() * 500;
            this.logger.warn(
              colors.yellow(
                `Expo returned ${status}; retry ${attempt + 1}/${EXPO_RETRY_MAX_ATTEMPTS} in ${Math.round(delay)}ms`,
              ),
            );
            await new Promise((r) => setTimeout(r, delay));
            lastError = new BadRequestException(
              `Expo Push API temporarily unavailable (${status})`,
            );
            continue;
          }
          if (status !== 200) {
            throw new BadRequestException(
              `Expo Push API error: ${status} ${JSON.stringify(data)}`,
            );
          }
          if (Array.isArray(data?.data)) {
            allData.push(...data.data);
          }
          lastError = null;
          break;
        } catch (err: any) {
          if (axios.isAxiosError(err) && err.response) {
            const status = err.response.status;
            if (status === 429 || (status >= 500 && status < 600)) {
              const delay =
                EXPO_RETRY_BASE_MS * Math.pow(2, attempt) +
                Math.random() * 500;
              this.logger.warn(
                colors.yellow(
                  `Expo request failed ${status}; retry ${attempt + 1}/${EXPO_RETRY_MAX_ATTEMPTS} in ${Math.round(delay)}ms`,
                ),
              );
              await new Promise((r) => setTimeout(r, delay));
              lastError = err;
              continue;
            }
          }
          throw err;
        }
      }
      if (lastError) {
        throw lastError;
      }
    }
    return { data: allData };
  }

  /**
   * Send a one-off confirmation push (e.g. after user turns notifications on/off).
   * Non-blocking; failures are logged but do not throw (store-friendly, one-time only).
   */
  private sendConfirmationPush(
    token: string,
    title: string,
    body: string,
    context: string,
  ): void {
    const message = {
      to: token,
      title,
      body,
      sound: 'default' as const,
      priority: 'default' as const,
      data: { screen: 'settings', type: 'notification_preference', timestamp: new Date().toISOString() },
    };
    this.sendToExpo([message])
      .then(() =>
        this.logger.log(colors.cyan(`[Push] Confirmation sent (${context})`)),
      )
      .catch((err: any) =>
        this.logger.warn(
          colors.yellow(`[Push] Confirmation failed (${context}): ${err?.message ?? err}`),
        ),
      );
  }

  /** Prune old entries from recentOffConfirmations to avoid unbounded growth */
  private pruneRecentOffConfirmations(): void {
    const cutoff = Date.now() - CONFIRMATION_OFF_DEDUPE_MS;
    for (const [t, ts] of this.recentOffConfirmations.entries()) {
      if (ts < cutoff) this.recentOffConfirmations.delete(t);
    }
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
          this.sendConfirmationPush(
            dto.token,
            "You're all set",
            "You'll receive important updates like transaction alerts and support messages here. 📬",
            'notifications-on',
          );
          return new ApiResponseDto(
            true,
            'Device token updated successfully',
            { token_id: updatedToken.id },
          );
        } else {
          // Same user, just update metadata — do not send confirmation (avoids duplicate if app calls register twice)
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
        this.sendConfirmationPush(
          dto.token,
          "You're all set",
          "You'll receive important updates like transaction alerts and support messages here. 📬",
          'notifications-on',
        );
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
   * Remove a device token (when user turns off notifications or logs out)
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

      this.pruneRecentOffConfirmations();
      const alreadySentOff = (this.recentOffConfirmations.get(token) ?? 0) > Date.now() - CONFIRMATION_OFF_DEDUPE_MS;
      if (!alreadySentOff) {
        this.recentOffConfirmations.set(token, Date.now());
        this.sendConfirmationPush(
          token,
          'Notifications turned off',
          "You can turn them back on anytime in Settings. 👋",
          'notifications-off',
        );
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

      // Parse additional data if provided (e.g. screen, id for deep links)
      let additionalData: Record<string, any> = {};
      if (notification.data) {
        try {
          additionalData = JSON.parse(notification.data);
        } catch (error) {
          this.logger.warn(
            colors.yellow('⚠️  Invalid JSON in notification data, ignoring'),
          );
        }
      }

      const sound = notification.sound ?? 'default';
      const priority = notification.priority ?? 'default';

      // Build Expo messages per token (Expo accepts up to 100 per request)
      const messages = deviceTokens.map((dt) => {
        const msg: Record<string, any> = {
          to: dt.token,
          sound,
          title: notification.title,
          body: notification.body,
          data: {
            ...additionalData,
            timestamp: new Date().toISOString(),
          },
          badge: 1,
          priority,
        };
        if (notification.channel_id && dt.platform === 'android') {
          msg.channelId = notification.channel_id;
        }
        if (notification.image_url) {
          msg.richContent = { image: notification.image_url };
        }
        return msg;
      });

      const result = await this.sendToExpo(messages);

      // Expo returns push tickets (not receipts); check for per-message errors
      let success = 0;
      let failed = 0;
      if (Array.isArray(result?.data)) {
        result.data.forEach((r: any, idx: number) => {
          if (r?.status === 'ok') {
            success++;
          } else {
            failed++;
            const errMsg =
              typeof r?.message === 'string'
                ? r.message
                : String(r?.details?.error ?? r?.message ?? 'unknown_error');
            this.logger.error(
              colors.red(
                `Expo ticket error for token [${idx}]: ${errMsg}`,
              ),
            );
            const errorCode =
              typeof r?.details?.error === 'string'
                ? r.details.error
                : errMsg;
            const shouldDeactivate =
              errorCode === 'DeviceNotRegistered' ||
              errorCode === 'InvalidCredentials' ||
              errMsg.includes('DeviceNotRegistered') ||
              errMsg.includes('InvalidCredentials');
            if (shouldDeactivate && deviceTokens[idx]) {
              this.prisma.deviceToken
                .update({
                  where: { token: deviceTokens[idx].token },
                  data: { is_active: false },
                })
                .catch((e) =>
                  this.logger.error(`Error deactivating token: ${e.message}`),
                );
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
   * Send transaction notification (helper). Uses screen + id for deep link when user taps.
   */
  async sendTransactionNotification(
    userId: string,
    transactionType: string,
    amount: number,
    status: string,
    transactionId?: string,
  ): Promise<void> {
    try {
      const formattedAmount = `₦${amount.toLocaleString()}`;
      const title =
        status === 'success'
          ? 'Transaction Successful 🎉'
          : 'Transaction Failed ❌';
      const body =
        status === 'success'
          ? `Your ${transactionType} of ${formattedAmount} was successful. 💰`
          : `Your ${transactionType} of ${formattedAmount} didn't go through. Tap for details.`;

      const data: Record<string, any> = {
        screen: 'transaction',
        type: 'transaction',
        transaction_type: transactionType,
        amount,
        status,
      };
      if (transactionId) {
        data.id = transactionId;
        data.transaction_id = transactionId;
      }

      await this.sendNotificationToUser(userId, {
        title,
        body,
        data: JSON.stringify(data),
        channel_id: 'transactions',
        priority: 'high' as any,
      });
    } catch (error: any) {
      this.logger.error(
        colors.red(
          `Error sending transaction notification: ${error.message}`,
        ),
      );
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


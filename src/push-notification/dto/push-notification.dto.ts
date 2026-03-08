import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  Matches,
  MaxLength,
  IsIn,
} from 'class-validator';

export enum Platform {
  ios = 'ios',
  android = 'android',
}

/** Expo push tokens must match this format (ExponentPushToken[...]) */
export const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[[\w-]+\]$/;

export enum PushPriority {
  default = 'default',
  normal = 'normal',
  high = 'high',
}

/**
 * DTO for registering a device token for push notifications.
 * Token must be an Expo push token from getExpoPushTokenAsync().
 */
export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Device token is required' })
  @Matches(EXPO_PUSH_TOKEN_REGEX, {
    message:
      'Token must be a valid Expo push token (e.g. ExponentPushToken[xxx])',
  })
  token: string;

  @IsEnum(Platform, { message: 'Platform must be either ios or android' })
  @IsNotEmpty({ message: 'Platform is required' })
  platform: Platform;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  device_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  app_version?: string;
}

/**
 * DTO for sending push notification.
 * Used internally and for the optional test endpoint.
 */
export class SendPushNotificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(128)
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Body is required' })
  @MaxLength(1024)
  body: string;

  @IsString()
  @IsOptional()
  data?: string; // JSON string for deep link / custom data (see API doc)

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsEnum(PushPriority)
  @IsOptional()
  priority?: PushPriority;

  /** Android: notification channel ID (e.g. "default", "transactions") */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  channel_id?: string;

  /** iOS: "default" or custom sound name (without extension) */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  sound?: string;
}


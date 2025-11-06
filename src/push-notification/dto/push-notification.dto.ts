import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export enum Platform {
  ios = 'ios',
  android = 'android',
}

/**
 * DTO for registering a device token for push notifications
 */
export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Device token is required' })
  token: string;

  @IsEnum(Platform, { message: 'Platform must be either ios or android' })
  @IsNotEmpty({ message: 'Platform is required' })
  platform: Platform;

  @IsString()
  @IsOptional()
  device_id?: string;

  @IsString()
  @IsOptional()
  app_version?: string;
}

/**
 * DTO for sending push notification
 */
export class SendPushNotificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Body is required' })
  body: string;

  @IsString()
  @IsOptional()
  data?: string; // JSON string for additional data

  @IsString()
  @IsOptional()
  image_url?: string;
}


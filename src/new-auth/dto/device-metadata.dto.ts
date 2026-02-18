import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class DeviceMetadataDto {
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @IsString()
  @IsOptional()
  device_fingerprint?: string;

  @IsString()
  @IsOptional()
  device_name?: string;

  @IsString()
  @IsOptional()
  device_model?: string;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  os_name?: string;

  @IsString()
  @IsOptional()
  os_version?: string;

  @IsString()
  @IsOptional()
  app_version?: string;

  @IsString()
  @IsOptional()
  ip_address?: string;
}

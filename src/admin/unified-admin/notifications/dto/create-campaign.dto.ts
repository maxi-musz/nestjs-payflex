import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
  IsObject,
  IsEmail,
  IsBoolean,
  IsNumber,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TargetTypeEnum {
  all = 'all',
  individual = 'individual',
  filtered = 'filtered',
}

export class TargetFiltersDto {
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() tier?: string;
  @IsOptional() @IsString() account_status?: string;
  @IsOptional() @IsBoolean() is_email_verified?: boolean;
  @IsOptional() @IsBoolean() has_completed_onboarding?: boolean;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsDateString() registered_before?: string;
  @IsOptional() @IsDateString() registered_after?: string;
  @IsOptional() @IsNumber() @Min(0) min_balance?: number;
  @IsOptional() @IsNumber() @Min(0) max_balance?: number;
  @IsOptional() @IsNumber() @Min(0) min_total_transactions?: number;
  @IsOptional() @IsNumber() max_total_transactions?: number;
  @IsOptional() @IsString() platform?: string;
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  content_markdown: string;

  @IsEnum(TargetTypeEnum)
  target_type: TargetTypeEnum;

  @IsOptional()
  @ValidateNested()
  @Type(() => TargetFiltersDto)
  target_filters?: TargetFiltersDto;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  target_emails?: string[];

  @IsOptional()
  @IsDateString()
  scheduled_for?: string;
}

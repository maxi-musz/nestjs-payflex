import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
  IsBoolean,
  IsNumber,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PushTargetTypeEnum {
  all = 'all',
  individual = 'individual',
  filtered = 'filtered',
}

export class PushTargetFiltersDto {
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() tier?: string;
  @IsOptional() @IsString() account_status?: string;
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

export class CreatePushBroadcastDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsEnum(PushTargetTypeEnum)
  target_type: PushTargetTypeEnum;

  @IsOptional()
  @ValidateNested()
  @Type(() => PushTargetFiltersDto)
  target_filters?: PushTargetFiltersDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  target_user_ids?: string[];

  @IsOptional()
  @IsDateString()
  scheduled_for?: string;
}

export class QueryPushBroadcastsDto {
  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'])
  status?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}

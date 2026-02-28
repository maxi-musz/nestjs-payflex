import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CashbackServiceType } from '@prisma/client';

export class UpdateCashbackConfigDto {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  default_percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_cashback_per_transaction?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_cashback_per_day?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_transaction_amount?: number;
}

export class CreateCashbackRuleDto {
  @IsEnum(CashbackServiceType)
  service_type: CashbackServiceType;

  @IsNumber()
  @Min(0)
  percentage: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_cashback_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_transaction_amount?: number;
}

export class UpdateCashbackRuleDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_cashback_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_transaction_amount?: number;
}

export class QueryCashbackHistoryDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsEnum(CashbackServiceType)
  service_type?: CashbackServiceType;

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

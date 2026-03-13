import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { CashbackServiceType } from '@prisma/client';

export class UpdateMarkupConfigDto {
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
  default_percentage_friendlies?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_amount_to_apply_markup?: number;
}

export class CreateMarkupRuleDto {
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
  percentage_friendlies?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_amount_to_apply_markup?: number;
}

export class UpdateMarkupRuleDto {
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
  percentage_friendlies?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_amount_to_apply_markup?: number;
}

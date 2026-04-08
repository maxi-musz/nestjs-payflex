import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Admin sets explicit values for wallet / cashback aggregates.
 * Omit a field to leave it unchanged. At least one wallet or cashback field must be provided.
 */
export class AdjustUserBalancesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  wallet_current_balance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  wallet_all_time_fuunding?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  wallet_all_time_withdrawn?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  cashback_current_balance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  cashback_all_time_earned?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  cashback_all_time_withdrawn?: number;

  @IsString()
  @MinLength(3, { message: 'Reason must be at least 3 characters' })
  reason!: string;
}

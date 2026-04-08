import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustUserBalancesDto {
  /** Positive = credit main NGN wallet, negative = debit. Omit or 0 to skip. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  wallet_delta?: number;

  /** Positive = credit cashback wallet, negative = debit. Omit or 0 to skip. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  cashback_delta?: number;

  @IsString()
  @MinLength(3, { message: 'Reason must be at least 3 characters' })
  reason!: string;
}

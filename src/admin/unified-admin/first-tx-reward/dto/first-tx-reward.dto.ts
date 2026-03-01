import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateFirstTxRewardConfigDto {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reward_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_transaction_amount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligible_transaction_types?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget_limit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_recipients?: number | null;

  @IsOptional()
  @IsDateString()
  start_date?: string | null;

  @IsOptional()
  @IsDateString()
  end_date?: string | null;

  @IsOptional()
  @IsBoolean()
  require_kyc?: boolean;
}

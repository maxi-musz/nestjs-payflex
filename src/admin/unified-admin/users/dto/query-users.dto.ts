import { IsOptional, IsString, IsEnum, IsNumberString, MaxLength } from 'class-validator';
import { Role, AccountStatus } from '@prisma/client';

export class QueryUsersDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsEnum(AccountStatus) account_status?: AccountStatus;
  @IsOptional() @IsString() tier?: string;
  @IsOptional() @IsString() kyc_status?: string;
  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;

  /** Main wallet `current_balance` lower bound (inclusive). */
  @IsOptional() @IsString() @MaxLength(24) min_wallet_balance?: string;
  /** Main wallet `current_balance` upper bound (inclusive). */
  @IsOptional() @IsString() @MaxLength(24) max_wallet_balance?: string;
  /** Cashback wallet `current_balance` lower bound (inclusive). */
  @IsOptional() @IsString() @MaxLength(24) min_cashback_balance?: string;
  /** Cashback wallet `current_balance` upper bound (inclusive). */
  @IsOptional() @IsString() @MaxLength(24) max_cashback_balance?: string;

  @IsOptional() @IsString() sort_by?: string;
  @IsOptional() @IsString() sort_order?: string;
}

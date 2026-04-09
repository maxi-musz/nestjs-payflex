import { IsOptional, IsString, IsEnum, IsNumberString, MaxLength, IsIn } from 'class-validator';
import { Role, AccountStatus } from '@prisma/client';

/** Preset ordering for admin user list (overrides sort_by/sort_order when set). */
export const USER_LIST_SORT_VALUES = [
  'created_desc',
  'created_asc',
  'name_asc',
  'name_desc',
  'wallet_balance_desc',
  'wallet_balance_asc',
  'cashback_balance_desc',
  'cashback_balance_asc',
  'all_time_funding_desc',
  'all_time_funding_asc',
  'transaction_count_desc',
  'transaction_count_asc',
] as const;

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

  @IsOptional()
  @IsString()
  @IsIn([...USER_LIST_SORT_VALUES])
  list_sort?: string;

  @IsOptional() @IsString() sort_by?: string;
  @IsOptional() @IsString() sort_order?: string;
}

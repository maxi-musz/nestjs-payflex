import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
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
  @IsOptional() @IsString() sort_by?: string;
  @IsOptional() @IsString() sort_order?: string;
}

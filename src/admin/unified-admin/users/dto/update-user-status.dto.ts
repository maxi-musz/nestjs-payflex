import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountStatus, Role } from '@prisma/client';

export class UpdateUserStatusDto {
  @IsEnum(AccountStatus)
  account_status: AccountStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserTierDto {
  @IsString()
  tier_id: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

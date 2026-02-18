import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  AuditAction,
  AuditActorType,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '@prisma/client';

export class QueryAuditLogDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditCategory)
  category?: AuditCategory;

  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  @IsOptional()
  @IsEnum(AuditActorType)
  actor_type?: AuditActorType;

  @IsOptional()
  @IsString()
  resource_type?: string;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_flagged?: boolean;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class FlagAuditLogDto {
  @IsString()
  reason: string;
}

export class ReviewAuditLogDto {
  @IsString()
  review_notes: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  resolve: boolean;
}

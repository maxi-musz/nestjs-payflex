import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsArray, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTierDto {
    @IsString()
    @IsNotEmpty()
    tier: string; // e.g., "UNVERIFIED", "VERIFIED", "PREMIUM"

    @IsString()
    @IsNotEmpty()
    name: string; // e.g., "Basic Tier", "Verified Tier"

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    requirements?: string[];

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    single_transaction_limit: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    daily_limit: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    monthly_limit: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    airtime_daily_limit: number;
}

export class UpdateTierDto {
    @IsString()
    @IsOptional()
    tier?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    requirements?: string[];

    @IsNumber()
    @Min(0)
    @IsOptional()
    single_transaction_limit?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    daily_limit?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    monthly_limit?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    airtime_daily_limit?: number;
}



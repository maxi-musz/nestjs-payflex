import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class PurchaseAirtimeDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  phone: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(50, { message: 'Amount must be at least 50' })
  @Max(100000, { message: 'Amount cannot exceed 100,000' })
  @Transform(({ value }) => Number(value))
  amount: number;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toUpperCase())
  network: string; // MTN, GLO, AIRTEL, 9MOBILE

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  reference?: string; // Optional, will be generated if not provided
}


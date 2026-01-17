import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class PurchaseDataDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toUpperCase())
  network: string; // MTN, GLO, AIRTEL, 9MOBILE

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  dataPlan: string; // Plan ID or variation code

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  reference?: string; // Optional, will be generated if not provided
}


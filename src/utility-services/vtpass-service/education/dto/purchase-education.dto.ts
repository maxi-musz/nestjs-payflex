import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const VALID_EDUCATION_SERVICE_IDS = [
  'waec-registration',
  'waec',
  'jamb',
] as const;

export type EducationServiceId = typeof VALID_EDUCATION_SERVICE_IDS[number];

export class PurchaseEducationDto {
  @IsOptional()
  @IsString()
  request_id?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_EDUCATION_SERVICE_IDS as unknown as string[])
  serviceID: string;

  @IsString()
  @IsNotEmpty()
  variation_code: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  /** Required only for JAMB — the Profile ID */
  @IsOptional()
  @IsString()
  billersCode?: string;

  @IsOptional()
  @IsBoolean()
  use_cashback?: boolean;
}

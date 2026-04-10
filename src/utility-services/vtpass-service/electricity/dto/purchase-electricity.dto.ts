import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export const VALID_ELECTRICITY_SERVICE_IDS = [
  'ikeja-electric',
  'eko-electric',
  'kano-electric',
  'portharcourt-electric',
  'jos-electric',
  'ibadan-electric',
  'kaduna-electric',
  'abuja-electric',
  'enugu-electric',
  'benin-electric',
  'aba-electric',
  'yola-electric',
] as const;

export type ElectricityServiceId = typeof VALID_ELECTRICITY_SERVICE_IDS[number];

export class PurchaseElectricityDto {
  @IsOptional()
  @IsString()
  request_id?: string;

  @IsString()
  @IsNotEmpty()
  serviceID: string;

  @IsString()
  @IsNotEmpty()
  billersCode: string;

  @IsString()
  @IsIn(['prepaid', 'postpaid'])
  variation_code: 'prepaid' | 'postpaid';

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsBoolean()
  use_cashback?: boolean;

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  customer_address?: string;
}

import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PurchaseInternationalAirtimeDto {
  @IsOptional()
  @IsString()
  request_id?: string;

  @IsString()
  @IsNotEmpty()
  serviceID: string; // should always be 'foreign-airtime'

  @IsString()
  @IsNotEmpty()
  billersCode: string; // destination phone number to top up

  @IsString()
  @IsNotEmpty()
  variation_code: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsString()
  @IsNotEmpty()
  phone: string; // customer phone for notifications

  @IsString()
  @IsNotEmpty()
  operator_id: string;

  @IsString()
  @IsNotEmpty()
  country_code: string;

  @IsString()
  @IsNotEmpty()
  product_type_id: string;

  @IsOptional()
  @IsBoolean()
  use_cashback?: boolean;
}


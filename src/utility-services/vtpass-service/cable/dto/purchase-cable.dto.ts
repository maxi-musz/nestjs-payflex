import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PurchaseCableDto {
  @IsOptional()
  @IsString()
  request_id?: string;

  @IsString()
  @IsNotEmpty()
  serviceID: string; // dstv | gotv | startimes | showmax

  @IsString()
  @IsNotEmpty()
  billersCode: string; // smartcard number

  @IsOptional()
  @IsString()
  variation_code?: string; // Required for DSTV/GOTV (change) and always required for Startimes/Showmax

  @IsOptional()
  @IsNumber()
  amount?: number; // required for subscription_type=renew (from verify response)

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  @IsIn(['change', 'renew'])
  subscription_type?: 'change' | 'renew'; // Required for DSTV/GOTV, not used for Startimes/Showmax

  @IsOptional()
  @IsNumber()
  quantity?: number; // months
}



import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum DataServiceId {
  MTN = 'mtn-data',
  AIRTEL = 'airtel-data',
  GLO = 'glo-data',
  ETISALAT = 'etisalat-data',
  SMILE = 'smile-direct',
  SPECTRANET = 'spectranet',
  GLO_SME = 'glo-sme-data',
}

export class PurchaseDataDto {
  @IsEnum(DataServiceId)
  serviceID: DataServiceId; // e.g., 'mtn-data', 'airtel-data', 'glo-data', 'etisalat-data'

  @IsString()
  @IsNotEmpty()
  billersCode: string; // The phone number to purchase data for

  @IsString()
  @IsNotEmpty()
  variation_code: string; // The variation code from GET VARIATIONS endpoint

  @IsNumber()
  @IsOptional()
  amount?: number; // Optional: variation_code determines the price

  @IsString()
  @IsNotEmpty()
  phone: string; // The phone number of the customer or recipient

  @IsString()
  @IsOptional()
  request_id?: string; // Optional: for idempotency - if provided, checks for existing transaction
}


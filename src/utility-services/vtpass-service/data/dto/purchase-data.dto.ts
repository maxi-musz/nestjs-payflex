import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
  serviceID: DataServiceId;

  @IsString()
  @IsNotEmpty()
  billersCode: string;

  @IsString()
  @IsNotEmpty()
  variation_code: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  request_id?: string;

  @IsOptional()
  @IsBoolean()
  use_cashback?: boolean;
}


import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PurchaseAirtimeDto {
  @IsString()
  @IsIn(['mtn', 'glo', 'airtel', 'etisalat','9-mobile', 'foreign-airtime'])
  serviceID: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  request_id?: string; // Optional: for idempotency - if provided, checks for existing transaction
}



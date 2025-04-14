import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class PaystackFundingDto {
    @IsString()
    callback_url: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;
}

export class PaystackFundingVerifyDto {
    @IsString()
    @IsNotEmpty()
    reference: string;
}

export enum TransferCurrency {
    usd = 'usd',
    eur = 'eur',
    ngn = 'ngn',
    gbp = 'gbp',
  }

export enum CurrencyEnum {
    ngn = 'ngn',
    usd = 'usd',
    eur = 'eur',
    gbp = 'gbp',
  }
  
  export class CreateTransferDto {
    @IsNotEmpty()
    @IsString()
    accountBank: string;
  
    @IsNotEmpty()
    @IsString()
    accountNumber: string;
  
    @IsNotEmpty()
    @IsNumber()
    amount: number;
  
    @IsNotEmpty()
    @IsString()
    narration: string;
  
    @IsNotEmpty()
    @IsEnum(TransferCurrency)
    currency: TransferCurrency;
  
    @IsNotEmpty()
    @IsString()
    reference: string;
  
    @IsOptional()
    @IsString()
    beneficiaryName?: string;
  
    @IsOptional()
    @IsString()
    callbackUrl?: string;
  }

export class CreateVirtualAccountDto {
    @IsNotEmpty()
    @IsEnum(CurrencyEnum)
    currency: CurrencyEnum;

    @IsNotEmpty()
    @IsString()
    bvn: string;    
}
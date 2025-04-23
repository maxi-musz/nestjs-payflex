import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";

export enum AccountCurrency {
    usd = 'usd',
    ngn = 'ngn',
    eur = 'eur',
    gbp = 'gbp',
  }

  export class CreateVirtualAccountDto {
    @IsString()
    @IsNotEmpty()
    @IsEnum(AccountCurrency)
    currency: AccountCurrency;
  }

  export class CreateTempVirtualLocalAccountDto {
    @IsNumber()
    @IsNotEmpty()
    amount: number;
  }

export class VerifyAccountNumberDto {
    @IsString()
    @IsNotEmpty()
    account_number: string;
    
    @IsString()
    @IsNotEmpty()
    bank_code: string;
}

export class InitiateTransferDto {
    @IsString()
    @IsNotEmpty()
    account_number: string;

    @IsString()
    @IsNotEmpty()
    bank_code: string;

    @IsString()
    @IsNotEmpty()
    amount: string;

    @IsString()
    @IsNotEmpty()
    beneficiary_name: string;

    @IsString()
    @IsNotEmpty()
    narration: string;
}

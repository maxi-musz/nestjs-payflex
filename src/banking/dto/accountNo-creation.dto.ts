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
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

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
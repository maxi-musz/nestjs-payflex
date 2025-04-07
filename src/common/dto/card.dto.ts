import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export enum CardCurrency {
    USD = 'USD',
    NGN = 'NGN'
  }
  
export class CreateCardDto {
    @IsNotEmpty()
    @IsEnum(CardCurrency)
    currency: CardCurrency;

    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    customerReference?: string;
}

export class FundCardDto {
    @IsNotEmpty()
    @IsString()
    cardId: string;

    @IsNotEmpty()
    @IsNumber()
    amount: number;
}

export class WithdrawCardDto {
    @IsNotEmpty()
    @IsString()
    cardId: string;
  
    @IsNotEmpty()
    @IsNumber()
    amount: number;
  }
  
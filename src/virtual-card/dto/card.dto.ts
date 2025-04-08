// src/cards/dto/create-card.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum CardCurrency {
  USD = 'USD',
  NGN = 'NGN',
  EUR = "EUR",
  GBP = "GBP",
}

export class CreateCardDto {
  @IsNotEmpty()
  @IsEnum(CardCurrency)
  currency: CardCurrency;

  @IsNotEmpty()
  @IsNumber()
  funding_amount: number;

  @IsNotEmpty()
  @IsString()
  pin: string;

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

export class CardHolderDto {
  
}

export class CreateBridgeCardDto {

}
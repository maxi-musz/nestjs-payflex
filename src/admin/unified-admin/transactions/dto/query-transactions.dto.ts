import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import {
  TransactionStatus,
  TransactionType,
  CreditDebit,
  PaymentChannel,
} from '@prisma/client';

export class QueryTransactionsDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;

  @IsOptional() @IsString() search?: string;

  @IsOptional() @IsEnum(TransactionStatus) status?: TransactionStatus;
  @IsOptional() @IsEnum(TransactionType) transaction_type?: TransactionType;
  @IsOptional() @IsEnum(CreditDebit) credit_debit?: CreditDebit;
  @IsOptional() @IsEnum(PaymentChannel) payment_channel?: PaymentChannel;

  @IsOptional() @IsString() user_id?: string;
  @IsOptional() @IsNumberString() min_amount?: string;
  @IsOptional() @IsNumberString() max_amount?: string;

  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;

  @IsOptional() @IsString() sort_by?: string;
  @IsOptional() @IsString() sort_order?: string;
}

export class TransactionStatsQueryDto {
  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;
}

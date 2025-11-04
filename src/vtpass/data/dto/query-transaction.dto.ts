import { IsNotEmpty, IsString } from 'class-validator';

export class QueryTransactionDto {
  @IsString()
  @IsNotEmpty()
  request_id: string; // The request_id used when purchasing the transaction
}


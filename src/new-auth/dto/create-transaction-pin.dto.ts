import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateTransactionPinDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'Transaction PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'Transaction PIN must contain only digits' })
  pin: string;
}

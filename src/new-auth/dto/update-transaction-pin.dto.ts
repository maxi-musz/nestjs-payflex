import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class UpdateTransactionPinDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'Current PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'Current PIN must contain only digits' })
  current_pin: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'New PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'New PIN must contain only digits' })
  new_pin: string;
}

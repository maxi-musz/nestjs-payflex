import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for finding a user by their Smipay tag
 */
export class FindUserByTagDto {
  @IsString()
  @IsNotEmpty({ message: 'Smipay tag is required' })
  smipay_tag: string;
}

/**
 * DTO for sending money to a user via their Smipay tag
 */
export class SendMoneyByTagDto {
  @IsString()
  @IsNotEmpty({ message: 'Recipient Smipay tag is required' })
  recipient_tag: string;

  @IsNumber({}, { message: 'Amount must be a valid number' })
  @Min(1, { message: 'Amount must be at least 1 NGN' })
  amount: number;

  @IsString()
  @IsOptional()
  narration?: string;
}


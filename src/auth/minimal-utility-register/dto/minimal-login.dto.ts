import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PhoneValidator } from '../../helpers/phone.validator';

/**
 * Minimal Login DTO
 * User can login with either email or phone number + password
 */
export class MinimalLoginDto {
  @ValidateIf((o) => !o.phone_number)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required if phone number is not provided' })
  @Transform(({ value }) => {
    // Trim and convert to lowercase
    return value ? value.trim().toLowerCase() : value;
  })
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required if email is not provided' })
  @Transform(({ value }) => {
    // Strip + sign and format to 234XXXXXXXXXX
    return PhoneValidator.formatPhoneToE164(value);
  })
  @Matches(/^234[0-9]{10}$/, {
    message: 'Phone number must be in format: 234XXXXXXXXXX (or +234XXXXXXXXXX)',
  })
  phone_number?: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  password: string;
}


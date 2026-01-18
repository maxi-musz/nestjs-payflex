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
    if (!value) return value;
    // Strip + sign and format to 234XXXXXXXXXX
    const formatted = PhoneValidator.formatPhoneToE164(value);
    // Additional validation: if formatted number is longer than 13 digits, it's likely malformed
    if (formatted && formatted.length > 13) {
      // If it starts with 234234, it might be a duplicate prefix - try to fix it
      if (formatted.startsWith('234234') && formatted.length === 16) {
        // Remove the duplicate 234 prefix
        return formatted.substring(3);
      }
    }
    return formatted;
  })
  @Matches(/^234[0-9]{10}$/, {
    message: 'Phone number must be in format: 234XXXXXXXXXX (13 digits total). Received invalid format. Please check your phone number.',
  })
  phone_number?: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  password: string;
}


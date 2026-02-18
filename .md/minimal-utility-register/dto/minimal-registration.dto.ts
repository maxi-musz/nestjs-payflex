import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PhoneValidator } from '../../helpers/phone.validator';

/**
 * Request Email OTP DTO
 * For minimal utility registration - Step 1
 */
export class RequestEmailOTPDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => {
    // Trim and convert to lowercase
    return value ? value.trim().toLowerCase() : value;
  })
  email: string;
}

/**
 * Verify Email OTP DTO
 * For minimal utility registration - Step 2
 */
export class VerifyEmailOTPDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => {
    // Trim and convert to lowercase
    return value ? value.trim().toLowerCase() : value;
  })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @MinLength(4, { message: 'OTP must be exactly 4 digits' })
  @MaxLength(4, { message: 'OTP must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'OTP must be exactly 4 digits' })
  @Transform(({ value }) => {
    // Trim and ensure it's a string
    return value ? value.toString().trim() : value;
  })
  otp: string;
}

/**
 * Minimal Registration DTO
 * For minimal utility registration - Step 3 (Final Step)
 */
export class MinimalRegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Transform(({ value }) => {
    // Trim and capitalize first letter
    if (!value) return value;
    const trimmed = value.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  })
  first_name: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Transform(({ value }) => {
    // Trim and capitalize first letter
    if (!value) return value;
    const trimmed = value.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  })
  last_name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => {
    // Trim and convert to lowercase
    return value ? value.trim().toLowerCase() : value;
  })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Transform(({ value }) => {
    // Strip + sign and format to 234XXXXXXXXXX
    return PhoneValidator.formatPhoneToE164(value);
  })
  @Matches(/^234[0-9]{10}$/, {
    message: 'Phone number must be in format: 234XXXXXXXXXX (or +234XXXXXXXXXX)',
  })
  phone_number: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Referral code must be at least 3 characters' })
  @MaxLength(20, { message: 'Referral code must not exceed 20 characters' })
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'Referral code must be alphanumeric',
  })
  @Transform(({ value }) => {
    // Trim and convert to uppercase for consistency
    return value ? value.trim().toUpperCase() : value;
  })
  referral_code?: string;
}


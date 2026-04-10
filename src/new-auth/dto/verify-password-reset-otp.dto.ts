import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyPasswordResetOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

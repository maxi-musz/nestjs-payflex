import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { IsSixDigitPassword } from '../../common/validation/six-digit-password.decorator';

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @IsSixDigitPassword()
  new_password: string;
}

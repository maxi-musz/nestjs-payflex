import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { IsSixDigitPassword } from '../../common/validation/six-digit-password.decorator';

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  otp: string;

  @IsSixDigitPassword()
  new_password: string;
}

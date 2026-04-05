import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Sign-in accepts any password the account was created with (legacy alphanumeric, etc.).
 * Six-digit rules apply only when setting a password: register + reset-password.
 */
export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(256)
  password: string;
}

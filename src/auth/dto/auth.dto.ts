import { 
    IsEmail, 
    IsEnum, 
    IsNotEmpty, 
    IsString, 
    ValidateNested,
    IsDateString,
    MinLength,
    MaxLength,
  } from "class-validator";
  import { Type } from "class-transformer";
  
  class AddressDto {
    @IsString()
    @IsNotEmpty()
    country: string;
  
    @IsString()
    @IsNotEmpty()
    state: string;
  
    @IsString()
    @IsNotEmpty()
    city: string;
  
    @IsString()
    @IsNotEmpty()
    home_address: string;
  }
  
  export class AuthDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    fourDigitPin: string;
  
    @IsString()
    @IsNotEmpty()
    @MinLength(4)
    @MaxLength(32)
    password: string;
  
    @IsString()
    @IsNotEmpty()
    first_name: string;
  
    @IsString()
    @IsNotEmpty()
    last_name: string;
  }

export class RequestEmailOTPDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyEmailOTPDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)  
  @MaxLength(4)
  otp: string;
}

export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  password: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(4)
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(32)
  new_password: string;
}
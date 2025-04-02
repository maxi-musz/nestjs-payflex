import { 
    IsEmail, 
    IsEnum, 
    IsNotEmpty, 
    IsString, 
    ValidateNested,
    IsDateString,
    MinLength,
    MaxLength,
    Matches,
    IsNumber,
    Min,
    MAX,
    Max
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
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(32)
    password: string;
  
    @IsString()
    @IsNotEmpty()
    confirm_password: string;
  
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Za-z]+$/)
    first_name: string;
  
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Za-z]+$/)
    last_name: string;
  
    @IsString()
    @IsNotEmpty()
    @Matches(/^[0-9]+$/)
    phone_number: string;
  
    @IsEnum(["male", "female", "other"])
    gender: string;
  
    @IsDateString() // Accepts ISO8601 format (YYYY-MM-DD)
    date_of_birth: string;
  
    @ValidateNested()
    @Type(() => AddressDto)
    address: AddressDto;
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
  @MinLength(8)
  @MaxLength(32)
  new_password: string;
}
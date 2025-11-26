import { 
    IsEmail, 
    IsEnum, 
    IsNotEmpty, 
    IsString, 
    ValidateNested,
    IsDateString,
    MinLength,
    MaxLength,
    IsOptional,
    IsBoolean,
    ValidateIf,
    Matches,
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
    @MinLength(6)
    @MaxLength(64)
    password: string;
  
    @IsString()
    @IsNotEmpty()
    firstName: string;
  
    @IsString()
    @IsNotEmpty()
    lastName: string;
  
    @IsString()
    @IsOptional()
    middleName?: string;
  
    @IsString()
    @IsOptional()
    gender: string;
  
    @IsString()
    @IsNotEmpty()
    phone: string;
  
    @IsString()
    @IsOptional()
    referral?: string;
  
    @IsString()
    @IsOptional()
    country: string;
  
    @IsBoolean()
    @IsNotEmpty()
    agreeToTerms: boolean;
  
    @IsBoolean()
    @IsOptional()
    updatesOptIn?: boolean;
  }
  

export class RequestEmailOTPDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number?: string; // Optional: to identify user when adding email for first time
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

  @IsString()
  @IsOptional()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number?: string; // Optional: to identify user when adding email for first time
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
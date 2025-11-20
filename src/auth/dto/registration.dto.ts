import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsObject,
  Matches,
  MinLength,
  MaxLength,
  IsEmail,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeviceMetadataDto {
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @IsString()
  @IsOptional()
  device_name?: string;

  @IsString()
  @IsOptional()
  device_model?: string;

  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsString()
  @IsOptional()
  os_name?: string;

  @IsString()
  @IsOptional()
  os_version?: string;

  @IsString()
  @IsOptional()
  app_version?: string;

  @IsString()
  @IsOptional()
  network_type?: string;

  @IsBoolean()
  @IsOptional()
  is_connected?: boolean;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsBoolean()
  @IsOptional()
  has_biometric_hardware?: boolean;

  @IsString()
  @IsOptional()
  biometric_type?: string;

  @IsString()
  @IsOptional()
  collected_at?: string;
}

export class StartRegistrationDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'Referral code must be alphanumeric',
  })
  referral_code?: string;

  @ValidateNested()
  @Type(() => DeviceMetadataDto)
  @IsNotEmpty()
  device_metadata: DeviceMetadataDto;
}

export class ResendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number: string;

  @IsString()
  @IsOptional()
  session_id?: string; // Optional: if provided, validates it matches phone_number

  @ValidateNested()
  @Type(() => DeviceMetadataDto)
  @IsNotEmpty()
  device_metadata: DeviceMetadataDto;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^[0-9]{6}$/, {
    message: 'OTP must be a 6-digit number',
  })
  otp: string;

  @IsString()
  @IsOptional()
  session_id?: string; // Optional: if provided, validates it matches phone_number
}

export class SubmitIdInformationDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(BVN|NIN)$/i, {
    message: 'ID type must be either BVN or NIN',
  })
  id_type: 'BVN' | 'NIN';

  @IsString()
  @IsNotEmpty()
  @MinLength(11)
  @MaxLength(11)
  @Matches(/^[0-9]{11}$/, {
    message: 'ID number must be exactly 11 digits',
  })
  id_number: string;

  @IsString()
  @IsOptional()
  session_id?: string; // Optional: if provided, validates it matches phone_number
}

export class CheckLoginStatusDto {
  @IsEmail()
  @IsOptional()
  @ValidateIf((o) => !o.phone_number)
  email?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number?: string;
}

export class VerifyPasswordDto {
  @IsEmail()
  @IsOptional()
  @ValidateIf((o) => !o.phone_number)
  email?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ValidateNested()
  @Type(() => DeviceMetadataDto)
  @IsOptional()
  device_metadata?: DeviceMetadataDto;
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  street_address: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  state: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lga: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  area?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  country: string;
}

export class SubmitResidentialAddressDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsNotEmpty()
  address: AddressDto;

  @IsString()
  @IsOptional()
  session_id?: string; // Optional: if provided, validates it matches phone_number
}


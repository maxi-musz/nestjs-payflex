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
  IsIn,
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

export class VerifyLoginPasswordDto {
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

export class PepDetailsDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['self', 'spouse', 'parent', 'sibling', 'child', 'other'])
  relationship: 'self' | 'spouse' | 'parent' | 'sibling' | 'child' | 'other';

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  position: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  country: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'start_date must be in YYYY-MM-DD format',
  })
  start_date?: string | null;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'end_date must be in YYYY-MM-DD format',
  })
  end_date?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  additional_notes?: string | null;
}

export class SubmitPepDeclarationDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number: string;

  @IsBoolean()
  @IsNotEmpty()
  is_pep: boolean;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.is_pep === true)
  @IsNotEmpty({ message: 'pep_details is required when is_pep is true' })
  pep_details?: string | null; // JSON string when is_pep is true, null when false

  @IsString()
  @IsOptional()
  session_id?: string; // Optional: if provided, validates it matches phone_number
}

export class SubmitIncomeDeclarationDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  occupation: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  annual_income: string; // Income range string (e.g., "N1 million - N5 million")

  @IsBoolean()
  @IsNotEmpty()
  has_other_income: boolean;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.has_other_income === true)
  @IsNotEmpty({ message: 'other_income_source is required when has_other_income is true' })
  @MaxLength(200)
  other_income_source?: string | null;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.has_other_income === true)
  @IsNotEmpty({ message: 'expected_annual_income is required when has_other_income is true' })
  @MaxLength(100)
  expected_annual_income?: string | null;

  @IsString()
  @IsOptional()
  session_id?: string; // Optional: if provided, validates it matches phone_number
}

export class SubmitPasswordSetupDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[0-9]{10}$/, {
    message: 'Phone number must be in E.164 format (+234XXXXXXXXXX)',
  })
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(6, { message: 'Password must not exceed 6 characters' })
  password: string;

  @IsString()
  @IsOptional()
  session_id?: string; // Optional: if provided, validates it matches phone_number
}


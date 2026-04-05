import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsSixDigitPassword } from '../../common/validation/six-digit-password.decorator';

function toBoolean(value: unknown): unknown {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
}

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsSixDigitPassword()
  password: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsOptional()
  middle_name?: string;

  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  referral_code?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  @IsNotEmpty()
  agree_to_terms: boolean;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return toBoolean(value);
  })
  @IsBoolean()
  @IsOptional()
  updates_opt_in?: boolean;
}

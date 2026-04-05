import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export const SIX_DIGIT_PASSWORD_MESSAGE =
  'Password must be exactly 6 digits (numbers only, no letters or symbols)';

/**
 * Login / registration / password reset: password is exactly six numeric digits.
 */
export function IsSixDigitPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    Matches(/^\d{6}$/, { message: SIX_DIGIT_PASSWORD_MESSAGE }),
  );
}

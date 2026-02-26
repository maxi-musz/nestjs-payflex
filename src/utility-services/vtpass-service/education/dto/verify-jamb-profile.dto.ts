import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyJambProfileDto {
  /** JAMB Profile ID (obtained from JAMB Official Website) */
  @IsString()
  @IsNotEmpty()
  billersCode: string;

  /** The variation_code from GET variation codes (e.g., utme-mock, utme-no-mock) */
  @IsString()
  @IsNotEmpty()
  type: string;
}

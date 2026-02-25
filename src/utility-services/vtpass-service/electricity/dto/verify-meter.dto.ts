import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { VALID_ELECTRICITY_SERVICE_IDS } from './purchase-electricity.dto';

export class VerifyMeterDto {
  @IsString()
  @IsNotEmpty()
  billersCode: string;

  @IsString()
  @IsNotEmpty()
  serviceID: string;

  @IsString()
  @IsIn(['prepaid', 'postpaid'])
  type: 'prepaid' | 'postpaid';
}

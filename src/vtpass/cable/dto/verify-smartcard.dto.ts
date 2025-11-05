import { IsNotEmpty, IsString } from 'class-validator';

export class VerifySmartcardDto {
  @IsString()
  @IsNotEmpty()
  billersCode: string; // smartcard number

  @IsString()
  @IsNotEmpty()
  serviceID: string; // dstv | gotv | startimes | showmax
}



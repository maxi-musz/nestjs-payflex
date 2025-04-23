import { IsString, IsNotEmpty } from "class-validator";

export class ValidateBettingProviderGiftBillDto {
    @IsString()
    @IsNotEmpty()
    provider: string;

    @IsString()
    @IsNotEmpty()
    customerId: string;
}
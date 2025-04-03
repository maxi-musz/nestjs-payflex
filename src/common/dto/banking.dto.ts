import { IsEmail, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class PaystackFundingDto {
    @IsString()
    @IsNotEmpty()
    callback_url: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;
}

export class PaystackFundingVerifyDto {
    @IsString()
    @IsNotEmpty()
    reference: string;
}
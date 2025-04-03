import { IsEmail, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class PaystackFundingDto {
    @IsEmail()
    @IsNotEmpty()
    @IsString()
    email: string;

    @IsString()
    @IsNotEmpty()
    callback_url: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;
}

export class InititatePaystackFundingDto {
    @IsEmail()
    @IsNotEmpty()
    @IsString()
    email: string;

    
}
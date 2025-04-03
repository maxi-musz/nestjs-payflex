import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class BuyAirtimeDto {
    @IsString()
    @IsNotEmpty()
    provider: string;

    @IsString()
    @IsNotEmpty()
    number: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    reference: string;
}
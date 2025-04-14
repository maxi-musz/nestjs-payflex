import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class BuyAirtimeDto {
    @IsString()
    @IsNotEmpty()
    provider: string;

    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;
}

export class DataPurchaseDto {
    @IsString()
    @IsNotEmpty()
    provider: string;

    @IsString()
    @IsNotEmpty()
    number: string;

    @IsString()
    @IsNotEmpty()
    plan_id: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;
}

export class SetsubDataPricesDto {
    
}
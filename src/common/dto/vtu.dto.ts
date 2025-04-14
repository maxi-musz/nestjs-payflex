import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class GiftBillsBuyAirtimeDto {
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

enum DataProviders {
    MTN = 'MTN',
    GLO = 'GLO',
    AIRTEL = 'AIRTEL',
    NINE_MOBILE = '9MOBILE',
}

export class SetsubDataPricesDto {
    @IsNotEmpty()
    @IsString()
    @IsEnum(DataProviders)
    provider: DataProviders;
}

export class SetsubPurchaseDataDto {
    @IsNotEmpty()
    @IsString()
    plan_id: string;

    @IsNotEmpty()
    @IsString()
    network: string;

    @IsNotEmpty()
    @IsString()
    phone_number: string;

    @IsNotEmpty()
    @IsNumber()
    amount: number;
}

export class SetsubPurchaseAirtimeDto {

    @IsNotEmpty()
    @IsString()
    network: string;

    @IsNotEmpty()
    @IsString()
    phone_number: string;

    @IsNotEmpty()
    @IsNumber()
    amount: number;
}
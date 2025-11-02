import { IsEnum, IsNotEmpty, IsString, IsOptional } from "class-validator";

export enum PreferredBank {
    WEMA_BANK = 'wema-bank',
    PAYSTACK_TITAN = 'paystack-titan'
}

export class CreatePaystackCustomerDto {
    @IsString()
    @IsNotEmpty()
    first_name: string;

    @IsString()
    @IsNotEmpty()
    last_name: string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    phone: string;
}

export class AssignDvaDto {
    @IsEnum(PreferredBank)
    @IsOptional()
    preferred_bank?: PreferredBank;

    @IsString()
    @IsOptional()
    country?: string;
}


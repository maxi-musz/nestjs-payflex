import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum KycIdType {
    NIGERIAN_BVN_VERIFICATION = "NIGERIAN_BVN_VERIFICATION",
    NIGERIAN_NIN = "NIGERIAN_NIN",
    NIGERIAN_INTERNATIONAL_PASSPORT = "NIGERIAN_INTERNATIONAL_PASSPORT",
    NIGERIAN_PVC = "NIGERIAN_PVC",
    NIGERIAN_DRIVERS_LICENSE = "NIGERIAN_DRIVERS_LICENSE"
}
  
export class KycVerificationDto {
    @IsNotEmpty()
    @IsEnum(KycIdType)
    id_type: KycIdType;

    @IsString()
    @IsNotEmpty()
    id_no: string;
}

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    first_name?: string;

    @IsString()
    @IsOptional()
    last_name?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    home_address?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    country?: string;

    @IsString()
    @IsOptional()
    postal_code?: string;

    @IsString()
    @IsOptional()
    house_number?: string;
}

export class VerifyBvnDto {
    @IsString()
    @IsNotEmpty()
    bvn: string;

    @IsString()
    @IsNotEmpty()
    first_name: string;

    @IsString()
    @IsNotEmpty()
    last_name: string;

    @IsString()
    @IsNotEmpty()
    redirect_url: string;
}
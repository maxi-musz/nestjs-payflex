import { IsEnum, IsNotEmpty, IsString } from "class-validator";

enum IdTypeEnum {
    NIGERIAN_BVN_VERIFICATION,
    NIGERIAN_INTERNATIONAL_PASSPORT,
    NIGERIAN_PVC,
    NIGERIAN_DRIVERS_LICENSE
}
export class KycVerificationDto {
    @IsString()
    @IsNotEmpty()
    @IsEnum(IdTypeEnum)
    id_type: string;

    @IsString()
    @IsNotEmpty()
    bvn: string;
}

export class UpdateUserDto {
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
    phone_number: string;

    @IsString()
    address: string;

    @IsString()
    city: string;

    @IsString()
    state: string;

    @IsString()
    country: string;
}
import { Injectable } from '@nestjs/common';
import { GIFTBILL_CONFIG } from 'src/common/config';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from 'colors';
import axios from 'axios';
import { ValidateBettingProviderGiftBillDto } from './dto/vas.dto';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

let apiUrl: string;
let apiKey: string;
let merchantId: string;

if (process.env.NODE_ENV === "production") {
    apiUrl = GIFTBILL_CONFIG.BASE_PROD_URL || "";
    apiKey = GIFTBILL_CONFIG.PROD_API_KEY || "";
    merchantId = GIFTBILL_CONFIG.MERCHANT_ID || "";
} else {
    apiUrl = GIFTBILL_CONFIG.BASE_SANDBOX_URL || "";
    apiKey = GIFTBILL_CONFIG.SANDBOX_API_KEY || "";
    merchantId = GIFTBILL_CONFIG.MERCHANT_ID || "";
}

@Injectable()
export class VasService {
    constructor(private prisma: PrismaService) {}

    async FetchAllBettingProvidersGiftBills() {
        console.log(colors.cyan("Fetching all betting providers"))

        console.log("API URL: ", apiUrl)

        try {
            const response = await axios.get(`${apiUrl}/betting`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'MerchantId': merchantId,
                    'Content-Type': 'application/json'
                }
            })

            console.log(colors.magenta("All Betting providers fetched successfully"))
            return response.data;
        } catch (error) {
            console.log(colors.red(error));
            throw new Error(error);
        }

    }

    async validateBettingProviderGiftBill(dto: ValidateBettingProviderGiftBillDto) {
        console.log(colors.cyan("Validating betting provider gift bill"))

        const reqBody = {
            provider: dto.provider,
            customerId: dto.customerId
        }

        try {
            const response = await axios.post(`${apiUrl}/betting/validate`, reqBody, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'MerchantId': merchantId,
                    'Content-Type': 'application/json'
                }
            })

            if(!response.data.success) {
                console.log(colors.red(response.data.message))
                return new ApiResponseDto(response.data.success, response.data.message, response.data.data);
            }

            console.log(colors.magenta("Betting provider gift bill validated successfully"))
            return new ApiResponseDto(response.data.success, response.data.message, response.data.data);

        } catch (error) {
            console.log(colors.red(error));
            throw new Error(error);
        }
    }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from "colors"
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import axios from 'axios';
import { response } from 'express';
import { BuyAirtimeDto } from 'src/common/dto/vtu.dto';
import { GIFTBILL_CONFIG } from 'src/common/config';

@Injectable()
export class VtuService {
    constructor(
        private prisma: PrismaService

    ) {}

    async test(userPayload: any) {
        console.log(colors.cyan("Testing..."))
    }

    async fetchAirtimeProviders(
    ) {
        console.log(colors.cyan("Fetching all airtime providers on giftbills"))

        let response: any;

        const apiUrl = `${GIFTBILL_CONFIG.BASE_URL}/airtime`;
        const apiKey = GIFTBILL_CONFIG.API_KEY?.trim()

        try {

            response = await axios.get(
                    apiUrl 
                    ? apiUrl 
                    : "", 
                {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    // MerchantId: merchantId,
                    'content-type': 'application/json'
                }
            });

            console.log(colors.magenta("Airtime providers successfully fetched..."))
            return new ApiResponseDto(true, "Fetched all airtime providers", response.data.data)
            
        } catch (error) {
            console.log(colors.red(`Error fetching airtime providers: ${error}`))
            return new ApiResponseDto(false, `Error fetching airtime providers: ${error}`)
        }
    }

    async topupAirtime(userPayload: any, dto: BuyAirtimeDto) {
        console.log(colors.cyan("Purchasing airtime..."));
    
        let response: any;
    
        const requestBody = {
            provider: dto.provider,
            number: dto.number,
            amount: dto.amount,
            reference: dto.reference
        };
    
        try {
            const apiUrl = `${GIFTBILL_CONFIG.BASE_URL}/airtime/topup`;
            const apiKey = GIFTBILL_CONFIG.API_KEY?.trim();
            const merchantId = GIFTBILL_CONFIG.MERCHANT_ID
    
            response = await axios.post(apiUrl, requestBody, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    merchantId: merchantId,
                    'content-type': 'application/json'
                }
            });

            if(!response.success) {
                console.log(colors.red("Error purchasing airtime top up"))
                return new ApiResponseDto(false, `Error purchasing airtime top up: ${response.data.message}`)
            }
    
            console.log(colors.magenta(`Response received`));
            return new ApiResponseDto(response.data.success, response.data.message, response.data.data);
            
        } catch (error: any) {
            console.log(colors.red(`Error: ${error.message}`));
            
            return new ApiResponseDto(false, "Airtime purchase failed", error.response?.data || error.message);
        }
    }
}

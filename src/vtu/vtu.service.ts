import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from "colors"
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import axios from 'axios';
import { response } from 'express';
import { BuyAirtimeDto, DataPurchaseDto } from 'src/common/dto/vtu.dto';
import { GIFTBILL_CONFIG } from 'src/common/config';
import { formatAmount, formatDate } from 'src/common/helper_functions/formatter';
import { generateReference, generateSessionId } from 'src/common/helper_functions/generators';

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
            number: dto.phoneNumber,
            amount: dto.amount,
            reference: generateReference()
        };

        const userWallet = await this.prisma.wallet.findFirst({
            where: { user_id: userPayload.sub }
        })

        if (!userWallet) {
            console.log(colors.red("User wallet not found"));
            return new ApiResponseDto(false, "User wallet not found");
        }
        if (userWallet.current_balance < dto.amount) {
            console.log(colors.red("Insufficient wallet balance"));
            return new ApiResponseDto(false, "Insufficient wallet balance");
        }
    
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

            // if(!response.success) {
            //     console.log(colors.red(`Error purchasing airtime top up: ${response.data}`))
            //     return new ApiResponseDto(false, `Error purchasing airtime top up: ${response.data.message}`)
            // }

            await this.prisma.wallet.update({
                where: { id: userWallet.id },
                data: {
                    current_balance: {
                        decrement: dto.amount
                    },
                    all_time_withdrawn: {
                        increment: dto.amount  
                    }
                }
            })

            const transaction = await this.prisma.transactionHistory.create({
                data: {
                    user_id: userPayload.sub, 
                    description: dto.provider,
                    recipient_mobile: dto.phoneNumber,
                    amount: dto.amount,
                    transaction_type: 'airtime',
                    payment_method: "wallet",
                    transaction_reference: requestBody.reference,
                    // transaction_number: response.data.data.orderNo,
                    status: 'success',
                    createdAt: new Date()
                }
            });

            const formattedResponse = {
                id: transaction.id,
                provider: transaction.description,
                mobile: transaction.recipient_mobile,
                transaction_type: 'airtime',
                payment_method: "wallet",
                status: transaction.status,
                amount: formatAmount(transaction.amount ?? 0),
                reference: transaction.transaction_reference,
                created_at: formatDate(transaction.createdAt)
            }
    
            console.log(colors.magenta(`Response received: ${formattedResponse}`));
            return new ApiResponseDto(response.data.success, response.data.message, formattedResponse);
            
        } catch (error: any) {
            console.log(colors.red(`Error: ${error.message}`));
            
            return new ApiResponseDto(false, "Airtime purchase failed", error.response?.data || error.message);
        }
    }

    async fetchDataProviders() {
        console.log(colors.cyan("Returning all internet data providers"))

        const apiUrl = `${GIFTBILL_CONFIG.BASE_URL}/internet`;
        const apiKey = GIFTBILL_CONFIG.API_KEY?.trim()
        const merchantId = GIFTBILL_CONFIG.MERCHANT_ID

        try {
            
            const response = await axios.get(
                apiUrl 
                ? apiUrl 
                : "", 
            {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                MerchantId: merchantId,
                'content-type': 'application/json'
            }
            })

            console.log(colors.magenta("Internet data providers successfully fetched"))
            return new ApiResponseDto(true, "Internet data providers successfully fetched", response.data.data)
        } catch (error) {
            console.log(colors.red(`Error fetching Internet data providers: ${error.message}`))
            return new ApiResponseDto(true, `Error fetching Internet data providers: ${error.message}`)
        }
    }

    async fetchAvailableDataTypes() {
        console.log(colors.cyan("Fetching available data types"))

        const apiUrl = `${GIFTBILL_CONFIG.BASE_URL}/internet/data_types`;
        const apiKey = GIFTBILL_CONFIG.API_KEY?.trim()
        const merchantId = GIFTBILL_CONFIG.MERCHANT_ID

        try {

            const response = await axios.get(
                apiUrl 
                ? apiUrl 
                : "", 
            {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                MerchantId: merchantId,
                'content-type': 'application/json'
            }
            })

            console.log(colors.magenta("Internet data types successfully fetched"))

            return new ApiResponseDto(true, "Internet data tpypes successfully fetched", response.data)
            
        } catch (error) {
            console.log(colors.red(`Error fetching Internet data types: ${error.message}`))
            return new ApiResponseDto(true, `Error fetching Internet data types: ${error.message}`)
        }
    }

    async fetchDataPlanForAProvider(provider: string) {
        console.log(colors.cyan("Fetching data plans for a provider"))

        try {

            const apiUrl = `${GIFTBILL_CONFIG.BASE_URL}/internet/plans/${provider}`;
            const apiKey = GIFTBILL_CONFIG.API_KEY?.trim()
            const merchantId = GIFTBILL_CONFIG.MERCHANT_ID

            const response = await axios.get(
                apiUrl 
                ? apiUrl 
                : "", 
            {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                MerchantId: merchantId,
                'content-type': 'application/json'
            }
            })

            console.log(colors.magenta("Internet data types successfully fetched"))

            return new ApiResponseDto(
                response.data.success, 
                response.data.message,
                response.data.data
            )
            
        } catch (error) {
            console.log(colors.red(`Error fetching Internet data types: ${error.message}`))
            return new ApiResponseDto(
                true, 
                `Error fetching Internet data types: ${error.message}`
            )
        }
    }

    async initiateDataPurchase(dto: DataPurchaseDto, userPayload: any) {
        console.log(colors.cyan("Initiating a new data purchase"));
    
        const existingUser = await this.prisma.user.findUnique({
            where: { id: userPayload.sub }
        });
    
        if (!existingUser) {
            console.log(colors.red('User not found'));
            return new ApiResponseDto(false, "User not found");
        }

        const reference = generateReference();
    
        const requestBody = {
            provider: dto.provider,
            number: dto.number,
            plan_id: dto.plan_id,
            reference: reference
        };
    
        // Start Prisma transaction
        return await this.prisma.$transaction(async (prisma) => {
            const wallet = await prisma.wallet.findFirst({
                where: { user_id: existingUser.id }
            });
    
            if ((!wallet || (wallet?.current_balance ?? 0) < dto.amount)) {
                console.log(colors.red("Not enough balance to complete transaction"));
                throw new Error("Insufficient wallet balance");
            }
    
            // console.log(colors.blue(`Available wallet balance: #${formatAmount(wallet?.current_balance ?? 0)}`));
    
            let apiResponse: any;
            const apiUrl = `${GIFTBILL_CONFIG.BASE_URL}/internet/data`;
            const apiKey = GIFTBILL_CONFIG.API_KEY?.trim();
            const merchantId = GIFTBILL_CONFIG.MERCHANT_ID;
    
            try {
                apiResponse = await axios.post(apiUrl, requestBody, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        merchantId: merchantId,
                        'content-type': 'application/json'
                    }
                });
    
                if (!apiResponse.data.success) {
                    throw new Error("API request failed: " + apiResponse.data.message);
                }
            } catch (error: any) {
                const giftbillErrorMessage = error.response?.data?.message || error.message;
                console.log(colors.red(`API Error: ${giftbillErrorMessage}`));
    
                // Graceful handling for specific Giftbill error
                if (giftbillErrorMessage.includes("Undefined variable: res")) {
                    return new ApiResponseDto(
                        false,
                        "The data plan is currently not available. Please try another plan or later.",
                        null
                    );
                }
    
                throw new Error(giftbillErrorMessage || "Failed to process request");
            }
    
            // Deduct balance
            const updatedWallet = await prisma.wallet.update({
                where: { id: wallet?.id },
                data: { current_balance: { decrement: dto.amount } }
            });
    
            console.log(colors.yellow(`New Wallet Balance: ${updatedWallet.current_balance}`));
    
            // Record transaction
            const newHistory = await prisma.transactionHistory.create({
                data: {
                    account_id: wallet?.id,
                    user_id: existingUser.id,
                    amount: dto.amount,
                    transaction_type: "data",
                    description: "Data top-up",
                    payment_method: "wallet",
                    status: "success",
                    recipient_mobile: dto.number,
                    transaction_number: dto.plan_id,
                    transaction_reference: reference,
                    session_id: generateSessionId(),
                    icon: {
                        create: {
                            secure_url: "mtn url",
                            public_id: "mtn id public"
                        }
                    }
                },
                include: { icon: true }
            });
    
            console.log(colors.magenta("Internet data successfully purchased"));
    
            return new ApiResponseDto(
                true,
                `You have successfully purchased #${formatAmount(dto.amount)} worth of data for ${dto.number}`,
                {
                    amount: formatAmount(dto.amount),
                    number: dto.number,
                    icon: newHistory.icon?.secure_url
                }
            );
        }).catch((error) => {
            console.log(colors.red(`Transaction failed: ${error}`));
            return new ApiResponseDto(false, `Transaction failed: ${error.message}`);
        });
    }
    
    
}

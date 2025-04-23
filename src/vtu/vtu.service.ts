import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from "colors"
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import axios from 'axios';
import { response } from 'express';
import { GiftBillsBuyAirtimeDto, SetsubDataPricesDto, SetsubPurchaseAirtimeDto, SetsubPurchaseDataDto, GiftBillDataPurchaseDto } from 'src/common/dto/vtu.dto';
import { GIFTBILL_CONFIG, SETSUB_CONFIG } from 'src/common/config';
import { formatAmount, formatDate } from 'src/common/helper_functions/formatter';
import { generateReference, generateSessionId } from 'src/common/helper_functions/generators';

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

        const apiUrl = `${GIFTBILL_CONFIG.BASE_PROD_URL}/airtime`;
        const apiKey = GIFTBILL_CONFIG.PROD_API_KEY?.trim()

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

    async topupAirtimeGiftbills(userPayload: any, dto: GiftBillsBuyAirtimeDto) {
        console.log(colors.cyan("Purchasing new airtime from gift bills..."));
    
        let response: any;
    
        const requestBody = {
            provider: dto.network.toUpperCase(),
            number: dto.phone_number,
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

        console.log("API URL: ", apiUrl);
        console.log("API KEY: ", apiKey);
    
        try {
    
            response = await axios.post(`${apiUrl}/airtime/topup`, requestBody, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    merchantId: merchantId,
                    'content-type': 'application/json'
                }
            });

            

            if(!response.data.success) {
                console.log(colors.red(`Error purchasing airtime top up: ${response.data}`))
                return new ApiResponseDto(false, `Error purchasing airtime top up: ${response.data.message}`)
            }

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
                    description: dto.network,
                    recipient_mobile: dto.phone_number,
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
    
            console.log(colors.magenta(`Your airtime purchase of #${formatAmount(transaction.amount ?? 0)} to ${transaction.recipient_mobile} was successful`));
            return new ApiResponseDto(response.data.success, response.data.message, formattedResponse);
            
        } catch (error: any) {
            console.log(colors.red(`Error: ${error.message}`));
            
            return new ApiResponseDto(false, "Airtime purchase failed", error.response?.data || error.message);
        }
    }

    async fetchDataProviders() {
        console.log(colors.cyan("Returning all internet data providers"))

        const url = `${apiUrl}/internet`
        console.log("URL: ", url);

        try {
            
            const response = await axios.get(
                url 
                ? url 
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

        const url = `${apiUrl}/internet/data_types`
        console.log("URL: ", url);

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

    async fetchDataPlanForAProvidergiftBills(provider: string) {
        console.log(colors.cyan("Fetching data plans for a provider"))

        const url = `${apiUrl}/internet/plans/${provider}`
        console.log("URL: ", url);

        try {

            const response = await axios.get(
                url 
                ? url 
                : "", 
            {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                MerchantId: merchantId,
                'content-type': 'application/json'
            }
            })

            console.log(colors.magenta("Internet data types successfully fetched"))

            // Filter data plans with id >= 200
            let filteredDataPlans: any[] = [];
            if(provider === "MTN") {
                filteredDataPlans = response.data.data.filter((plan: any) => plan.id >= 200);
            }else if (provider === "AIRTEL") {
                filteredDataPlans = response.data.data.filter((plan: any) => plan.id >= 229);
            } else if (provider === "GLO") {
                filteredDataPlans = response.data.data.filter((plan: any) => plan.id >= 185);
            } else if (provider === "9MOBILE") {
                filteredDataPlans = response.data.data
            } else if( provider === "SPECTRANET") {
                filteredDataPlans = response.data.data
            } else if(provider === "SMILE_4G") {
                filteredDataPlans = response.data.data
            } else {
                console.log(`Invalid provider selected: ${provider}")`)
                return new ApiResponseDto(false, `Invalid provider selected: ${provider}`);
            }

            return new ApiResponseDto(
                response.data.success, 
                response.data.message,
                filteredDataPlans
            )
            
        } catch (error) {
            console.log(colors.red(`Error fetching Internet data types: ${error.message}`))
            return new ApiResponseDto(
                true, 
                `Error fetching Internet data types: ${error.message}`
            )
        }
    }

    async initiateDataPurchaseGiftBills(dto: GiftBillDataPurchaseDto, userPayload: any) {
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
            number: dto.phone_number,
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
            const url = `${apiUrl}/internet/data`
            console.log("URL: ", url);
    
            try {
                apiResponse = await axios.post(url, requestBody, {
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
                    recipient_mobile: dto.phone_number,
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
    
            console.log(colors.magenta(`You have successfully purchased ${formatAmount(dto.amount)} worth of data to${dto.phone_number}`));
    
            return new ApiResponseDto(
                true,
                `You have successfully purchased #${formatAmount(dto.amount)} worth of data for ${dto.phone_number}`,
                {
                    amount: formatAmount(dto.amount),
                    number: dto.phone_number,
                    icon: newHistory.icon?.secure_url
                }
            );
        }).catch((error) => {
            console.log(colors.red(`Transaction failed: ${error}`));
            return new ApiResponseDto(false, `Transaction failed: ${error.message}`);
        });
    }

    async getSetsubDataPrices(dto: SetsubDataPricesDto, userPayload: any) {
        console.log(colors.cyan("Fetching all setsub data prices for a provider"));
    
        let setsub_sandbox_base_url: any;
        let setsub_scret_key: any;
        let setsub_token: any;
    
        if (process.env.NODE_ENV === "production") {
            setsub_scret_key = SETSUB_CONFIG.SETSUB_CLIENT_SECRET;
            setsub_token = SETSUB_CONFIG.SETSUB_TOKEN;
            setsub_sandbox_base_url = SETSUB_CONFIG.SETSUB_SANDBOX_BASE_URL;
        } else {
            setsub_scret_key = SETSUB_CONFIG.SETSUB_CLIENT_SECRET;
            setsub_token = SETSUB_CONFIG.SETSUB_TOKEN;
            setsub_sandbox_base_url = SETSUB_CONFIG.SETSUB_SANDBOX_BASE_URL;
        }
    
        try {
            const response = await axios.get(
                `${setsub_sandbox_base_url}/services/data`,
                {
                    headers: {
                        Authorization: `Bearer ${setsub_token}`,
                        'content-type': 'application/json',
                        Accept: 'application/json',
                    },
                }
            );
    
            console.log(colors.magenta("Internet data types from setsub successfully fetched"));
            // console.log("Response Data:", response.data);
    
            // Dynamically access the provider's data
            const providerKey = dto.provider.toLowerCase(); // Convert provider to lowercase (e.g., "mtn" -> "mtn")
            const providerData = response.data.data[providerKey]; // Access the provider's data dynamically
    
            if (providerData && Array.isArray(providerData)) {
                const finalResponse = providerData.filter((item: any) => item.provider === "autopilotng");
                return new ApiResponseDto(true, "Internet data types successfully fetched", finalResponse);
            } else {
                // console.log(`No data found for provider: ${dto.provider}`);
                return new ApiResponseDto(false, `No data found for provider: ${dto.provider}`);
            }
        } catch (error) {
            console.log(colors.red(`Error fetching Internet data types: ${error.message}`));
            return new ApiResponseDto(false, `Error fetching Internet data types: ${error.message}`);
        }
    }
    
    async purchaseDataOnSetsub(dto: SetsubPurchaseDataDto, userPayload: any) {
    
        console.log("UserPayload: ", userPayload);
    
        console.log("Purchasing data on setsub...", dto);
        let setsub_sandbox_base_url: any;
        let setsub_scret_key: any;
        let setsub_token: any;
        if (process.env.NODE_ENV === "production") {
            setsub_scret_key = SETSUB_CONFIG.SETSUB_CLIENT_SECRET;
            setsub_token = SETSUB_CONFIG.SETSUB_TOKEN;
            setsub_sandbox_base_url = SETSUB_CONFIG.SETSUB_SANDBOX_BASE_URL;
        }
        else {
            setsub_scret_key = SETSUB_CONFIG.SETSUB_CLIENT_SECRET;
            setsub_token = SETSUB_CONFIG.SETSUB_TOKEN;
            setsub_sandbox_base_url = SETSUB_CONFIG.SETSUB_SANDBOX_BASE_URL;
        }
        console.log("Base URL: ", setsub_sandbox_base_url);
        console.log("Token: ", setsub_token);
        const requestBody = {
            phone_number: dto.phone_number,
            plan_id: dto.plan_id,
            reference: generateReference(),
            network: dto.network,
            transaction_pin: "6234"
        }
    
        try {
            
            try {
                console.log(colors.blue("Calling paystack for data purchase..."));
                const response = await axios.post(
                    `${setsub_sandbox_base_url}/services/data/purchase`,
                    requestBody,
                    {
                        headers: {
                            Authorization: `Bearer ${setsub_token}`,
                            'content-type': 'application/json',
                            Accept: 'application/json',
                        },
                    }
                );
    
                console.log("Response: ", response)
            } catch (error) {
                console.log(colors.red(`Error: ${error.message}`));
                return new ApiResponseDto(false, `Error: ${error.message}`);
                
            }
    
            // if(!response.success) {
            //     console.log(colors.red(`Error purchasing data on setsub: ${response}`));
            //     return new ApiResponseDto(false, `Error purchasing data on setsub: ${JSON.stringify(response)}`);
            // }
    
            const newHistory = await this.prisma.transactionHistory.create({
                data: {
                    user_id: userPayload.sub,
                    amount: 0,
                    transaction_type: "data",
                    description: "Data top-up",
                    payment_method: "wallet",
                    status: "pending",
                    recipient_mobile: dto.phone_number,
                    transaction_number: dto.plan_id,
                    transaction_reference: requestBody.reference,
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
            console.log("Transaction history created: ", newHistory);
    
            console.log(colors.magenta("Data successfully purchased on setsub"));
            // return new ApiResponseDto(true, "Data successfully purchased on setsub", response.data);
            
        } catch (error) {
            console.log(colors.red(`Error purchasing data on setsub: ${error.message}`));
            return new ApiResponseDto(false, `Error purchasing data on setsub: ${error.message}`);
            
        }
    }

    async purchaseAirtimeOnSetsub(dto: SetsubPurchaseAirtimeDto, userPayload: any) {
    
        console.log("UserPayload: ", userPayload);
    
        console.log("Purchasing airtime on setsub...", dto);
        let setsub_sandbox_base_url: any;
        let setsub_scret_key: any;
        let setsub_token: any;
        if (process.env.NODE_ENV === "production") {
            setsub_scret_key = SETSUB_CONFIG.SETSUB_CLIENT_SECRET;
            setsub_token = SETSUB_CONFIG.SETSUB_TOKEN;
            setsub_sandbox_base_url = SETSUB_CONFIG.SETSUB_SANDBOX_BASE_URL;
        }
        else {
            setsub_scret_key = SETSUB_CONFIG.SETSUB_CLIENT_SECRET;
            setsub_token = SETSUB_CONFIG.SETSUB_TOKEN;
            setsub_sandbox_base_url = SETSUB_CONFIG.SETSUB_SANDBOX_BASE_URL;
        }
        console.log("Base URL: ", setsub_sandbox_base_url);
        console.log("Token: ", setsub_token);
        const requestBody = {
            phone_number: dto.phone_number,
            reference: generateReference(),
            network: dto.network,
            transaction_pin: "6234"
        }
    
        try {
            
            try {
                console.log(colors.blue("Calling setsub for airtime purchase..."));
                const response = await axios.post(
                    `${setsub_sandbox_base_url}/services/data/purchase`,
                    requestBody,
                    {
                        headers: {
                            Authorization: `Bearer ${setsub_token}`,
                            'content-type': 'application/json',
                            Accept: 'application/json',
                        },
                    }
                );
    
                console.log("Response: ", response)
            } catch (error) {
                console.log(colors.red(`Error: ${error.message}`));
                return new ApiResponseDto(false, `Error: ${error.message}`);
                
            }
    
            // if(!response.success) {
            //     console.log(colors.red(`Error purchasing data on setsub: ${response}`));
            //     return new ApiResponseDto(false, `Error purchasing data on setsub: ${JSON.stringify(response)}`);
            // }
    
            const newHistory = await this.prisma.transactionHistory.create({
                data: {
                    user_id: userPayload.sub,
                    amount: 0,
                    transaction_type: "airtime",
                    description: "airtime top-up",
                    payment_method: "wallet",
                    status: "success",
                    recipient_mobile: dto.phone_number,
                    // transaction_number: dto.plan_id,
                    transaction_reference: generateReference(),
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
            console.log("Transaction history created: ", newHistory);
    
            console.log(colors.magenta("Data successfully purchased on setsub"));
            // return new ApiResponseDto(true, "Data successfully purchased on setsub", response.data);
            
        } catch (error) {
            console.log(colors.red(`Error purchasing data on setsub: ${error.message}`));
            return new ApiResponseDto(false, `Error purchasing data on setsub: ${error.message}`);
            
        }
    }
}

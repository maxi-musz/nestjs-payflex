import { Injectable } from '@nestjs/common';
import { PaystackFundingDto } from 'src/common/dto/banking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import colors from "colors"

import axios from "axios";
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

@Injectable()
export class BankingService {
    constructor(
        private prisma: PrismaService,

    ) {}

    // 
    async initialisePaystackFunding(dto: PaystackFundingDto) {
        // Determine Paystack environment key
        const paystackKey =
            process.env.NODE_ENV === "development"
                ? process.env.PAYSTACK_TEST_SECRET_KEY || ''
                : process.env.PAYSTACK_LIVE_SECRET_KEY || '';
    
        const amountInKobo = dto.amount * 100;
    
        // Fetch existing user with accounts
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
            // include: { accounts: true },
        });
    
        if (!existingUser) {
            console.log(colors.red("User not found"));
            return new ApiResponseDto(false, "User not found");
        }
    
        try {
            // 1. Initialize Paystack payment
            const response = await axios.post(
                'https://api.paystack.co/transaction/initialize',
                {
                    email: dto.email,
                    amount: amountInKobo,
                    callback_url: dto.callback_url,
                },
                {
                    headers: {
                        Authorization: `Bearer ${paystackKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
    
            const { authorization_url, access_code, reference } = response.data.data;
    
            // 2. Create transaction history record
            const newHistory = await this.prisma.transactionHistory.create({
                data: {
                    // account_id: existingUser?.accounts[0]?.id,
                    user_id: existingUser?.id,
                    amount: dto.amount,
                    transaction_type: "deposit",
                    description: "Wallet funding with Paystack",
                    fee: 10,
                    transaction_number: access_code,
                    transaction_reference: reference,
                    session_id: "sess-28636981",
                    sender_details: {
                        create: {
                            sender_name: "",
                            sender_bank: "",
                            sender_account_number: "",
                        },
                    },
                    icon: {
                        create: {
                            secure_url: "paystack-icon",
                            public_id: "paystack-icon",
                        },
                    },
                },
                include: {
                    sender_details: true,
                    icon: true,
                },
            });
    
            return new ApiResponseDto(true, "Transaction initialized successfully");
        } catch (error) {
            console.error(colors.red("Error initializing Paystack funding"), error);
            return new ApiResponseDto(false, "Failed to initialize transaction");
        }
    }
}

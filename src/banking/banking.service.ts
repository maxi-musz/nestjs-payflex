import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaystackFundingDto, PaystackFundingVerifyDto } from 'src/common/dto/banking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from "colors"

import axios from "axios";
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { formatAmount, formatDate } from 'src/common/helper_functions/formatter';
import { generateSessionId } from 'src/common/helper_functions/generators';

@Injectable()
export class BankingService {
    constructor(
        private prisma: PrismaService,

    ) {}

    // 
    async initialisePaystackFunding(dto: PaystackFundingDto, userPayload: any) {
        // Determine Paystack environment key
        const paystackKey =
            process.env.NODE_ENV === "development"
                ? process.env.PAYSTACK_TEST_SECRET_KEY || ''
                : process.env.PAYSTACK_LIVE_SECRET_KEY || '';
    
        const amountInKobo = dto.amount * 100;
    
        // Fetch existing user with accounts
        const existingUser = await this.prisma.user.findUnique({
            where: { email: userPayload.email },
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
                    email: userPayload.email,
                    amount: amountInKobo,
                    callback_url: dto.callback_url,
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const wallet = await this.prisma.account.findFirst({
                where: { user_id: existingUser.id }
            })
    
            const { authorization_url, access_code, reference } = response.data.data;
    
            // 2. Create transaction history record
            const newHistory = await this.prisma.transactionHistory.create({
                data: {
                    account_id: wallet?.id,
                    user_id: existingUser?.id,
                    amount: dto.amount,
                    transaction_type: "deposit",
                    description: "Wallet funding with Paystack",
                    fee: 10,
                    transaction_number: access_code,
                    transaction_reference: reference,
                    session_id: generateSessionId(),
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

            const clientResponse = {
                authorization_url:  authorization_url,
                reference: reference,
                amount: dto.amount,
                email: userPayload.email
            }

            console.log(colors.magenta("New paystack wallet funding successfully initiated"))
    
            return new ApiResponseDto(true, "New paystack wallet funding successfully initiated", clientResponse);

        } catch (error) {
            console.error(colors.red("Error initializing Paystack funding"), error);
            return new ApiResponseDto(false, "Failed to initialize transaction", error);
        }
    }

    async verifyPaystackFunding(dto: PaystackFundingVerifyDto, userPayload: any) {
        console.log(colors.cyan("Verifying wallet funding with Paystack"));
    
        // Determine Paystack environment key
        const paystackKey =
            process.env.NODE_ENV === "development"
                ? process.env.PAYSTACK_TEST_SECRET_KEY || ''
                : process.env.PAYSTACK_LIVE_SECRET_KEY || '';
    
        try {
            // Fetch the transaction from the database
            const existingTransaction = await this.prisma.transactionHistory.findFirst({
                where: { transaction_reference: dto.reference }
            });
    
            // Validate transaction existence and amount
            if (!existingTransaction || !existingTransaction.amount) {
                console.log(colors.red("Transaction not found or amount is missing"));
                throw new NotFoundException("Transaction not found or amount is missing");
            }

            if(existingTransaction.status === "success") {
                console.log(colors.red("Transaction already verified"));
                return new ApiResponseDto(false, "Transaction already verified");
            }
    
            const amountInKobo = existingTransaction.amount * 100;

            if (!dto.reference) {
                throw new BadRequestException("Transaction reference is missing");
            }

            const updatedWallet = await this.prisma.wallet.findFirst({
                where: { user_id: userPayload._id }
              })

            if (!updatedWallet) {
                console.log(colors.red("Wallet not found"));
                throw new NotFoundException("Wallet not found");
            }

            // Verify transaction with Paystack
            let response: any;
            try {
                response = await axios.get(`https://api.paystack.co/transaction/verify/${dto.reference}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`
                    }
                });
            } catch (error) {
                console.error(colors.red(`Error verifying transaction with Paystack: ${error}`));
                throw new Error(`Failed to verify transaction with Paystack: ${error.message}`);
            }
    
            // Extract relevant data from Paystack response
            const { status: paystackStatus, amount: paystackKoboAmount } = response.data?.data;
    
            if (paystackStatus !== 'success') {
                console.log(colors.red("Payment was not completed or successful"));
                return new ApiResponseDto(false, "Payment was not completed or successful");
            }
    
            // Validate that the amount paid matches the expected amount
            if (paystackKoboAmount !== amountInKobo) {
                console.log(colors.red("Amount mismatch detected"));
                return new ApiResponseDto(false, "Payment amount does not match transaction amount");
            }

            // update the payment ststaus in db to success
            const updatedTx = await this.prisma.transactionHistory.update({
                where: { transaction_reference: dto.reference },
                data: { 
                  status: paystackStatus,
                  updatedAt: new Date() 
                },
                include: {
                  sender_details: true,
                  icon: true
                }
              });



                console.log(colors.cyan(`Transaction amount: , ${existingTransaction.amount}`)); // Log the transaction amount
                console.log(colors.cyan(`Current wallet balance: ", ${updatedWallet.current_balance}`)); // Log the current balance

                // Update wallet
                const updatedWalletResult = await this.prisma.wallet.update({
                where: { id: updatedWallet?.id },
                data: {
                    current_balance: updatedWallet.current_balance + existingTransaction.amount,
                    all_time_fuunding: updatedWallet.all_time_fuunding + existingTransaction.amount,
                    all_time_withdrawn: updatedWallet.all_time_withdrawn,
                    updatedAt: new Date()
                }
                });

                console.log(colors.cyan(`wallet amount: , ${updatedWalletResult.current_balance}`));

              const formattedResponse = {
                id: updatedTx.id,
                amount: formatAmount(updatedTx.amount ?? 0),
                transaction_type: "deposit",
                description: "wallet funding with paystack",
                status: "success",
                payment_method: "paystack",
                date: formatDate(updatedTx.updatedAt)
              }
    
            console.log(colors.green("Payment verified successfully"));
            return new ApiResponseDto(true, "Payment verified successfully", formattedResponse);
    
        } catch (error) {
            console.error(colors.red(`Verification error: ${error.message}`));
            throw new Error(`Verification error: ${error.message}`);
        }
    }

    
}

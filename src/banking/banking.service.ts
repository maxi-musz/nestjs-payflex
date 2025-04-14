import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PaystackFundingDto, PaystackFundingVerifyDto } from 'src/common/dto/banking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from "colors"

import axios from "axios";
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { formatAmount, formatDate } from 'src/common/helper_functions/formatter';
import { generateSessionId } from 'src/common/helper_functions/generators';
import { CreateVirtualAccountDto } from './dto/accountNo-creation.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BankingService {

    private readonly apiUrl: string;
    private readonly secretKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        this.apiUrl = 'https://api.flutterwave.com/v3';
        this.secretKey = this.configService.get<string>('FLW_SECRET_KEY') || '';
    }

    private getHeaders() {
        return {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        };
      }
    
 
    // 
    async initialisePaystackFunding(dto: PaystackFundingDto, userPayload: any) {
        console.log("Inititating paystack funding")
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
                    callback_url: "https://my-mobileapp.com/verify-paystack-funding",
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
                    credit_debit: "credit",

                    description: "Wallet funding",
                    fee: 10,
                    transaction_number: access_code,
                    transaction_reference: reference,
                    authorization_url: authorization_url,
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
                            secure_url: "https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png",
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

            console.log("user id: ", userPayload.sub)

            const userWallet = await this.prisma.wallet.findFirst({
                where: { user_id: userPayload.sub }
              })

            if (!userWallet) {
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

                console.log(colors.cyan(`Transaction amount: , ${existingTransaction.amount}`)); 
                console.log(colors.cyan(`Current wallet balance: ", ${userWallet.current_balance}`)); 

                // Update wallet
                const updatedWalletResult = await this.prisma.wallet.update({
                where: { id: userWallet?.id },
                data: {
                    current_balance: userWallet.current_balance + existingTransaction.amount,
                    all_time_fuunding: userWallet.all_time_fuunding + existingTransaction.amount,
                    all_time_withdrawn: userWallet.all_time_withdrawn,
                    updatedAt: new Date()
                }
                });
                console.log(colors.yellow(`Updated wallet new currnt balance: ${updatedWalletResult.current_balance}`))

              const formattedResponse = {
                id: updatedTx.id,
                amount: formatAmount(updatedTx.amount ?? 0),
                transaction_type: updatedTx.transaction_type || "deposit",
                credit_debit: updatedTx.credit_debit || "null",
                description: "wallet funding",
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

    async createVirtualIntlBankAccountNumber(dto: CreateVirtualAccountDto, userPayload: any) {
        console.log(colors.cyan(`Creating a new ${dto.currency} virtual account for user: ${userPayload.email}`));
    
        try {
            // get user details
            const existingUser = await this.prisma.user.findUnique({
                where: {id: userPayload.sub},
                include: {
                    address: true,
                    profile_image: true,
                    kyc_verification: true,
                }
            });
    
            if (!existingUser) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }
    
            // Step 2: Check if user already has account in this currency
            const existingAccount = await this.prisma.account.findFirst({
                where: { 
                    user_id: userPayload.sub, 
                    currency: dto.currency 
                },
            });
    
            if (existingAccount?.account_number) {
                throw new HttpException(
                    `You already have a ${dto.currency} virtual account`,
                    HttpStatus.BAD_REQUEST
                );
            }
    
            // Step 3: Create virtual account on Flutterwave
            const endpoint = `${this.apiUrl}/virtual-account-numbers`;
            
            console.log("Calling flutterwave endpoint...");
            const requestBody = {
                email: existingUser.email,
                is_permanent: true,
                bvn: existingUser?.kyc_verification?.id_no || '22222222222',
                tx_ref: `VA-${Date.now()}-${existingUser.id}`,
                phonenumber: existingUser.phone_number || '08000000000',
                firstname: existingUser.first_name || 'Unknown',
                lastname: existingUser.last_name || 'User',
                narration: `${existingUser.first_name || 'Unknown'} ${existingUser.last_name || 'User'}`,
                currency: dto.currency
            };
            
            console.log(colors.yellow('Creating virtual account...'));
    
            let response;
            try {
                response = await axios.post(endpoint, requestBody, {
                    headers: this.getHeaders(),
                });
                
                const accountData = response.data.data;
                console.log(colors.blue(`Newly created virtual account: ${JSON.stringify(accountData)}`));
                
                // Step 4: Save virtual account to database
                const accountToSave = {
                    user_id: existingUser.id,
                    currency: dto.currency,
                    account_number: accountData.account_number,
                    bank_name: accountData.bank_name,
                    reference: accountData.reference,
                    order_ref: accountData.order_ref,
                    flutterwave_id: accountData.id.toString(),
                    isActive: true,
                    meta_data: accountData,
                };
                
                const newAccount = existingAccount
                    ? await this.prisma.account.update({
                        where: { id: existingAccount.id },
                        data: accountToSave,
                    })
                    : await this.prisma.account.create({ data: accountToSave });
                
                console.log(colors.magenta(`New ${dto.currency} virtual account successfully created`));
                return new ApiResponseDto(
                    true,
                    `New ${dto.currency} virtual account successfully created`,
                    newAccount
                );
                
            } catch (error) {
                // Better error handling for axios errors
                console.error(colors.red('Error response from Flutterwave:'), 
                    error.response?.data || error.message);
                    
                const errorMessage = error.response?.data?.message || 
                    'Virtual account creation failed';
                    
                throw new HttpException(errorMessage, 
                    error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
            }
        } catch (error) {
            console.log(colors.red(`Error creating account: ${error.message || error}`));
            
            // Return error response instead of undefined
            return new ApiResponseDto(
                false,
                error.message || 'Failed to create virtual account',
                null
            );
        }
    }

    
}

import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PaystackFundingDto, PaystackFundingVerifyDto } from 'src/common/dto/banking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from "colors"
import { Logger } from '@nestjs/common';

import axios from "axios";
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { formatAmount, formatDate } from 'src/common/helper_functions/formatter';
import { generateSessionId } from 'src/common/helper_functions/generators';
import { CreateVirtualAccountDto, InitiateTransferDto, VerifyAccountNumberDto } from './dto/accountNo-creation.dto';
import { ConfigService } from '@nestjs/config';
import { error } from 'console';
import { BankProviderFactory } from './bank-providers/bank-provider.factory';
import { StatsService } from 'src/common/stats/stats.service';

// Determine Paystack environment key
const paystackKey =
process.env.NODE_ENV === "development"
    ? process.env.PAYSTACK_TEST_SECRET_KEY || ''
    : process.env.PAYSTACK_LIVE_SECRET_KEY || '';

const generateTransferReference = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let reference = '';
    
    for (let i = 0; i < 16; i++) {
        reference += characters.charAt(Math.floor(Math.random() * characters.length));
    } 

    return reference;
};

@Injectable()
export class BankingService {

    private readonly apiUrl: string;
    private readonly secretKey: string;
    private readonly logger = new Logger(BankingService.name);
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly bankProviderFactory: BankProviderFactory,
        private readonly stats: StatsService,
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
    
        // Log which key is being used (without exposing the actual key)
        console.log(colors.blue(`Using Paystack ${process.env.NODE_ENV === "development" ? "TEST" : "LIVE"} key`));
        console.log(colors.blue(`Key prefix: ${paystackKey.substring(0, 7)}...`));
    
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

        console.log("Callback url: ", dto.callback_url)
    
        try {
            // 1. Initialize Paystack payment
            console.log(colors.blue("Initializing Paystack transaction..."));
            
            const response = await axios.post(
                'https://api.paystack.co/transaction/initialize',
                {
                    email: userPayload.email,
                    amount: amountInKobo,
                    callback_url: dto.callback_url,
                },
                {
                    headers: {
                        Authorization: `Bearer ${paystackKey}`, // Use the same key variable, not hardcoded
                        'Content-Type': 'application/json',
                    },
                }
            );

            // Log full Paystack response for debugging
            console.log(colors.green(`Paystack Initialize Status: ${response.status}`));

            const wallet = await this.prisma.account.findFirst({
                where: { user_id: existingUser.id }
            })
    
            // Extract and validate response data
            if (!response.data || !response.data.data) {
                console.error(colors.red("Invalid Paystack response structure"));
                // console.error(colors.red(`Full response: ${JSON.stringify(response.data)}`));
                return new ApiResponseDto(false, "Invalid response from payment provider", response.data);
            }
    
            const { authorization_url, access_code, reference } = response.data.data;
            
            
            console.log(colors.cyan(`  - reference: ${reference}`));
            
            // Validate extracted values
            if (!reference) {
                console.error(colors.red("Reference is missing from Paystack response!"));
                return new ApiResponseDto(false, "Payment initialization failed: Missing reference", response.data);
            }
            
            if (!access_code) {
                console.error(colors.red("Access code is missing from Paystack response!"));
                return new ApiResponseDto(false, "Payment initialization failed: Missing access code", response.data);
            }
    
            // 2. Create transaction history record
            // console.log(colors.blue("Saving transaction to database..."));
            // console.log(colors.blue(`Saving with reference: ${reference}`));
            // console.log(colors.blue(`Saving with access_code (transaction_number): ${access_code}`));
            
            const createdTransaction = await this.prisma.transactionHistory.create({
                data: {
                    account_id: wallet?.id,
                    user_id: existingUser?.id,
                    amount: dto.amount,
                    transaction_type: "deposit",
                    credit_debit: "credit",
                    description: "Wallet Funding Via Gateway",
                    fee: 10,
                    transaction_number: access_code,
                    transaction_reference: reference,
                    authorization_url: authorization_url,
                    session_id: generateSessionId(),
                    payment_channel: "paystack",
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

            console.log(colors.green(`Transaction saved successfully. ID: ${createdTransaction.id}`));
            this.stats.onTransactionCreated(dto.amount, 'pending');
            
            // // Double-check by querying back from DB
            // const verifySaved = await this.prisma.transactionHistory.findUnique({
            //     where: { id: createdTransaction.id },
            //     select: { transaction_reference: true, transaction_number: true }
            // });
            // console.log(colors.cyan("Verification - Retrieved from DB:"));
            // console.log(colors.cyan(`  - transaction_reference: ${verifySaved?.transaction_reference}`));
            // console.log(colors.cyan(`  - transaction_number: ${verifySaved?.transaction_number}`));

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
        console.log(colors.cyan(`Verifying wallet funding with Paystack. Reference: ${dto.reference}`));
    
        try {
            // 1. Validate reference is provided
            if (!dto.reference || !dto.reference.trim()) {
                console.log(colors.red("Transaction reference is missing or empty"));
                return new ApiResponseDto(false, "Transaction reference is required");
            }

            let reference = dto.reference.trim();
            const userId = userPayload?.sub;

            if (!userId) {
                console.log(colors.red("User ID is missing from token"));
                return new ApiResponseDto(false, "Authentication error. Please login again.");
            }

            // 2. Fetch the transaction from the database
            // Try to find by transaction_reference first (Paystack reference)
            let existingTransaction = await this.prisma.transactionHistory.findFirst({
                where: { transaction_reference: reference }
            });

            // If not found, try transaction_number (access_code) - in case frontend sends wrong field
            if (!existingTransaction) {
                console.log(colors.yellow(`Transaction not found by reference, trying transaction_number: ${reference}`));
                existingTransaction = await this.prisma.transactionHistory.findFirst({
                    where: { transaction_number: reference }
                });
                
                if (existingTransaction) {
                    console.log(colors.yellow(`Found transaction by transaction_number. Using actual Paystack reference: ${existingTransaction.transaction_reference}`));
                    // Use the actual Paystack reference for verification
                    const actualReference = existingTransaction.transaction_reference;
                    if (!actualReference) {
                        console.log(colors.red(`Transaction found but has no transaction_reference stored`));
                        return new ApiResponseDto(false, "Transaction found but missing payment reference. Please contact support.");
                    }
                    // Update reference to use the actual Paystack reference
                    reference = actualReference;
                }
            }
    
            // 3. Validate transaction exists
            if (!existingTransaction) {
                console.log(colors.red(`Transaction not found for reference: ${reference}`));
                return new ApiResponseDto(false, "Transaction not found. Please check the reference and try again.");
            }

            // Log the reference being used for Paystack verification
            console.log(colors.blue(`Using Paystack reference for verification: ${reference}`));

            // 4. Validate transaction belongs to the user
            if (existingTransaction.user_id !== userId) {
                console.log(colors.red(`Transaction ${reference} does not belong to user ${userId}`));
                return new ApiResponseDto(false, "Transaction not found. Please check the reference and try again.");
            }

            // 5. Validate transaction has amount
            if (!existingTransaction.amount || existingTransaction.amount <= 0) {
                console.log(colors.red(`Transaction ${reference} has invalid amount: ${existingTransaction.amount}`));
                return new ApiResponseDto(false, "Invalid transaction. Please contact support.");
            }

            // 6. Check if transaction is already verified
            if (existingTransaction.status === "success") {
                console.log(colors.yellow(`Transaction ${reference} already verified`));
                return new ApiResponseDto(true, "Transaction already verified", {
                    id: existingTransaction.id,
                    amount: formatAmount(existingTransaction.amount),
                    transaction_type: existingTransaction.transaction_type || "deposit",
                    credit_debit: existingTransaction.credit_debit || "null",
                    description: "wallet funding",
                    status: "success",
                    payment_method: "paystack",
                    date: formatDate(existingTransaction.updatedAt)
                });
            }

            // 6.5. Check if payment has been completed
            // If status is "pending" or null, allow verification anyway (webhook might not have processed yet)
            // This allows manual verification if user completed payment but webhook is delayed
            if (existingTransaction.status === "pending" || !existingTransaction.status) {
                console.log(colors.yellow(`Transaction ${reference} status is pending - proceeding with verification anyway`));
                console.log(colors.yellow(`This allows manual verification if payment was completed but webhook hasn't processed yet`));
                // Continue to verification - don't block it
            }
    
            // 7. Get user wallet
            const userWallet = await this.prisma.wallet.findFirst({
                where: { user_id: userId }
            });

            if (!userWallet) {
                console.log(colors.red(`Wallet not found for user: ${userId}`));
                return new ApiResponseDto(false, "Wallet not found. Please contact support.");
            }

            const amountInKobo = existingTransaction.amount * 100;

            // 8. Validate reference format (Paystack references are typically alphanumeric, 10+ characters)
            // if (reference.length < 10) {
            //     console.log(colors.red(`Invalid reference format: ${reference} (too short)`));
            //     return new ApiResponseDto(false, "Invalid transaction reference format. Please check and try again.");
            // }

            // 9. Determine Paystack environment key (must match initialization)
            const verifyPaystackKey =
                process.env.NODE_ENV === "development"
                    ? process.env.PAYSTACK_TEST_SECRET_KEY || ''
                    : process.env.PAYSTACK_LIVE_SECRET_KEY || '';
            
            // Log which key is being used for verification (without exposing the actual key)
            console.log(colors.blue(`Verifying with Paystack ${process.env.NODE_ENV === "development" ? "TEST" : "LIVE"} key`));
            console.log(colors.blue(`Key prefix: ${verifyPaystackKey.substring(0, 7)}...`));

            // 10. Verify transaction with Paystack
            let response: any;
            try {
                console.log(colors.blue(`Calling Paystack API with reference: ${reference}`));
                response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
                    headers: {
                        Authorization: `Bearer ${verifyPaystackKey}`
                    },
                    timeout: 10000, // 10 second timeout
                });
                console.log(colors.green(`Paystack API response received successfully`));
            } catch (error: any) {
                // Log full error details for debugging
                console.error(colors.red(`Error verifying transaction with Paystack:`), {
                    message: error.message,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    reference: reference
                });
                
                // Handle specific error cases
                if (error.response) {
                    const status = error.response.status;
                    const paystackMessage = error.response.data?.message || "Paystack API error";
                    const paystackData = error.response.data?.data || null;
                    
                    console.log(colors.red(`Paystack Error Details: Status ${status}, Message: ${paystackMessage}`));
                    
                    if (status === 404) {
                        return new ApiResponseDto(false, `Transaction reference "${reference}" not found on Paystack. Please ensure the payment was completed and try again.`);
                    } else if (status === 400) {
                        // 400 usually means invalid reference format or reference doesn't exist
                        return new ApiResponseDto(false, `Invalid transaction reference. Please check the reference "${reference}" and ensure it's correct.`);
                    } else if (status === 401) {
                        return new ApiResponseDto(false, "Payment verification service error. Please contact support.");
                    } else {
                        return new ApiResponseDto(false, `Payment verification failed: ${paystackMessage}`);
                    }
                } else if (error.code === 'ECONNABORTED') {
                    return new ApiResponseDto(false, "Payment verification timed out. Please try again.");
                } else {
                return new ApiResponseDto(false, "Unable to verify payment at this time. Please try again later.");
                }
            }
    
            // 9. Validate Paystack response structure
            if (!response?.data?.data) {
                console.error(colors.red("Invalid Paystack response structure"), JSON.stringify(response?.data));
                return new ApiResponseDto(false, "Invalid response from payment provider. Please try again.");
            }

            // 10. Extract relevant data from Paystack response
            const paystackData = response.data.data;
            const paystackStatus = paystackData.status;
            const paystackKoboAmount = paystackData.amount;
    
            if (paystackStatus !== 'success') {
                console.log(colors.yellow(`Payment status from Paystack: ${paystackStatus}`));
                return new ApiResponseDto(false, `Payment was not successful. Status: ${paystackStatus}`);
            }
    
            // 12. Validate that the amount paid matches the expected amount
            if (paystackKoboAmount !== amountInKobo) {
                console.log(colors.red(`Amount mismatch. Expected: ${amountInKobo}, Got: ${paystackKoboAmount}`));
                return new ApiResponseDto(false, "Payment amount does not match transaction amount. Please contact support.");
            }

            // 12. Use transaction to ensure atomicity of transaction update and wallet update
            const { updatedTx, updatedWallet } = await this.prisma.$transaction(async (tx) => {
                // Update transaction status
                const transaction = await tx.transactionHistory.update({
                    where: { transaction_reference: reference },
                data: { 
                  status: paystackStatus,
                  updatedAt: new Date() 
                },
                include: {
                  sender_details: true,
                  icon: true
                }
              });

                // Update wallet balance atomically
                const transactionAmount = existingTransaction.amount || 0;
                const wallet = await tx.wallet.update({
                    where: { id: userWallet.id },
                data: {
                        current_balance: {
                            increment: transactionAmount
                        },
                        all_time_fuunding: {
                            increment: transactionAmount
                        },
                    updatedAt: new Date()
                }
                });

                return { updatedTx: transaction, updatedWallet: wallet };
            });

            console.log(colors.green(`Payment verified successfully. New balance: ${updatedWallet.current_balance}`));
            this.stats.onTransactionStatusChanged('pending', 'success', existingTransaction.amount || 0);
            this.stats.onWalletFunded(existingTransaction.amount || 0);

              const formattedResponse = {
                id: updatedTx.id,
                amount: formatAmount(updatedTx.amount ?? 0),
                transaction_type: updatedTx.transaction_type || "deposit",
                credit_debit: updatedTx.credit_debit || "null",
                description: "wallet funding",
                status: "success",
                payment_method: "paystack",
                date: formatDate(updatedTx.updatedAt),
                balance_after: formatAmount(updatedWallet.current_balance)
              }
    
            return new ApiResponseDto(true, "Payment verified successfully", formattedResponse);
    
        } catch (error: any) {
            // Log full error details for debugging
            console.error(colors.red("Verification error while processing payment:"), {
                message: error.message,
                stack: error.stack,
                reference: dto.reference,
                userId: userPayload?.sub
            });

            // Return specific error messages based on error type
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                return new ApiResponseDto(false, error.message);
            }

            // Generic fallback
            return new ApiResponseDto(false, "Unable to verify payment at this time. Please try again later.");
        }
    }

    /**
     * Requery a pending Paystack (deposit) transaction with Paystack API and update DB if successful.
     * Used by cron to reconcile pending funding transactions.
     */
    async requeryPendingPaystackTransaction(reference: string): Promise<{ updated: boolean }> {
        this.logger.log(colors.cyan(`Requerying pending Paystack transaction: ${reference}`));
        try {
            const existingTransaction = await this.prisma.transactionHistory.findFirst({
                where: { transaction_reference: reference },
            });
            if (!existingTransaction || existingTransaction.status === 'success') {
                return { updated: false };
            }
            if (existingTransaction.transaction_type !== 'deposit' || existingTransaction.payment_method !== 'paystack') {
                return { updated: false };
            }
            if (!existingTransaction.amount || existingTransaction.amount <= 0) {
                return { updated: false };
            }

            const userWallet = await this.prisma.wallet.findFirst({
                where: { user_id: existingTransaction.user_id },
            });
            if (!userWallet) {
                return { updated: false };
            }

            const verifyPaystackKey =
                process.env.NODE_ENV === 'development'
                    ? process.env.PAYSTACK_TEST_SECRET_KEY || ''
                    : process.env.PAYSTACK_LIVE_SECRET_KEY || '';
            if (!verifyPaystackKey) {
                return { updated: false };
            }

            const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: { Authorization: `Bearer ${verifyPaystackKey}` },
                timeout: 10000,
            });

            if (!response?.data?.data) {
                return { updated: false };
            }

            const paystackData = response.data.data;
            const paystackStatus = paystackData.status;
            const paystackKoboAmount = paystackData.amount;
            const amountInKobo = existingTransaction.amount * 100;

            if (paystackStatus !== 'success' || paystackKoboAmount !== amountInKobo) {
                return { updated: false };
            }

            await this.prisma.$transaction(async (tx) => {
                await tx.transactionHistory.update({
                    where: { transaction_reference: reference },
                    data: { status: paystackStatus, updatedAt: new Date() },
                });
                await tx.wallet.update({
                    where: { id: userWallet.id },
                    data: {
                        current_balance: { increment: existingTransaction.amount || 0 },
                        all_time_fuunding: { increment: existingTransaction.amount || 0 },
                        updatedAt: new Date(),
                    },
                });
            });

            this.logger.log(colors.green(`[Cron] Paystack transaction ${reference} requery: verified and wallet credited`));
            return { updated: true };
        } catch (error: any) {
            console.log(colors.yellow(`[Cron] Paystack requery ${reference} failed: ${error?.message || error}`));
            return { updated: false };
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
                    account_name: `${existingUser.first_name} ${existingUser.last_name}`, // Add account_name
                };
                
                const newAccount = existingAccount
                    ? await this.prisma.account.update({
                        where: { id: existingAccount.id },
                        data: {
                            ...accountToSave,
                            currency: dto.currency, // Ensure currency matches the expected enum type
                        },
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

    async createTemporaryVirtualAccount (dto, userPayload: any) {
        console.log(colors.cyan("creating new temporry virtual ngn account"))

        const existingUser = await this.prisma.user.findUnique({
            where: { id: userPayload.sub },
        });

        if (!existingUser) {
            console.log(colors.red("User does not exist"));
            return new ApiResponseDto(false, "User does not exist");
        }

        try {
            console.log(colors.blue("Sending temp account creation to Flutterwave"));

            console.log("Amount: ", dto.amount)

            const reqBody = {
                email: userPayload.email,
                currency: 'NGN',
                amount: dto.amount,
                tx_ref: `VA-${Date.now()}-${existingUser.id}`,
                is_permanent: false,
                narration: `Please make a bank transfer to ${existingUser.first_name} ${existingUser.last_name}`,
            };

            const endpoint = `${this.apiUrl}/virtual-account-numbers`;
            console.log("Endpoint: ", endpoint);

            const response = await axios.post(endpoint, reqBody, {
                headers: this.getHeaders(),
            });

            const accountData = response.data.data;

            // create new temptransaction payment in db
            await this.prisma.flwTempAcctNumber.create({
                data: {
                    user_id: userPayload.sub,
                    account_number: accountData.account_number,
                    response_code: accountData.response_code,
                    bank_name: accountData.bank_name,
                    accountStatus: accountData.account_status,
                    frequency: accountData.frequency,
                    note: accountData.note,
                    flw_ref: accountData.flw_ref,
                    order_ref: accountData.order_ref,
                    order_no: accountData.order_ref,
                    amount: parseFloat(accountData.amount),
                    status: "pending",
                    // expires_at: new Date(Date.now() + 30 * 60 * 1000),
                    meta_data: accountData,
                },
            })

            const formattedresponse = {
                account_number: accountData.account_number,
                bank_name: accountData.bank_name,
                flw_ref: accountData.flw_ref,
                order_no: accountData.order_ref,
                amount: accountData.amount
            }

            console.log(colors.magenta("New temporary virtual account successfully created"));

            return new ApiResponseDto(
                true,
                `Please make a transfer of ${accountData.amount} to ${accountData.bank_name}, this account number expires in 30 mins`,
                formattedresponse
            );
        } catch (error: any) {
            if (error.response) {
                // Extract detailed error information from the response
                const statusCode = error.response.status;
                const errorMessage = error.response.data?.message || "Unknown error occurred";
                const errorDetails = error.response.data || {};

                console.log(colors.red(`Error creating new temp bank account: ${errorMessage} (Status Code: ${statusCode})`));
                console.log(colors.red(`Error Details: ${JSON.stringify(errorDetails)}`));

                return new ApiResponseDto(
                    false,
                    `Error creating new temp bank account: ${errorMessage} (Status Code: ${statusCode})`,
                    errorDetails
                );
            } else {
                // Handle other types of errors (e.g., network issues)
                console.log(colors.red(`Unexpected error: ${error.message}`));
                return new ApiResponseDto(false, `Unexpected error: ${error.message}`);
            }
        }
    }

    async createPermanentVirtualAccount (userPayload: any) {
        console.log(colors.cyan("creating new permanent virtual ngn account"))

        const existingUser = await this.prisma.user.findUnique({
            where: { 
                id: userPayload.sub,
             },
             include: {
                accounts: true,
                kyc_verification: true,
             }
        });

        if (!existingUser) {
            console.log(colors.red("User does not exist"));
            return new ApiResponseDto(false, "User does not exist");
        }

        if (existingUser?.accounts?.some(account => account.currency === "ngn")) {
            console.log(colors.red("User already has a NGN virtual account"));
            return new ApiResponseDto(false, "User already has a NGN virtual account");
        }

        if(existingUser?.kyc_verification?.status !== "approved") {
            console.log(colors.red("User KYC not verified"));
            return new ApiResponseDto(false, "User KYC not verified, Complete KYC to create a permanent virtual account");
        }

        try {
            console.log(colors.blue("Sending permanent account creation to Flutterwave"));

            const reqBody = {
                email: userPayload.email,
                currency: 'NGN',
                amount: 0,
                tx_ref: `PF-${Date.now()}-${existingUser.email}`,
                is_permanent: true,
                narration: `Please make a bank transfer to ${existingUser.first_name} ${existingUser.last_name}`,
                bvn: existingUser?.kyc_verification?.id_no,
            };

            const endpoint = `${this.apiUrl}/virtual-account-numbers`;
            console.log("Endpoint: ", endpoint);

            let response: any;

            try {

                response = await axios.post(endpoint, reqBody, {
                    headers: this.getHeaders(),
                });
                
            } catch (error) {
                console.error(colors.red('Error response from Flutterwave:'), 
                    error.response?.data || error.message);
                    
                const errorMessage = error.response?.data?.message || 
                    'Virtual account creation failed';
                    
                throw new HttpException(errorMessage, 
                    error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
                
            }

            const accountData = response.data.data;

            console.log("Account data: ", accountData)

            // Add new account details to db
            const accountToSave = {
                user_id: existingUser.id,
                currency: 'ngn' as any,
                account_number: accountData.account_number,
                bank_name: accountData.bank_name,
                reference: accountData.reference,
                order_ref: accountData.order_ref,
                country: "nigeria",
                isActive: true,
                meta_data: accountData,
                account_name: `${existingUser.first_name} ${existingUser.last_name}`,
            }; 
            
            await this.prisma.account.create({ data: accountToSave });

            console.log(colors.magenta("New permanent virtual account successfully created"));

            const formattedRes = {
                account_number: accountData.account_number,
                bank_name: accountData.bank_name,
            }

            return new ApiResponseDto(
                true,
                `New permanent virtual account successfully created`,
                formattedRes
            );
        } catch (error: any) {
            if (error.response) {
                // Extract detailed error information from the response
                const statusCode = error.response.status;
                const errorMessage = error.response.data?.message || "Unknown error occurred";
                const errorDetails = error.response.data || {};

                console.log(colors.red(`Error creating new temp bank account: ${errorMessage} (Status Code: ${statusCode})`));
                console.log(colors.red(`Error Details: ${JSON.stringify(errorDetails)}`));

                return new ApiResponseDto(
                    false,
                    `Error creating new temp bank account: ${errorMessage} (Status Code: ${statusCode})`,
                    errorDetails
                );
            } else {
                // Handle other types of errors (e.g., network issues)
                console.log(colors.red(`Unexpected error: ${error.message}`));
                return new ApiResponseDto(false, `Unexpected error: ${error.message}`);
            }
        }
    }

    // // //////////////////////////////        Fetch all user virtual accounts
    async getAllUserVirtualAccounts(userPayload: any) {
        console.log(colors.cyan("Fetching all user virtual accounts"));

        const existingUser = await this.prisma.user.findUnique({
            where: { id: userPayload.sub },
            include: {
                accounts: true,
            }
        });

        if (!existingUser) {
            console.log(colors.red("User not found"));
            return new ApiResponseDto(false, "User not found");
        }

        const formattedAccounts = existingUser.accounts.map((account) => ({
            id: account.id,
            account_number: account.account_number,
            bank_name: account.bank_name,
            currency: account.currency,
            createdAt: formatDate(account.createdAt),
        }));

        console.log(colors.magenta("Fetched all user virtual accounts successfully"));

        return new ApiResponseDto(true, "Fetched all user virtual accounts successfully", formattedAccounts);
    }
    async getUserVirtualAccountById(id: string, userPayload: any) {
        console.log(colors.cyan("Fetching user virtual account by ID"));

        const existingUser = await this.prisma.user.findUnique({
            where: { id: userPayload.sub },
            include: {
                accounts: true,
            }
        });

        if (!existingUser) {
            console.log(colors.red("User not found"));
            return new ApiResponseDto(false, "User not found");
        }

        const account = existingUser.accounts.find((account) => account.id === id);

        if (!account) {
            console.log(colors.red("Account not found"));
            return new ApiResponseDto(false, "Account not found");
        }

        const formattedAccount = {
            id: account.id,
            account_number: account.account_number,
            bank_name: account.bank_name,
            currency: account.currency,
            createdAt: formatDate(account.createdAt),
        };

        console.log(colors.magenta("Fetched user virtual account by ID successfully"));

        return new ApiResponseDto(true, "Fetched user virtual account by ID successfully", formattedAccount);
    }

    async fetchAllBanks() {
        console.log(colors.cyan("Fetching all banks via provider..."));

        try {
            const provider = this.bankProviderFactory.getProvider();
            const banks = await provider.fetchAllBanks();

            console.log(colors.magenta(`Fetched all banks successfully via ${provider.getProviderName()}`));

            return new ApiResponseDto(true, "Fetched all banks successfully", banks);
        } catch (error) {
            console.error(colors.red("Error fetching banks via provider:"), error);
            return new ApiResponseDto(false, "Error fetching banks");
        }
    }

    async verifyAccountNumber(dto: VerifyAccountNumberDto, userPayload: any) {
        console.log(colors.cyan("User verifying account number via bank provider"));

        try {
            const provider = this.bankProviderFactory.getProvider();
            const result = await provider.verifyAccountNumber(dto.account_number, dto.bank_code);
    
            if (result.success) {
                console.log(colors.green(`Account name successfully retrieved via ${provider.getProviderName()}: ${result.account_name}`));
                return new ApiResponseDto(true, "Bank details verified successfully", result.account_name);
            }

            console.log(colors.red(`Failed to verify bank details via ${provider.getProviderName()}: ${result.error}`));
            return new ApiResponseDto(false, result.error || "Failed to verify bank details");
        } catch (error) {
            console.error(colors.red("Unexpected error verifying bank details via provider"), error);
                return new ApiResponseDto(false, "An unexpected error occurred while verifying bank details");
        }
    }

    async initiateNewTransferFlutterwave(dto: InitiateTransferDto, userPayload: any) {
        console.log("Initiating new transfer with Flutterwave");

        const transferReference = generateTransferReference();

        const reqBody = {
            bank: dto.bank_code,
            account_number: dto.account_number,
            amount: dto.amount,
            currency: "NGN",
            beneficiary_name: dto.beneficiary_name,
            reference: transferReference,
            callback_url: `${process.env.BASE_URL}/api/v1/banking/flutterwave/callback`,
            narration: dto.narration,
        };

        try {
            const response = await axios.post(`${this.apiUrl}/transfers`, reqBody, {
                headers: this.getHeaders(),
            });

            console.log("Flutterwave Response: ", response.data);

            const createdTransaction = await this.prisma.$transaction(async (tx) => {
                return await tx.transactionHistory.create({
                    data: {
                        user_id: userPayload.sub,
                        amount: Number(dto.amount),
                        transaction_type: "transfer",
                        description: dto.narration,
                        status: "pending",
                        transaction_reference: transferReference,
                        payment_channel: "flutterwave",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            });

            return new ApiResponseDto(true, "Transfer initiated successfully", {
                flutterwave: response.data,
                transaction: createdTransaction,
            });
            
        } catch (error) {
            console.error("Transfer initiation failed", {
                error: error?.response?.data || error.message,
                stack: error.stack,
            });
        
            return new ApiResponseDto(false, "Failed to initiate transfer", null);
        }
    }

   
}

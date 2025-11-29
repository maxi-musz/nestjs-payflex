import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PaystackFundingDto, PaystackFundingVerifyDto } from 'src/common/dto/banking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from "colors"

import axios from "axios";
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { formatAmount, formatDate } from 'src/common/helper_functions/formatter';
import { generateSessionId } from 'src/common/helper_functions/generators';
import { CreateVirtualAccountDto, InitiateTransferDto, VerifyAccountNumberDto } from './dto/accountNo-creation.dto';
import { ConfigService } from '@nestjs/config';
import { error } from 'console';
import { BankProviderFactory } from './bank-providers/bank-provider.factory';

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

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly bankProviderFactory: BankProviderFactory,
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

        console.log("Callback url: ", dto.callback_url)
    
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
            await this.prisma.transactionHistory.create({
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
                        Authorization: `Bearer ${paystackKey}`
                    }
                });
            } catch (error) {
                console.error(colors.red(`Error verifying transaction with Paystack:`), error);
                // Return user-friendly error, do not throw generic Error
                return new ApiResponseDto(false, "Unable to verify payment at this time. Please try again later.");
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
            console.error(colors.red("Verification error while processing payment:"), error);
            // Always return ApiResponseDto with simple, user-friendly message
            return new ApiResponseDto(false, "Unable to verify payment at this time. Please try again later.");
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

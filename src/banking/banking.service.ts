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

    // //////////////////////////////
    // async createStaticLocalVirtualAccountNumber (userPayload: any) {

    //     console.log(colors.cyan(`Creating a new NGN static virtual account for user: ${userPayload.email}`));

    //     const existinguser = await this.prisma.user.findUnique({
    //         where: { id: userPayload.sub },
    //         include: {
    //             kyc_verification: true,
    //         }
    //     })

    //     if(!existinguser) {
    //         console.log(colors.red("User not found"));
    //         return new ApiResponseDto(false, "User not found");
    //     }

    //     // Step 2: Check if user already has account in this currency
    //     const existingAccount = await this.prisma.account.findFirst({
    //         where: {
    //             user_id: userPayload.sub,
    //             currency: 'ngn'
    //         },
    //     });

    //     if (existingAccount?.account_number) {
    //         console.log(colors.red(`User already has a NGN virtual account`));
    //         return new ApiResponseDto(false, `User already has a NGN virtual account`);
    //     }

    //     // Step 3: Create virtual account on Flutterwave
    //     const endpoint = `${this.apiUrl}/virtual-account-numbers`;
    //     console.log("Calling flutterwave endpoint...");
    //     const requestBody = {
    //         email: existinguser.email,
    //         is_permanent: false,
    //         bvn: existinguser?.kyc_verification?.id_no || '22222222222',
    //         tx_ref: `VA-${Date.now()}-${existinguser.id}`,
    //         phonenumber: existinguser.phone_number || '08000000000',
    //         firstname: existinguser.first_name || 'Unknown',
    //         lastname: existinguser.last_name || 'User',
    //         narration: `${existinguser.first_name || 'Unknown'} ${existinguser.last_name || 'User'}`,
    //         currency: 'NGN',
    //         amount: 0,
    //     };
    //     console.log(colors.yellow('Creating virtual account...'));

    //     try {

    //         const response  = await axios.post(
    //             `${this.apiUrl}/virtual-account-numbers`,
    //             requestBody,
    //             {
    //                 headers: this.getHeaders(),
    //             }
    //         );
    //         const accountData = response.data.data;
    //         console.log(colors.blue(`Newly created virtual account: ${JSON.stringify(accountData)}`));

    //         // Step 4: Save virtual account to database
    //         const accountToSave = {
    //             user_id: existinguser.id,
    //             currency: 'ngn',
    //             account_number: accountData.account_number,
    //             bank_name: accountData.bank_name,
    //             reference: accountData.reference,
    //             order_ref: accountData.order_ref,
    //             flutterwave_id: accountData.id.toString(),
    //             isActive: true,
    //             meta_data: accountData,
    //         };
    //         const newAccount = existingAccount
    //             ? await this.prisma.account.update({
    //                 where: { id: existingAccount.id },
    //                 data: {
    //                     ...accountToSave,
    //                     currency: dto.currency as CurrencyType, // Ensure currency matches the expected enum type
    //                 },
    //             })
    //             : await this.prisma.account.create({ data: accountToSave });
    //         console.log(colors.magenta(`New NGN virtual account successfully created`));
    //         return new ApiResponseDto(
    //             true,
    //             `New NGN virtual account successfully created`,
    //             newAccount
    //         );
            
    //     } catch (error) {
    //         console.log(colors.red(`Error creating account: ${error.message || error}`));
            
    //         // Return error response instead of undefined
    //         return new ApiResponseDto(
    //             false,
    //             error.message || 'Failed to create virtual account',
    //             null
    //         );
            
    //     }
    // }

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
        console.log(colors.cyan("Fetching all banks..."));



        try {
            const response = await axios.get(`https://api.paystack.co/bank`, {
                headers: this.getHeaders(),
            });

            // console.log("Response: ", response.data);

            const { status, data } = response.data;
            if(!status) {
                console.log(colors.red(`Error fetching banks: ${error}`));
                return new ApiResponseDto(false, "Error fetching banks");
            }

            const formattedPaystackBanks = data.map(bank => ({
                id: bank.id,
                name: bank.name,
                code: bank.code
            }));

            console.log(colors.magenta("Fetched all banks successfully"));

            return new ApiResponseDto(true, "Fetched all banks successfully", formattedPaystackBanks);
            
            
        } catch (error) {
            
        }
        
    }

    async verifyAccountNumberPaystack(dto: VerifyAccountNumberDto, userPayload: any) {
        console.log("User verifying account number".blue)

        const reqBody = {
            account_number: dto.account_number,
            bank_code: dto.bank_code
        }
    
        try {
            const response = await axios.get(`https://api.paystack.co/bank/resolve`, {
                params: reqBody,
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`
                }
            });
    
            const { status, data } = response.data;
    
            if (status) {
                console.log("Account name successfully retrieved: ", data.account_name);
                return new ApiResponseDto(true, "Bank details verified successfully", data.account_name);
            } else {
                console.log(`Failed to verify bank details: ${data.message}`);
                return new ApiResponseDto(false, `Failed to verify bank details: ${data.message}`);
            }
        } catch (error) {
            // Handle the error message and extract the response message
            if (error.response && error.response.data && error.response.data.message) {
                console.error(error.response.data.message);
                return new ApiResponseDto(false, error.response.data.message);
            } else {
                // For unexpected errors
                console.error("Unexpected error verifying bank details", error);
                return new ApiResponseDto(false, "An unexpected error occurred while verifying bank details");
            }
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

    /**
     * Handle Paystack payment success webhook
     * This is called automatically by Paystack when a payment is successful
     * Handles both regular payments and DVA (Dedicated Virtual Account) payments
     */
    async handlePaystackPaymentSuccess(data: any): Promise<void> {
        try {
            const { reference, amount, status, customer, channel, authorization } = data;
            
            console.log(colors.cyan(`Processing Paystack payment success for reference: ${reference}`));
            console.log(colors.cyan(`Payment channel: ${channel}, Customer: ${customer?.customer_code || 'N/A'}`));

            // Check if this is a DVA payment (bank transfer to dedicated virtual account)
            const isDvaPayment = channel === 'bank_transfer' && 
                                 authorization?.receiver_bank_account_number &&
                                 authorization?.account_name;

            if (isDvaPayment) {
                // Handle DVA payment
                await this.handleDvaPayment(data);
                return;
            }

            // Handle regular payment (existing logic for card payments, etc.)
            // Find the transaction in database
            const transaction = await this.prisma.transactionHistory.findFirst({
                where: { transaction_reference: reference }
            });

            if (!transaction) {
                console.log(colors.red(`Transaction not found for reference: ${reference}`));
                console.log(colors.yellow(`This might be a DVA payment. Checking customer code...`));
                
                // If no transaction found but we have a customer, try to handle as DVA
                if (customer?.customer_code) {
                    console.log(colors.cyan(`Attempting to process as DVA payment...`));
                    await this.handleDvaPayment(data);
                }
                return;
            }

            // Check if already processed
            if (transaction.status === 'success') {
                console.log(colors.yellow(`Transaction ${reference} already processed`));
                return;
            }

            // Verify amount matches (amount is in kobo from Paystack)
            const amountInKobo = Math.round((transaction.amount || 0) * 100);
            if (amount !== amountInKobo) {
                console.error(colors.red(`Amount mismatch for transaction ${reference}. Expected: ${amountInKobo}, Got: ${amount}`));
                return;
            }

            // Get user wallet
            const wallet = await this.prisma.wallet.findFirst({
                where: { user_id: transaction.user_id }
            });

            if (!wallet) {
                console.log(colors.red(`Wallet not found for user: ${transaction.user_id}`));
                return;
            }

            // Update transaction status
            await this.prisma.transactionHistory.update({
                where: { id: transaction.id },
                data: {
                    status: 'success',
                    updatedAt: new Date()
                }
            });

            // Update wallet balance
            const transactionAmount = transaction.amount || 0;
            await this.prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    current_balance: wallet.current_balance + transactionAmount,
                    all_time_fuunding: wallet.all_time_fuunding + transactionAmount,
                    updatedAt: new Date()
                }
            });

            console.log(colors.green(`Successfully processed Paystack payment for reference: ${reference}`));
        } catch (error) {
            console.error(colors.red(`Error processing Paystack payment success: ${error.message}`));
            console.error(colors.red(`Error stack: ${error.stack}`));
            throw error;
        }
    }

    /**
     * Handle DVA (Dedicated Virtual Account) payment webhook
     * This processes payments received directly to a user's DVA account
     */
    private async handleDvaPayment(data: any): Promise<void> {
        try {
            const { reference, amount, customer, authorization, paid_at, createdAt } = data;
            
            console.log(colors.cyan(`Processing DVA payment for reference: ${reference}`));
            console.log(colors.cyan(`Customer code: ${customer?.customer_code}, Amount: ${amount} kobo`));

            // Validate required data
            if (!customer?.customer_code) {
                console.error(colors.red(`DVA payment missing customer_code in webhook payload`));
                throw new Error('Customer code is required for DVA payment processing');
            }

            if (!reference) {
                console.error(colors.red(`DVA payment missing reference in webhook payload`));
                throw new Error('Transaction reference is required for DVA payment processing');
            }

            // Check for idempotency - prevent duplicate processing
            const existingTransaction = await this.prisma.transactionHistory.findFirst({
                where: { transaction_reference: reference }
            });

            if (existingTransaction) {
                if (existingTransaction.status === 'success') {
                    console.log(colors.yellow(`DVA payment ${reference} already processed successfully`));
                    return;
                }
                console.log(colors.yellow(`DVA payment ${reference} exists but not successful, updating...`));
            }

            // Find user by Paystack customer code
            const user = await this.prisma.user.findUnique({
                where: { paystack_customer_code: customer.customer_code },
                include: { wallet: true }
            });

            if (!user) {
                console.error(colors.red(`User not found for customer code: ${customer.customer_code}`));
                throw new Error(`User not found for Paystack customer code: ${customer.customer_code}`);
            }

            if (!user.wallet) {
                console.error(colors.red(`Wallet not found for user: ${user.id}`));
                throw new Error(`Wallet not found for user: ${user.id}`);
            }

            // Convert amount from kobo to NGN
            const amountInNgn = amount / 100;
            console.log(colors.cyan(`Processing DVA payment: ${amountInNgn} NGN for user ${user.email}`));

            // Get current wallet balance
            const balanceBefore = user.wallet.current_balance;
            const balanceAfter = balanceBefore + amountInNgn;

            // Create or update transaction history
            if (existingTransaction) {
                await this.prisma.transactionHistory.update({
                    where: { id: existingTransaction.id },
                    data: {
                        status: 'success',
                        amount: amountInNgn,
                        balance_before: balanceBefore,
                        balance_after: balanceAfter,
                        updatedAt: new Date()
                    }
                });
                console.log(colors.green(`Updated transaction record for DVA payment: ${reference}`));
            } else {
                // Find the DVA account for this user
                const dvaAccount = await this.prisma.account.findFirst({
                    where: {
                        user_id: user.id,
                        account_status: 'active',
                        account_number: authorization?.receiver_bank_account_number || undefined,
                    }
                });

                await this.prisma.transactionHistory.create({
                    data: {
                        user_id: user.id,
                        account_id: dvaAccount?.id || null,
                        amount: amountInNgn,
                        transaction_type: 'deposit',
                        credit_debit: 'credit',
                        description: `DVA Payment received via ${authorization?.receiver_bank || 'Bank Transfer'}`,
                        status: 'success',
                        currency_type: 'ngn',
                        payment_method: 'bank_transfer',
                        payment_channel: 'paystack',
                        transaction_reference: reference,
                        balance_before: balanceBefore,
                        balance_after: balanceAfter,
                        createdAt: paid_at ? new Date(paid_at) : new Date(),
                    }
                });
                console.log(colors.green(`Created transaction record for DVA payment: ${reference}`));
            }

            // Update wallet balance
            await this.prisma.wallet.update({
                where: { id: user.wallet.id },
                data: {
                    current_balance: balanceAfter,
                    all_time_fuunding: user.wallet.all_time_fuunding + amountInNgn,
                    updatedAt: new Date()
                }
            });

            console.log(colors.green(`✅ Successfully processed DVA payment:`));
            console.log(colors.green(`   Reference: ${reference}`));
            console.log(colors.green(`   User: ${user.email}`));
            console.log(colors.green(`   Amount: ${amountInNgn} NGN`));
            console.log(colors.green(`   Balance: ${balanceBefore} → ${balanceAfter} NGN`));
            console.log(colors.green(`   Account: ${authorization?.receiver_bank_account_number || 'N/A'}`));

        } catch (error) {
            console.error(colors.red(`Error processing DVA payment: ${error.message}`));
            console.error(colors.red(`Error stack: ${error.stack}`));
            throw error;
        }
    }

    /**
     * Handle Paystack payment failed webhook
     */
    async handlePaystackPaymentFailed(data: any): Promise<void> {
        try {
            const { reference } = data;
            
            console.log(colors.cyan(`Processing Paystack payment failure for reference: ${reference}`));

            // Find and update transaction
            const transaction = await this.prisma.transactionHistory.findFirst({
                where: { transaction_reference: reference }
            });

            if (transaction && transaction.status !== 'failed') {
                await this.prisma.transactionHistory.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'failed',
                        updatedAt: new Date()
                    }
                });

                console.log(colors.green(`Transaction ${reference} marked as failed`));
            }
        } catch (error) {
            console.error(colors.red(`Error processing Paystack payment failure: ${error.message}`));
        }
    }

    /**
     * Handle Paystack transfer success webhook
     */
    async handlePaystackTransferSuccess(data: any): Promise<void> {
        try {
            const { reference, amount, status } = data;
            
            console.log(colors.cyan(`Processing Paystack transfer success for reference: ${reference}`));

            const transaction = await this.prisma.transactionHistory.findFirst({
                where: { transaction_reference: reference }
            });

            if (transaction && transaction.status !== 'success') {
                await this.prisma.transactionHistory.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'success',
                        updatedAt: new Date()
                    }
                });

                console.log(colors.green(`Transfer ${reference} marked as successful`));
            }
        } catch (error) {
            console.error(colors.red(`Error processing Paystack transfer success: ${error.message}`));
        }
    }

    /**
     * Handle Paystack transfer failed webhook
     */
    async handlePaystackTransferFailed(data: any): Promise<void> {
        try {
            const { reference, reason } = data;
            
            console.log(colors.cyan(`Processing Paystack transfer failure for reference: ${reference}`));

            const transaction = await this.prisma.transactionHistory.findFirst({
                where: { transaction_reference: reference }
            });

            if (transaction && transaction.status !== 'failed') {
                await this.prisma.transactionHistory.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'failed',
                        updatedAt: new Date()
                    }
                });

                console.log(colors.green(`Transfer ${reference} marked as failed. Reason: ${reason || 'Unknown'}`));
            }
        } catch (error) {
            console.error(colors.red(`Error processing Paystack transfer failure: ${error.message}`));
        }
    }
}

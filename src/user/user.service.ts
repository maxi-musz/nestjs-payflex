import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import * as colors from "colors";
import { ApiResponseDto } from "src/common/dto/api-response.dto";
import { KycVerificationDto, UpdateUserDto, VerifyBvnDto } from "./dto/user.dto";
import { formatAmount, formatDate } from "src/common/helper_functions/formatter";
import { first } from "rxjs";

function maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) return "";
    const visibleDigits = 3;
    const maskedLength = Math.max(0, accountNumber.length - visibleDigits);
    return '*'.repeat(maskedLength) + accountNumber.slice(-visibleDigits);
}

 @Injectable()
 export class UserService {
    constructor(
        private prisma: PrismaService,
    ) {}

    async fetchUserDashboard(userPayload: any) {

        console.log(colors.cyan("Fetching user dashboard..."))

        try {
            // find the user from the db using the supplied user email
            const existingUser = await this.prisma.user.findFirst({
                where: {email: userPayload.email},
                include: {
                    address: true,
                    profile_image: true,
                    wallet: true,
                    kyc_verification: true
                }
            })

            if(!existingUser) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("User not found")
            }

            // Find all the transaction hisotires pertaining to the user
            const recentTransactions = await this.prisma.transactionHistory.findMany({
                where: { user_id: existingUser.id },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                  sender_details: true,
                  icon: true
                }
              });

            // Get account balances grouped by currency
            const accounts = await this.prisma.account.findMany({
                where: { 
                    user_id: existingUser.id,
                    isActive: true
                 },
            });

            console.log(colors.magenta(`User dashboard successfully retrieved, Current balance: ${existingUser?.wallet?.current_balance}`))

            // Format the response
            return new ApiResponseDto(true, "Dashboard successfully retrieved", {
                user: {
                    id: existingUser.id,
                    name: `${existingUser.first_name} ${existingUser.last_name}`,
                    email: existingUser.email,
                    profileImage: existingUser.profile_image
                },
                wallet: {
                    id: existingUser.wallet?.id,
                    current_balance: existingUser?.wallet?.current_balance,
                    all_time_fuunding: existingUser?.wallet?.all_time_fuunding,
                    all_time_withdrawn: existingUser?.wallet?.all_time_withdrawn,
                    isActive: true,
                    createdAt: existingUser?.wallet?.createdAt,
                    updatedAt: existingUser?.wallet?.updatedAt,
                },
                kyc_verification: {
                    id: existingUser?.kyc_verification?.id || "",
                    is_verified: existingUser?.kyc_verification?.is_verified || false,
                    status: existingUser?.kyc_verification?.status || "",
                    id_type: existingUser?.kyc_verification?.id_type || "",
                    id_no: existingUser?.kyc_verification?.id_no || "",
                    bvn: existingUser?.kyc_verification?.bvn || "",
                    bvn_verified: existingUser?.kyc_verification?.bvn_verified || false,
                    watchlisted: existingUser?.kyc_verification?.watchlisted || false,
                    initiated_at: existingUser?.kyc_verification?.initiated_at || "",
                    approved_at: existingUser?.kyc_verification?.approved_at || "",
                    failure_reason: existingUser?.kyc_verification?.failure_reason || ""
                },
                transactionHistory: recentTransactions.map(tx => ({
                    id: tx.id,
                    amount: tx.amount,
                    type: tx.transaction_type,
                    description: tx.description,
                    status: tx.status,
                    date: tx.createdAt,
                    sender: tx.sender_details?.sender_name,
                    icon: tx.icon?.secure_url
                }))
            });

        } catch (error) {
            console.error(colors.red(`Dashboard fetch error: ${error.message}`));
            throw error; 
        }
    }

    async fetchUserWalletAndLatestTransaction(userPayload: any) {
        console.log(colors.cyan("Fetching user data for app homepage..."));
    
        try {
            // Fetch user wallet details
            const userWallet = await this.prisma.wallet.findUnique({
                where: { user_id: userPayload.sub },
            })

            if(!userWallet) {
                console.log(colors.red("User wallet not found"))
                
                await this.prisma.wallet.create({
                    data: {
                        user_id: userPayload.sub,
                        current_balance: 0,
                        all_time_fuunding: 0,
                        all_time_withdrawn: 0,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                })
                console.log(colors.green("User wallet created successfully"))
            }

            const latest_transaction_history = await this.prisma.transactionHistory.findMany({
                where: { user_id: userPayload.sub },
                orderBy: { createdAt: 'desc' },
                take: 2,
                include: {
                    sender_details: true,
                    icon: true
                }
            })

            // Fetch user first name and display image 
            const user = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
                include: {
                    profile_image: true,
                    kyc_verification: true,
                }
            })
            if(!user) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("User not found")
            }

            const accounts = await this.prisma.account.findMany({
                where: { user_id: userPayload.sub },
            })

            const createdCurrencies = new Set(accounts.map(account => account.currency));

            const formattedResponse = {
                user: {
                    id: userPayload.sub,
                    smipay_tag: user.smipay_tag || "",
                    name: `${user.first_name} ${user.last_name}`,
                    phone_number: user.phone_number || "",
                    first_name: user.first_name || "",
                    last_name: user.last_name || "",
                    email: userPayload.email || "",
                    profile_image: user.profile_image?.secure_url || "",
                    is_email_verified: user.is_email_verified || false
                },

                accounts: accounts.map(account => ({
                    id: account.id,
                    account_holder_name: account.account_name,
                    account_number: account.account_number ?? "",
                    bank_name: account.bank_name,
                    currency: account.currency,
                    balance: formatAmount(account.current_balance),
                    isActive: account.isActive,
                    createdAt: formatDate(account.createdAt),
                    updatedAt: formatDate(account.updatedAt)
                })),

                wallet_card: {
                    id: userWallet?.id,
                    current_balance: formatAmount(userWallet?.current_balance ?? 0),
                    all_time_fuunding: formatAmount(userWallet?.all_time_fuunding ?? 0),
                    all_time_withdrawn: formatAmount(userWallet?.all_time_withdrawn ?? 0),
                    owned_currencies: Array.from(createdCurrencies),
                    isActive: userWallet?.isActive,
                    createdAt: userWallet?.createdAt,
                    updatedAt: formatDate(userWallet?.updatedAt ?? new Date()),
                },
                transaction_history: latest_transaction_history.map(tx => ({
                    id: tx.id,
                    amount: tx.amount,
                    type: tx.transaction_type,
                    description: tx.description,
                    credit_debit: tx.credit_debit,
                    status: tx.status,
                    date: formatDate(tx.createdAt),
                    sender: tx.sender_details?.sender_name,
                    icon: tx.icon?.secure_url
                })),
                kyc_verification: {
                    id: user?.kyc_verification?.id || "",
                    is_verified: user?.kyc_verification?.is_verified || false,
                    status: user?.kyc_verification?.status || "",
                    id_type: user?.kyc_verification?.id_type || "",
                    id_no: user?.kyc_verification?.id_no || "",
                    bvn: user?.kyc_verification?.bvn || "",
                    bvn_verified: user?.kyc_verification?.bvn_verified || false,
                    watchlisted: user?.kyc_verification?.watchlisted || false,
                    initiated_at: user?.kyc_verification?.initiated_at || "",
                    approved_at: user?.kyc_verification?.approved_at || "",
                    failure_reason: user?.kyc_verification?.failure_reason || ""
                }
            }
            console.log(colors.magenta("User data for app homepage successfully retrieved"))
            return new ApiResponseDto(
                true, 
                "User data for app homepage successfully retrieved", 
                formattedResponse
            )
            
        } catch (error) {
            console.log(colors.red(`Error fetching user app details: ${error.message}`))
            throw new HttpException(
                error.response?.data?.message || "Error fetching user app details",
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
                { cause: new Error() }
            )
        }
    }

    // App Fetch for profile page
    async fetchUserProfileForApp(userPayload: any) {
        console.log(colors.cyan(`Fetching current user profile for app: ${userPayload.email}`))

        try {
            // fetch user from db
            const fullUserDetails = await this.prisma.user.findUnique({
                where: {email: userPayload.email},
                include: {
                    profile_image: true,
                    address: true,
                    kyc_verification: true,
                    cards: true,
                    wallet: true,
                    accounts: true
                }
            })

            console.log("Kyc verification details: ", fullUserDetails?.kyc_verification)

            console.log(colors.magenta(`User profile data retrieved successfully for: ${fullUserDetails?.email}`))

            // Format the response
            const formattedResponse = {
                user: {
                    id: userPayload.sub,
                    name: `${fullUserDetails?.first_name} ${fullUserDetails?.last_name}`,
                    first_name: fullUserDetails?.first_name,
                    last_name: fullUserDetails?.last_name,
                    email: fullUserDetails?.email,
                    is_verified: fullUserDetails?.is_email_verified,
                    phone_number: fullUserDetails?.phone_number || null,
                    profile_image: fullUserDetails?.profile_image?.secure_url || "",
                    gender: fullUserDetails?.gender || "",
                    date_of_birth: fullUserDetails?.date_of_birth || "",
                    // role: fullUserDetails?.role || "",
                    joined: fullUserDetails?.createdAt ? formatDate(fullUserDetails.createdAt) : "N/A",
                    totalCards: fullUserDetails?.cards?.length || 0,
                    totalAccounts: fullUserDetails?.accounts?.length || 0,
                    wallet_balance: fullUserDetails?.wallet?.current_balance || 0,
                },

                address: {
                    id: fullUserDetails?.address?.id,
                    house_no: fullUserDetails?.address?.house_number,
                    city: fullUserDetails?.address?.city,
                    state: fullUserDetails?.address?.state,
                    country: fullUserDetails?.address?.country,
                    house_address: fullUserDetails?.address?.home_address,
                    postal_code: fullUserDetails?.address?.postal_code
                },

                kyc_verification: {
                    id: fullUserDetails?.kyc_verification?.id || "",
                    is_active: fullUserDetails?.kyc_verification?.is_verified || "",
                    status: fullUserDetails?.kyc_verification?.status || "",
                    id_type: fullUserDetails?.kyc_verification?.id_type || "",
                    id_number: fullUserDetails?.kyc_verification?.id_no || "",
                },

                wallet_card: {
                    id: fullUserDetails?.wallet?.id,
                    current_balance: formatAmount(fullUserDetails?.wallet?.current_balance || 0),
                    all_time_fuunding: formatAmount(fullUserDetails?.wallet?.all_time_fuunding || 0),
                    all_time_withdrawn: formatAmount(fullUserDetails?.wallet?.all_time_withdrawn || 0),
                    isActive: fullUserDetails?.wallet?.isActive,
                    createdAt: fullUserDetails?.wallet?.createdAt,
                    updatedAt: formatDate(fullUserDetails?.wallet?.updatedAt ?? new Date()),
                }
            }

            return new ApiResponseDto(
                true,
                "User profile successfully fetched",
                formattedResponse
            )
            
        } catch (error) {
            console.log(colors.red(`Error fetching user details: ${error}`))
            throw new HttpException("Error fetching user details", HttpStatus.SERVICE_UNAVAILABLE, {cause: new Error()})   
        }
    }

    async fetchUserProfile(userPayload: any) {
        console.log(colors.cyan(`Fetching current user profile: ${userPayload.email}`))

        try {

            // fetch user from db
            const fullUserDetails = await this.prisma.user.findUnique({
                where: {email: userPayload.email},
                include: {
                    profile_image: true,
                    address: true,
                    kyc_verification: true
                }
            })

            console.log(colors.magenta(`User profile data retrieved successfully for: ${fullUserDetails?.email}`))

            const formattedUserProfile = {
                id: fullUserDetails?.id || "",
                first_name: fullUserDetails?.first_name || "",
                last_name: fullUserDetails?.last_name || "",
                email: fullUserDetails?.email || "",
                phone_number: fullUserDetails?.phone_number || "",
                gender: fullUserDetails?.phone_number || "",
                role: fullUserDetails?.role || "",
                date_of_birth: fullUserDetails?.date_of_birth || "",
                email_verification: fullUserDetails?.is_email_verified || false,
                joined: fullUserDetails?.createdAt ? formatDate(fullUserDetails.createdAt) : "N/A",
            }
            // console.log("Formatted user profile: ", formattedUserProfile)

            const address = {
                id: fullUserDetails?.address?.id,
                house_no: fullUserDetails?.address?.house_number,
                city: fullUserDetails?.address?.city,
                state: fullUserDetails?.address?.state,
                country: fullUserDetails?.address?.country,
                house_address: fullUserDetails?.address?.home_address,
                postal_code: fullUserDetails?.address?.postal_code
            }

            const user_kyc = {
                id: fullUserDetails?.kyc_verification?.id || "",
                user_id: fullUserDetails?.kyc_verification?.userId || "",
                is_active: fullUserDetails?.kyc_verification?.is_verified || "",
                status: fullUserDetails?.kyc_verification?.status || "",
                id_type: fullUserDetails?.kyc_verification?.id_type || "",
                id_number: fullUserDetails?.kyc_verification?.id_no || "",
            }

            return new ApiResponseDto(
                true,
                "User profile successfully fetched",
                {
                    profile_data: formattedUserProfile,
                    addres: address,
                    user_kyc_data: user_kyc
                }
            )
            
        } catch (error) {
            console.log(colors.red(`Error fetching user details: ${error}`))
            throw new HttpException("Error fetching user details", HttpStatus.SERVICE_UNAVAILABLE, {cause: new Error()})   
        }
    }

    async verifyBvn(dto: VerifyBvnDto) {
        console.log(colors.cyan("Verifying BVN..."))

        try {

            const verifyEndpoint = "https://api.flutterwave.com/v3/bvn/verifications";
            const verifyBvnReqBody = {
                bvn: dto.bvn,
                first_name: dto.first_name,
                last_name: dto.last_name,
                redirect_url: "http://localhost:3000/profile",
            };
    
            // Add logic to send the request to the verifyEndpoint here
    
        } catch (error) {
            console.error(colors.red(`BVN verification error: ${error.message}`));
            throw new HttpException(
                error.response?.data?.message || 'BVN verification failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async fetchUserKYC(userPayload: any) {
        console.log(colors.cyan("Fetching user KYC..."))

        try {
            // find the user from the db using the supplied user email
            const existingUser = await this.prisma.user.findFirst({
                where: {email: userPayload.email},
                include: {
                    address: true,
                    profile_image: true,
                    kyc_verification: true
                }
            })

            if(!existingUser) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("User not found")
            }

            console.log(colors.magenta("User KYC successfully retrieved"))

            return new ApiResponseDto(true, "KYC successfully retrieved", {
                id: existingUser.id,
                first_name: existingUser.first_name,
                last_name: existingUser.last_name,
                email: existingUser.email,
                phone_number: existingUser.phone_number,
                address: existingUser.address?.home_address,
                city: existingUser.address?.city,
                state: existingUser.address?.state,
                country: existingUser.address?.country,
                profile_image: existingUser.profile_image,
                kyc_verification: existingUser.kyc_verification
            });

        } catch (error) {
            console.error(colors.red(`KYC fetch error: ${error.message}`));
            throw error; 
        }
    }

    async updateUserProfile(dto: UpdateUserDto, userPayload: any) {
        console.log(colors.cyan("Updating user KYC..."))
    
        try {
            // get user from db
            const existingUser = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
                include: {
                    address: true,
                    profile_image: true
                }
            })
    
            if(!existingUser) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("User not found")
            }
    
            // Create an object with only the provided fields
            const userUpdateData: any = {};
            
            // Handle user fields
            if(dto.first_name) userUpdateData.first_name = dto.first_name;
            if(dto.last_name) userUpdateData.last_name = dto.last_name;
            if(dto.email) userUpdateData.email = dto.email;
            
            // Handle address fields if any were provided
            const addressFields = ['home_address', 'city', 'state', 'country', 'postal_code', 'house_number'];
            const hasAddressUpdates = addressFields.some(field => dto[field] !== undefined);
            
            if (hasAddressUpdates) {
                userUpdateData.address = {
                    update: {}
                };
                
                addressFields.forEach(field => {
                    if (dto[field] !== undefined) {
                        userUpdateData.address.update[field] = dto[field];
                    }
                });
            }
    
            // Only update if there's something to update
            if (Object.keys(userUpdateData).length === 0) {
                console.log(colors.yellow("No fields to update"));
                return new ApiResponseDto(
                    true, "No fields to update", 
                    { user: existingUser }
                );
            }
    
            // update the user 
            const updatedUser = await this.prisma.user.update({
                where: { id: existingUser.id },
                data: userUpdateData,
                include: {
                    address: true,
                    profile_image: true
                }
            });
    
            console.log(colors.magenta("User information successfully updated"))
            return new ApiResponseDto(
                true, "User information successfully updated", 
                {
                    id: updatedUser.id,
                    first_name: updatedUser.first_name,
                    last_name: updatedUser.last_name,
                    email: updatedUser.email,
                    phone_number: updatedUser.phone_number,
                    gender: updatedUser.gender,
                    date_of_birth: updatedUser.date_of_birth,
                    is_email_verified: updatedUser.is_email_verified,
                    createdAt: updatedUser.createdAt,
                    address: {
                         id: updatedUser.address?.id,
                         city: updatedUser.address?.city,
                         state: updatedUser.address?.state,
                         country: updatedUser.address?.country,
                         home_address: updatedUser.address?.home_address,
                         postal_code: updatedUser.address?.postal_code,
                         house_number: updatedUser.address?.house_number,
                    },
                    profile_image: {
                        secure_url: updatedUser.profile_image?.secure_url,
                        public_id: updatedUser.profile_image?.public_id,
                        }
                }
            );
        } catch (error) {
            console.error(colors.red(`User information update error: ${error.message}`));
            throw new HttpException(
                error.response?.data?.message || 'User information update failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            ); 
        }
    }

    async UpdateKyc(dto: KycVerificationDto, userPayload: any) {
        console.log(colors.cyan("Updating user KYC..."))
        try {
            // find the user from the db using the supplied user email

            
            const existingUser = await this.prisma.user.findFirst({
                where: {email: userPayload.email},
                include: {
                    address: true,
                    profile_image: true,
                    kyc_verification: true
                }
            })
            if(!existingUser) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("User not found")
            }
            // Check if the user has already been verified
            if(existingUser.kyc_verification?.is_verified) {
                console.log(colors.red("User already verified"))
                throw new HttpException("User already verified", HttpStatus.BAD_REQUEST);
            }
    
            // Create or update KYC verification record
            const updatedUser = await this.prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    kyc_verification: {
                        upsert: {
                            create: {
                                id_type: dto.id_type,
                                id_no: dto.id_no,
                                status: "approved",
                                is_verified: false
                            },
                            update: {
                                id_type: dto.id_type ,
                                id_no: dto.id_no,
                                status: "approved",
                                is_verified: true
                            }
                        }
                    }
                },
                include: {
                    kyc_verification: true
                }
            });
    
            console.log(colors.magenta("User KYC verification submitted successfully"))
            return new ApiResponseDto(
                true, 
                "KYC verification submitted successfully", 
                {
                    id: updatedUser.kyc_verification?.id,
                    user_id: updatedUser.id,
                    id_type: updatedUser.kyc_verification?.id_type,
                    id_no: updatedUser.kyc_verification?.id_no,
                    status: updatedUser.kyc_verification?.status,
                    is_verified: updatedUser.kyc_verification?.is_verified
                }
            );
        } catch (error) {
            console.error(colors.red(`KYC verification error: ${error.message}`));
            throw new HttpException(
                error.response?.data?.message || 'KYC verification failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async saveFourDigitPin(userPayload: any, pin: string) {
        console.log(colors.cyan("Saving four-digit PIN..."));

        try {

            // Update the user's record with the PIN
            const updatedUser = await this.prisma.user.update({
                where: { id: userPayload.sub },
                data: { fourDigitPin: pin },
            });

            console.log(colors.magenta("Four-digit PIN saved successfully."));
            return new ApiResponseDto(true, "Four-digit PIN saved successfully.", {
                userId: updatedUser.id,
            });
        } catch (error) {
            console.error(colors.red(`Error saving four-digit PIN: ${error.message}`));
            throw new HttpException(
                error.response?.data?.message || "Error saving four-digit PIN.",
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    
 }
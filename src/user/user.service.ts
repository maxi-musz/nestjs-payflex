import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import * as colors from "colors";
import { RequestEmailOTPDto } from "src/auth/dto";
import { ApiResponseDto } from "src/common/dto/api-response.dto";
import { formatAmount } from "src/common/helper_functions/formatter";
import { FlutterTransferResponse } from "src/common/interfaces/banking.interface";
import { CreateVirtualAccountDto } from "src/common/dto/banking.dto";

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
                    profile_image: true
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

            // get user wallet details
            const walletDetails = await this.prisma.wallet.findFirst({
                where: { user_id: existingUser.id },
            });

            if(!walletDetails) {
                await this.prisma.wallet.create({
                    data: {
                        user_id: existingUser.id,
                        current_balance: 0,
                        all_time_fuunding: 0,
                        all_time_withdrawn: 0,
                        isActive: true,
                    }
                });
            }

            console.log(colors.magenta("User dashboard successfully retrieved"))

            // Format the response
            return new ApiResponseDto(true, "Dashboard successfully retrieved", {
                user: {
                    id: existingUser.id,
                    name: `${existingUser.first_name} ${existingUser.last_name}`,
                    email: existingUser.email,
                    profileImage: existingUser.profile_image
                },
                wallet: {
                    id: walletDetails?.id,
                    current_balance: walletDetails?.current_balance,
                    all_time_fuunding: walletDetails?.all_time_fuunding,
                    all_time_withdrawn: walletDetails?.all_time_withdrawn,
                    isActive: true,
                    createdAt: walletDetails?.createdAt,
                    updatedAt: walletDetails?.updatedAt,
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

    async fetchUserKYC(userPayload: any) {
        console.log(colors.cyan("Fetching user KYC..."))

        try {
            // find the user from the db using the supplied user email
            const existingUser = await this.prisma.user.findFirst({
                where: {email: userPayload.email},
                include: {
                    address: true,
                    profile_image: true
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
                // zip_code: existingUser.address?.zip_code,
                profile_image: existingUser.profile_image
            });

        } catch (error) {
            console.error(colors.red(`KYC fetch error: ${error.message}`));
            throw error; 
        }
    }

    // async updateUserProfile(userPayload: any, dto: RequestEmailOTPDto) {
    //     console.log(colors.cyan("Updating user profile..."))

    //     try {
    //         // find the user from the db using the supplied user email
    //         const existingUser = await this.prisma.user.findFirst({
    //             where: {email: userPayload.email},
    //             include: {
    //                 address: true,
    //                 profile_image: true
    //             }
    //         })

    //         if(!existingUser) {
    //             console.log(colors.red("User not found"))
    //             throw new NotFoundException("User not found")
    //         }

    //         // Update user profile
    //         const updatedUser = await this.prisma.user.update({
    //             where: { id: existingUser.id },
    //             data: {
    //                 first_name: dto.first_name,
    //                 last_name: dto.last_name,
    //                 phone_number: dto.phone_number,
    //                 address: {
    //                     update: {
    //                         home_address: dto.home_address,
    //                         city: dto.city,
    //                         state: dto.state,
    //                         country: dto.country,
    //                     }
    //                 }
    //             },
    //             include: {
    //                 address: true,
    //                 profile_image: true
    //             }
    //         });

    //         console.log(colors.magenta("User profile successfully updated"))

    //         return new ApiResponseDto(true, "Profile successfully updated", {
    //             id: updatedUser.id,
    //             first_name: updatedUser.first_name,
    //             last_name: updatedUser.last_name,
    //             email: updatedUser.email,
    //             phone_number: updatedUser.phone_number,
    //             address: updatedUser.address?.home_address,
    //             city: updatedUser.address?.city,
    //             state: updatedUser.address?.state,
    //             country: updatedUser.address?.country,
    //             profile_image: updatedUser.profile_image
    //         });

    //     } catch (error) {
    //         console.error(colors.red(`Profile update error: ${error.message}`));
    //         throw error; 
    //     }
    // }

    async updateUserKYC(userPayload: any, dto: RequestEmailOTPDto) {
        console.log(colors.cyan("Updating user KYC..."))

        try {

            // get user from db
            
        } catch (error) {
            console.error(colors.red(`KYC update error: ${error.message}`));
            throw error; 
            
        }
    }

    // async createVirtualAccountNumber(userPayload: any, dto: CreateVirtualAccountDto): Promise<FlutterTransferResponse> {
    //     try {
    //       const user = await this.prisma.user.findUnique({
    //         where: { id: userPayload.id },
    //       });
      
    //       if (!user) {
    //         throw new HttpException('User profile not found', HttpStatus.NOT_FOUND);
    //       }
      
    //       // Enforce one account per currency
    //       const existingAccount = await this.prisma.account.findFirst({
    //         where: { 
    //             user_id: user.id,
    //             currency: dto.currency
    //         },
    //       });
      
    //       if (existingAccount) {
    //         throw new HttpException(`Account for ${dto.currency} already exists`, HttpStatus.BAD_REQUEST);
    //       }
      
    //       const tx_ref = `VA-${dto.currency}-${user.id}-${Date.now()}`;
      
    //       const payload: any = {
    //         email: user.email,
    //         is_permanent: true,
    //         tx_ref,
    //         // bvn: user.profile.bvn,
    //         currency: dto.currency,
    //         bvn: dto.bvn,
    //         phonenumber: user.profile.phoneNumber,
    //         firstname: user.profile.firstName,
    //         lastname: user.profile.lastName,
    //         narration: `${user.profile.firstName} ${user.profile.lastName}`,
    //       };
      
    //       // Optional: use different APIs or parameters per currency
    //       const url = `${this.flutterwaveBaseUrl}/virtual-account-numbers`;
      
    //       const response = await firstValueFrom(
    //         this.httpService.post(url, payload, {
    //           headers: {
    //             Authorization: `Bearer ${this.secretKey}`,
    //             'Content-Type': 'application/json',
    //           },
    //         }),
    //       );
      
    //       const result = response.data;
      
    //       if (result.status === 'success') {
    //         await this.prisma.virtualAccount.create({
    //           data: {
    //             userId,
    //             accountNumber: result.data.account_number,
    //             accountName: result.data.account_name,
    //             bankName: result.data.bank_name,
    //             currency,
    //             reference: tx_ref,
    //             metadata: result.data,
    //           },
    //         });
    //       } else {
    //         throw new HttpException(result.message || 'Failed to create virtual account', HttpStatus.BAD_REQUEST);
    //       }
      
    //       return result;
    //     } catch (error) {
    //       this.logger.error(`Virtual account creation failed: ${error.message}`, error.stack);
      
    //       if (error instanceof HttpException) throw error;
      
    //       if (error.response) {
    //         throw new HttpException(
    //           error.response.data?.message || 'Flutterwave API error',
    //           error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
    //         );
    //       }
      
    //       throw new HttpException('Virtual account service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    //     }
    // }      


 }
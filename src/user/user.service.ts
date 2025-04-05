import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import * as colors from "colors";
import { RequestEmailOTPDto } from "src/auth/dto";
import { ApiResponseDto } from "src/common/dto/api-response.dto";
import { formatAmount } from "src/common/helper_functions/formatter";

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
 }
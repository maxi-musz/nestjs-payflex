import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import * as colors from "colors";
import { RequestEmailOTPDto } from "src/auth/dto";

 @Injectable()
 export class UserService {
    constructor(
        private prisma: PrismaService,
    ) {}

    async fetchUserDashboard(dto: RequestEmailOTPDto) {

        console.log(colors.cyan("Fetching user dashboard..."))

        try {
            // find the user from the db using the supplied user email
            const existingUser = await this.prisma.user.findFirst({
                where: {email: dto.email},
                include: {
                    address: true,
                    profile_image: true
                }
            })

            if(!existingUser) {
                console.log(colors.red("User not found"))
                throw new NotFoundException("")
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

            console.log(colors.magenta("User dashboard successfully retrieved"))

            // Format the response
            return {
                user: {
                id: existingUser.id,
                name: existingUser.first_name + " " + existingUser.last_name,
                email: existingUser.email,
                profileImage: existingUser.profile_image
                },
                accounts: accounts.map(account =>({
                    id: account.id,
                    account_number: account.account_number,
                    account_type: account.accountType,
                    bank_name: account.bank_name,
                    bank_code: account.bank_code
                })),
                recentTransactions: recentTransactions.map(tx => ({
                id: tx.id,
                amount: tx.amount,
                type: tx.transaction_type,
                description: tx.description,
                status: tx.status,
                date: tx.createdAt,
                sender: tx.sender_details?.sender_name,
                icon: tx.icon?.secure_url
                }))
            };

        } catch (error) {
            console.error(colors.red(`Dashboard fetch error: ${error.message}`));
            throw error; 
        }
    }
 }
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as colors from 'colors'
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { formatAmount, formatDate } from 'src/common/helper_functions/formatter';

@Injectable()
export class TransactionHistoryService {
    constructor(
        private prisma: PrismaService
    ) {}

    async fetchTransactionHistory(userPayload: any, page: number = 1, limit: number = 10) {
        console.log(colors.cyan("Fetching user all transaction history"))

        const skip = (page - 1) * limit;

        try {
            const transactions =  await this.prisma.transactionHistory.findMany({
              where: { user_id: userPayload.user_id },
              take: limit,
              skip: skip,
              orderBy: {
                createdAt: 'desc', 
              },
              include: {
                sender_details: true, 
                icon: true
              },
            });

            console.log(colors.magenta("Transactions successsfully retrieved"))

            // Map through the transactions to format the response
            const formattedResponse = transactions.map(transaction => ({
                id: transaction.id,
                amount: formatAmount(transaction.amount ?? 0),
                type: transaction.transaction_type,
                credit_debit: transaction.credit_debit,
                transaction_type: transaction.transaction_type, 
                description: transaction.description,
                status: transaction.status,
                date: formatDate(transaction.createdAt),
                sender: transaction.sender_details?.sender_name,
                // icon: transaction.icon?.secure_url,
            }));

            console.log(colors.magenta("Transaction history retrieved"))

            return new ApiResponseDto(true, "Transactions successsfully retrieved", {
                pagination: {
                    currentPage: page,
                    totalItems: await this.prisma.transactionHistory.count({
                        where: { user_id: userPayload.user_id }
                    }),
                    totalPages: Math.ceil((await this.prisma.transactionHistory.count({
                        where: { user_id: userPayload.user_id }
                    })) / limit),
                },
                transactions: formattedResponse,
            })

        } catch (error) {
            throw new Error('Error fetching transaction history: ' + error.message);
        }
    }

    // Fetch a single transaction
    // Get @/api/v1/history/fetch-single-transaction
    // protected
    async fetchTransactionById(transactionId: string, userId: string) {
        console.log(`Fetching transaction with ID: ${transactionId}`);

        const transaction = await this.prisma.transactionHistory.findFirst({
            where: {
                id: transactionId,
                user_id: userId,
            },
            include: {
                sender_details: true,
                icon: true
            }
        });

        if (!transaction) {
            console.log(`Transaction not found`);
            throw new NotFoundException('Transaction not found');
        }

        console.log(`Transaction successfully retrieved`);

        const formattedResponse = {
            id: transaction.id,
            amount: formatAmount(transaction.amount || 0),
            type: transaction.transaction_type,
            description: transaction.description,
            status: transaction.status,
            date: formatDate(transaction.createdAt),
            sender: transaction.sender_details?.sender_name,
            icon: transaction.icon?.secure_url
        }

        console.log(colors.magenta("Single transaction retrieved"))
        return new ApiResponseDto(true, "Single transaction retrieved", formattedResponse)
    }
}

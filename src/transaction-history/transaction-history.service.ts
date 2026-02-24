import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { formatAmount, formatDate } from 'src/common/helper_functions/formatter';
import * as colors from 'colors';

interface TransactionFilters {
    type?: string;
    status?: string;
    creditDebit?: string;
    search?: string;
}

@Injectable()
export class TransactionHistoryService {
    private readonly logger = new Logger(TransactionHistoryService.name);

    constructor(
        private prisma: PrismaService
    ) {}

    async fetchTransactionHistory(
        userPayload: any,
        page: number = 1,
        limit: number = 10,
        filters: TransactionFilters = {},
    ) {
        const userId = userPayload.sub;
        const skip = (page - 1) * limit;

        try {
            const where: Prisma.TransactionHistoryWhereInput = { user_id: userId };

            if (filters.type) {
                where.transaction_type = filters.type as any;
            }
            if (filters.status) {
                where.status = filters.status as any;
            }
            if (filters.creditDebit) {
                where.credit_debit = filters.creditDebit as any;
            }
            if (filters.search) {
                const term = filters.search.trim();
                where.OR = [
                    { description: { contains: term, mode: 'insensitive' } },
                    { transaction_reference: { contains: term, mode: 'insensitive' } },
                    { recipient_mobile: { contains: term } },
                ];
            }

            // Run filtered query + count + category counts in parallel
            const [transactions, totalItems, categoryCounts] = await Promise.all([
                this.prisma.transactionHistory.findMany({
                    where,
                    take: limit,
                    skip,
                    orderBy: { createdAt: 'desc' },
                    include: { sender_details: true, icon: true },
                }),
                this.prisma.transactionHistory.count({ where }),
                this.prisma.transactionHistory.groupBy({
                    by: ['transaction_type'],
                    where: { user_id: userId },
                    _count: true,
                }),
            ]);

            const formattedResponse = transactions.map(transaction => ({
                id: transaction.id,
                amount: formatAmount(transaction.amount ?? 0),
                raw_amount: transaction.amount ?? 0,
                type: transaction.transaction_type,
                credit_debit: transaction.credit_debit,
                transaction_type: transaction.transaction_type,
                description: transaction.description,
                status: transaction.status,
                date: formatDate(transaction.createdAt),
                reference: transaction.transaction_reference,
                sender: transaction.sender_details?.sender_name,
                icon: transaction.icon?.secure_url,
                payment_channel: transaction.payment_channel,
                payment_method: transaction.payment_method,
            }));

            // Build categories object: { all: 25, deposit: 10, airtime: 8, ... }
            const categories: Record<string, number> = {
                all: categoryCounts.reduce((sum, c) => sum + c._count, 0),
            };
            for (const group of categoryCounts) {
                if (group.transaction_type) {
                    categories[group.transaction_type] = group._count;
                }
            }

            return new ApiResponseDto(true, "Transactions successfully retrieved", {
                categories,
                pagination: {
                    currentPage: page,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    activeFilter: filters.type || 'all',
                },
                transactions: formattedResponse,
            });
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
            provider: transaction.provider,
            status: transaction.status,
            recipient_mobile: transaction.recipient_mobile,
            tx_reference: transaction.transaction_reference,
            created_on: formatDate(transaction.createdAt),
            updated_on: formatDate(transaction.updatedAt),
            // date: formatDate(transaction.createdAt),
            sender: transaction.sender_details?.sender_name,
            icon: transaction.icon?.secure_url || "",
        }

        this.logger.log(colors.magenta("Single transaction retrieved"))
        return new ApiResponseDto(true, "Single transaction retrieved", formattedResponse)
    }
}

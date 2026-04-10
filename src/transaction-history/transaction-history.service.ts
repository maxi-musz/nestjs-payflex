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
                provider: transaction.provider ?? null,
                data_plan_name: (transaction as any).data_plan_name ?? null,
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
        this.logger.log(`Fetching transaction: ${transactionId}`);

        const transaction = await this.prisma.transactionHistory.findFirst({
            where: {
                id: transactionId,
                user_id: userId,
            },
            include: {
                sender_details: true,
                icon: true,
            },
        });

        if (!transaction) {
            this.logger.error(`Transaction not found: ${transactionId}`);
            throw new NotFoundException('Transaction not found');
        }

        const meta = (transaction.meta_data as Record<string, any>) || {};

        // Ensure electricity_token in meta stays in sync with dedicated column (if present)
        if (transaction.transaction_type === 'electricity') {
            const columnToken = (transaction as any).electricity_token;
            if (typeof columnToken === 'string' && columnToken && !meta.electricity_token) {
                meta.electricity_token = columnToken;
            }
        }

        const formattedResponse: Record<string, any> = {
            id: transaction.id,
            amount: formatAmount(transaction.amount || 0),
            raw_amount: transaction.amount ?? 0,
            type: transaction.transaction_type,
            credit_debit: transaction.credit_debit,
            description: transaction.description,
            provider: transaction.provider,
            data_plan_name: (transaction as any).data_plan_name ?? null,
            status: transaction.status,
            recipient_mobile: transaction.recipient_mobile,
            tx_reference: transaction.transaction_reference,
            transaction_number: transaction.transaction_number,
            payment_method: transaction.payment_method,
            payment_channel: transaction.payment_channel,
            commission: transaction.commission ?? 0,
            balance_before: transaction.balance_before,
            balance_after: transaction.balance_after,
            created_on: formatDate(transaction.createdAt),
            updated_on: formatDate(transaction.updatedAt),
            sender: transaction.sender_details?.sender_name ?? null,
            icon: transaction.icon?.secure_url || '',

            vtpass_amount: transaction.vtpass_amount ?? null,
            smipay_amount: transaction.smipay_amount ?? null,
            markup_percent: transaction.markup_percent ?? null,
            markup_value: transaction.markup_value ?? null,

            cashback_balance_before: transaction.cashback_balance_before ?? null,
            cashback_used: transaction.cashback_used ?? null,
            cashback_balance_after: transaction.cashback_balance_after ?? null,
            cashback_earned: transaction.cashback_earned ?? null,

            meta: this.buildTypeMeta(transaction.transaction_type, meta),
        };

        this.logger.log(colors.magenta('Single transaction retrieved'));
        return new ApiResponseDto(true, 'Single transaction retrieved', formattedResponse);
    }

    /**
     * Extracts type-specific fields from meta_data so the frontend can
     * render the right detail view without parsing raw meta_data itself.
     */
    private buildTypeMeta(
        type: string | null | undefined,
        meta: Record<string, any>,
    ): Record<string, any> {
        const vtpass = meta.vtpass_response || {};
        const content = vtpass.content || {};
        const transactions = content.transactions || {};

        const base: Record<string, any> = {};

        switch (type) {
            case 'electricity': {
                base.electricity_token = meta.electricity_token || null;

                base.units =
                    vtpass.units ||
                    vtpass.Units ||
                    transactions.units ||
                    content.units ||
                    null;

                // Meter number: orchestrator spreads vtpassPayload at top level of meta (meta.billersCode),
                // VTpass also stores it as content.transactions.unique_element
                base.meter_number =
                    meta.billersCode ||
                    meta.payload?.billersCode ||
                    transactions.unique_element ||
                    vtpass.meterNumber ||
                    vtpass.MeterNumber ||
                    null;

                // Meter type: same — variation_code is at meta top level
                base.meter_type =
                    meta.variation_code ||
                    meta.payload?.variation_code ||
                    null;

                const clean = (v: any) =>
                    typeof v === 'string' && v.trim().toUpperCase() === 'N/A'
                        ? null
                        : v;

                // Customer name: VTpass may put it at vtpass_response top level or inside content
                const rawName =
                    vtpass.customerName ||
                    vtpass.CustomerName ||
                    content.Customer_Name ||
                    meta.customer_name ||
                    meta.verification_data?.Customer_Name ||
                    null;
                const rawAddress =
                    vtpass.customerAddress ||
                    vtpass.CustomerAddress ||
                    content.Address ||
                    meta.customer_address ||
                    meta.verification_data?.Address ||
                    null;

                base.customer_name = clean(rawName);
                base.customer_address = clean(rawAddress);

                base.disco = transactions.product_name || null;
                break;
            }
            case 'cable': {
                base.smartcard_number = meta.payload?.billersCode || null;
                base.subscription_type = meta.payload?.subscription_type || null;
                base.bouquet = transactions.product_name || meta.payload?.variation_code || null;
                base.customer_name = vtpass.customerName || content.Customer_Name || null;
                break;
            }
            case 'data': {
                base.phone = meta.payload?.phone || null;
                base.network = meta.payload?.serviceID || null;
                base.plan = transactions.product_name || meta.payload?.variation_code || null;
                break;
            }
            case 'airtime': {
                base.phone = meta.payload?.phone || null;
                base.network = meta.payload?.serviceID || null;
                break;
            }
            case 'education': {
                const creds = meta.credentials || {};
                base.service_id = meta.serviceID || meta.payload?.serviceID || null;
                base.variation_code = meta.payload?.variation_code || null;
                base.product_name = transactions.product_name || null;
                base.phone = meta.payload?.phone || null;
                base.quantity = meta.payload?.quantity || 1;
                base.profile_id = meta.payload?.billersCode || null;
                base.pin = creds.pin || null;
                base.serial = creds.serial || null;
                base.tokens = creds.tokens || null;
                base.cards = creds.cards || null;
                base.purchased_code = creds.purchased_code || vtpass.purchased_code || null;
                break;
            }
            default:
                break;
        }

        return base;
    }
}

import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { TransactionHistoryService } from './transaction-history.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('history')
export class TransactionHistoryController {
    constructor(private transactionHistoryService: TransactionHistoryService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('fetch-all-history')
    fetchTransactionHistory(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
        return this.transactionHistoryService.fetchTransactionHistory(req.user, page, limit)
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    fetchTransactionById(@Param('id') transactionId: string, @Request() req) {
        return this.transactionHistoryService.fetchTransactionById(transactionId, req.user.user_id);
    }
}

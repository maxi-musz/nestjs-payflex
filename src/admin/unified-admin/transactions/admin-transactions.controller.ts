import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { AdminTransactionsService } from './admin-transactions.service';
import {
  QueryTransactionsDto,
  TransactionStatsQueryDto,
} from './dto/query-transactions.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/transactions')
export class AdminTransactionsController {
  constructor(private readonly txService: AdminTransactionsService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /** GET /unified-admin/transactions/timeline — Hourly/daily chart data */
  @Get('timeline')
  getTransactionTimeline(@Query() query: TransactionStatsQueryDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.txService.getTransactionTimeline(query);
  }

  /** GET /unified-admin/transactions/user/:userId — Transactions for a specific user */
  @Get('user/:userId')
  getUserTransactions(
    @Param('userId') userId: string,
    @Query() query: QueryTransactionsDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.txService.getUserTransactions(userId, query);
  }

  /** GET /unified-admin/transactions — List all transactions (paginated + filtered) */
  @Get()
  listTransactions(@Query() query: QueryTransactionsDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.txService.listTransactions(query);
  }

  /** GET /unified-admin/transactions/:id — Single transaction detail */
  @Get(':id')
  getTransactionById(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.txService.getTransactionById(id);
  }

  /** POST /unified-admin/transactions/:id/flag — Flag transaction for review */
  @Post(':id/flag')
  flagTransaction(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.txService.flagTransaction(id, reason, req.user, req);
  }
}

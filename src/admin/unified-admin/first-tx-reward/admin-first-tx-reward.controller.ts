import {
  Controller,
  Get,
  Put,
  Query,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AdminFirstTxRewardService } from './admin-first-tx-reward.service';
import { UpdateFirstTxRewardConfigDto } from './dto/first-tx-reward.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/first-tx-reward')
export class AdminFirstTxRewardController {
  constructor(private readonly service: AdminFirstTxRewardService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) throw new ForbiddenException('Admin access required');
  }

  // ─── Config ────────────────────────────────────────────────

  @Get('config')
  async getConfig(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.service.getConfig();
  }

  @Put('config')
  async updateConfig(@Body() dto: UpdateFirstTxRewardConfigDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.service.updateConfig(req.user.sub, dto, req);
  }

  // ─── Analytics ─────────────────────────────────────────────

  @Get('analytics')
  async getAnalytics(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.service.getAnalytics();
  }

  // ─── History ───────────────────────────────────────────────

  @Get('history')
  async getHistory(
    @Query('user_id') userId?: string,
    @Query('source_transaction_type') sourceTxType?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Req() req?: any,
  ) {
    this.assertAdmin(req.user);
    return this.service.getHistory({
      user_id: userId,
      source_transaction_type: sourceTxType,
      date_from: dateFrom,
      date_to: dateTo,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}

import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role, CashbackServiceType } from '@prisma/client';
import { AdminCashbackService } from './admin-cashback.service';
import {
  UpdateCashbackConfigDto,
  CreateCashbackRuleDto,
  UpdateCashbackRuleDto,
} from './dto/cashback.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/cashback')
export class AdminCashbackController {
  constructor(private readonly cashbackService: AdminCashbackService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) throw new ForbiddenException('Admin access required');
  }

  // ─── Config ────────────────────────────────────────────────

  @Get('config')
  async getConfig(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.cashbackService.getConfig();
  }

  @Put('config')
  async updateConfig(@Body() dto: UpdateCashbackConfigDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.cashbackService.updateConfig(req.user.sub, dto, req);
  }

  // ─── Rules ─────────────────────────────────────────────────

  @Get('rules')
  async listRules(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.cashbackService.listRules();
  }

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(@Body() dto: CreateCashbackRuleDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.cashbackService.createRule(req.user.sub, dto, req);
  }

  // seed all missing rules in one go so admin doesn't have to create them one by one
  @Post('rules/seed')
  @HttpCode(HttpStatus.OK)
  async seedDefaultRules(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.cashbackService.seedDefaultRules(req.user.sub, req);
  }

  @Put('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateCashbackRuleDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.cashbackService.updateRule(id, req.user.sub, dto, req);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRule(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.cashbackService.deleteRule(id, req.user.sub, req);
  }

  // ─── Analytics + History ───────────────────────────────────

  @Get('analytics')
  async getAnalytics(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.cashbackService.getAnalytics();
  }

  @Get('history')
  async getCashbackHistory(
    @Query('user_id') userId?: string,
    @Query('service_type') serviceType?: CashbackServiceType,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Req() req?: any,
  ) {
    this.assertAdmin(req.user);
    return this.cashbackService.getCashbackHistory({
      user_id: userId,
      service_type: serviceType,
      date_from: dateFrom,
      date_to: dateTo,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}

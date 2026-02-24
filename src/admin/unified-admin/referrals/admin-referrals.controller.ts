import {
  Controller,
  Get,
  Put,
  Post,
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
import { Role, ReferralStatus } from '@prisma/client';
import { ReferralService } from '../../../referral/referral.service';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/referrals')
export class AdminReferralsController {
  constructor(private readonly referralService: ReferralService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) throw new ForbiddenException('Admin access required');
  }

  @Get()
  async listReferrals(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ReferralStatus,
    @Query('referrer_id') referrerId?: string,
    @Query('search') search?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Req() req?: any,
  ) {
    this.assertAdmin(req.user);
    return this.referralService.adminListReferrals({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      referrer_id: referrerId,
      search,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  @Get('top-referrers')
  async topReferrers(@Query('limit') limit?: number, @Req() req?: any) {
    this.assertAdmin(req.user);
    return this.referralService.adminTopReferrers(limit ? Number(limit) : 20);
  }

  @Get('config')
  async getConfig(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.referralService.adminUpdateConfig(req.user.sub, {});
  }

  @Put('config')
  async updateConfig(@Body() body: any, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.referralService.adminUpdateConfig(req.user.sub, body, req);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveReward(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.referralService.adminManualReward(id, req.user.sub, req);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectReferral(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.referralService.adminRejectReferral(id, body.reason, req.user.sub, req);
  }
}

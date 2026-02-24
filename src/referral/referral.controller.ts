import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReferralService } from './referral.service';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('validate')
  async validateCode(@Query('code') code: string) {
    return this.referralService.validateReferralCode(code);
  }

  @Get('my-referrals')
  @UseGuards(AuthGuard('jwt'))
  async getMyReferrals(@Req() req: any) {
    return this.referralService.getMyReferralInfo(req.user.sub);
  }
}

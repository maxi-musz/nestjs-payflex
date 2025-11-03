import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AirtimeService } from './airtime.service';
import { PurchaseAirtimeDto } from './dto/purchase-airtime.dto';
import { AirtimeLimitsGuard } from './guards/airtime.limits.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Controller('vtpass/airtime')
export class AirtimeController {
  constructor(private readonly airtimeService: AirtimeService) {}

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('service-ids')
  getAirtimeProviderServiceIds() {
    return this.airtimeService.getAirtimeProviderServiceIds();
  }

  @UseGuards(AuthGuard('jwt'), AirtimeLimitsGuard, RateLimitGuard)
  @Post('purchase')
  purchase(@Body() dto: PurchaseAirtimeDto, @Request() req) {
    return this.airtimeService.purchaseAirtime(req.user, dto);
  }
}


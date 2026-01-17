import { BadRequestException, Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CableService } from './cable.service';
import { VerifySmartcardDto } from './dto/verify-smartcard.dto';
import { PurchaseCableDto } from './dto/purchase-cable.dto';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { CableLimitsGuard } from './guards/cable.limits.guard';

@Controller('vtpass/cable')
export class CableController {
  constructor(private cableService: CableService) {}

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('service-ids')
  getCableProviderServiceIds() {
    return this.cableService.getCableProviderServiceIds();
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('variation-codes')
  getVariationCodes(@Query('serviceID') serviceID: string) {
    if (!serviceID) throw new BadRequestException('serviceID query parameter is required');
    return this.cableService.getVariationCodes(serviceID);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Post('verify')
  verifySmartcard(@Body() dto: VerifySmartcardDto) {
    return this.cableService.verifySmartcard(dto);
  }

  @UseGuards(AuthGuard('jwt'), CableLimitsGuard, RateLimitGuard)
  @Post('purchase')
  purchase(@Body() dto: PurchaseCableDto, @Request() req) {
    return this.cableService.purchase(req.user, dto);
  }
}


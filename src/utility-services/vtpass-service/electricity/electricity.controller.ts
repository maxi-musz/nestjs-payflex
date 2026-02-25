import { BadRequestException, Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ElectricityService } from './electricity.service';
import { VerifyMeterDto } from './dto/verify-meter.dto';
import { PurchaseElectricityDto } from './dto/purchase-electricity.dto';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { ElectricityLimitsGuard } from './guards/electricity.limits.guard';

@Controller('vtpass/electricity')
export class ElectricityController {
  constructor(private readonly electricityService: ElectricityService) {}

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('service-ids')
  getElectricityProviderServiceIds() {
    return this.electricityService.getElectricityProviderServiceIds();
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Post('verify')
  verifyMeter(@Body() dto: VerifyMeterDto) {
    return this.electricityService.verifyMeter(dto);
  }

  @UseGuards(AuthGuard('jwt'), ElectricityLimitsGuard, RateLimitGuard)
  @Post('purchase')
  purchase(@Body() dto: PurchaseElectricityDto, @Request() req) {
    return this.electricityService.purchase(req.user, dto);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Post('query')
  queryTransaction(@Body('request_id') requestId: string, @Request() req) {
    if (!requestId) throw new BadRequestException('request_id is required');
    return this.electricityService.queryTransaction(req.user, requestId);
  }
}

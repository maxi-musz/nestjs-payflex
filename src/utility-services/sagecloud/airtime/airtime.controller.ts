import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SagecloudAirtimeService } from './airtime.service';
import { PurchaseAirtimeDto } from './dto/purchase-airtime.dto';
import { SecurityHeadersGuard } from 'src/common/guards/security-headers.guard';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';

@Controller('sagecloud/airtime')
@UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
export class SagecloudAirtimeController {
  constructor(private readonly airtimeService: SagecloudAirtimeService) {}

  @Post('purchase')
  async purchaseAirtime(@Body() dto: PurchaseAirtimeDto, @Request() req: any) {
    return this.airtimeService.purchaseAirtime(dto, req.user);
  }
}


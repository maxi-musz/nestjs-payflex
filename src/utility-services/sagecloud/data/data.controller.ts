import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SagecloudDataService } from './data.service';
import { PurchaseDataDto } from './dto/purchase-data.dto';
import { SecurityHeadersGuard } from 'src/common/guards/security-headers.guard';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';

@Controller('sagecloud/data')
@UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
export class SagecloudDataController {
  constructor(private readonly dataService: SagecloudDataService) {}

  @Post('purchase')
  async purchaseData(@Body() dto: PurchaseDataDto, @Request() req: any) {
    return this.dataService.purchaseData(dto, req.user);
  }
}


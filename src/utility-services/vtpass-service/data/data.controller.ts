import { BadRequestException, Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataService } from './data.service';
import { PurchaseDataDto } from './dto/purchase-data.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { DataLimitsGuard } from './guards/data.limits.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';

@Controller('vtpass/data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('variation-codes')
  getVariationCodes(@Query('serviceID') serviceID: string, @Request() req) {
    if (!serviceID) {
      throw new BadRequestException('serviceID query parameter is required');
    }
    return this.dataService.getVariationCodes(serviceID, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('service-ids')
  getServiceIds(@Query('identifier') identifier: string = 'data') {
    return this.dataService.getProviderServiceIds(identifier || 'data');
  }

  @UseGuards(AuthGuard('jwt'), DataLimitsGuard, RateLimitGuard)
  @Post('purchase')
  purchase(@Body() dto: PurchaseDataDto, @Request() req) {
    return this.dataService.purchaseDataFromVtPass(req.user, dto);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Post('query')
  queryTransaction(@Body() dto: QueryTransactionDto, @Request() req) {
    return this.dataService.queryTransactionFromVtPass(req.user, dto);
  }
}

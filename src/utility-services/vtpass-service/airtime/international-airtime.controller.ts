import { BadRequestException, Controller, Get, Post, Query, Body, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InternationalAirtimeService } from './international-airtime.service';
import { PurchaseInternationalAirtimeDto } from './dto/purchase-international-airtime.dto';
import { RateLimitGuard } from '../guards/rate-limit.guard';

@Controller('vtpass/airtime/international')
export class InternationalAirtimeController {
  constructor(private readonly intlService: InternationalAirtimeService) {}

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('countries')
  getCountries() {
    return this.intlService.getCountries();
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('product-types')
  getProductTypes(@Query('code') code: string) {
    if (!code) throw new BadRequestException('code (country_code) is required');
    return this.intlService.getProductTypes(code);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('operators')
  getOperators(@Query('code') code: string, @Query('product_type_id') productTypeId: string) {
    if (!code) throw new BadRequestException('code (country_code) is required');
    if (!productTypeId) throw new BadRequestException('product_type_id is required');
    return this.intlService.getOperators(code, productTypeId);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('variations')
  getVariations(@Query('operator_id') operatorId: string, @Query('product_type_id') productTypeId: string) {
    if (!operatorId) throw new BadRequestException('operator_id is required');
    if (!productTypeId) throw new BadRequestException('product_type_id is required');
    return this.intlService.getVariations(operatorId, productTypeId);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Post('purchase')
  purchase(@Body() dto: PurchaseInternationalAirtimeDto, @Request() req) {
    if (!dto.serviceID) {
      dto.serviceID = 'foreign-airtime';
    }
    return this.intlService.purchase(req.user, dto);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Post('query')
  queryTransaction(@Body('request_id') requestId: string, @Request() req) {
    if (!requestId) throw new BadRequestException('request_id is required');
    return this.intlService.queryTransaction(req.user, requestId);
  }
}


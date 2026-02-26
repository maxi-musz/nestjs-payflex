import { BadRequestException, Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EducationService } from './education.service';
import { VerifyJambProfileDto } from './dto/verify-jamb-profile.dto';
import { PurchaseEducationDto } from './dto/purchase-education.dto';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { EducationLimitsGuard } from './guards/education.limits.guard';

@Controller('vtpass/education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Get('variations')
  getVariationCodes(@Query('serviceID') serviceID: string) {
    if (!serviceID) throw new BadRequestException('serviceID query parameter is required');
    return this.educationService.getVariationCodes(serviceID);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Post('verify-jamb')
  verifyJambProfile(@Body() dto: VerifyJambProfileDto) {
    return this.educationService.verifyJambProfile(dto);
  }

  @UseGuards(AuthGuard('jwt'), EducationLimitsGuard, RateLimitGuard)
  @Post('purchase')
  purchase(@Body() dto: PurchaseEducationDto, @Request() req) {
    return this.educationService.purchase(req.user, dto);
  }

  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @Post('query')
  queryTransaction(@Body('request_id') requestId: string, @Request() req) {
    if (!requestId) throw new BadRequestException('request_id is required');
    return this.educationService.queryTransaction(req.user, requestId);
  }
}

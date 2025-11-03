import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { SmipayService } from './smipay.service';
import { AuthGuard } from '@nestjs/passport';
import { FindUserByTagDto, SendMoneyByTagDto } from './dto/smipay-transfer.dto';

@Controller('banking/smipay')
export class SmipayController {
  constructor(private readonly smipayService: SmipayService) {}

  /**
   * Find a user by their Smipay tag
   * Returns user information without sensitive data
   * 
   * @example GET /banking/smipay/find-user?smipay_tag=smileABC12
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('find-user')
  findUserByTag(@Query('smipay_tag') smipayTag: string, @Request() req) {
    const dto: FindUserByTagDto = { smipay_tag: smipayTag };
    return this.smipayService.findUserBySmipayTag(dto, req.user);
  }

  /**
   * Send money to a user using their Smipay tag
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('send-money')
  sendMoneyByTag(@Body() dto: SendMoneyByTagDto, @Request() req) {
    return this.smipayService.sendMoneyByTag(dto, req.user);
  }
}


import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { NewAuthService } from './new-auth.service';
import {
  RegisterDto,
  SignInDto,
  RequestPasswordResetDto,
  VerifyPasswordResetOtpDto,
  ResetPasswordDto,
} from './dto';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Controller('new-auth')
export class NewAuthController {
  constructor(private readonly newAuthService: NewAuthService) {}

  @Post('register')
  @UseGuards(RateLimitGuard)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ) {
    return this.newAuthService.register(dto, req);
  }

  @Post('verify-email-otp')
  @UseGuards(RateLimitGuard)
  verifyEmailOtp(
    @Body() dto: VerifyPasswordResetOtpDto,
    @Req() req: Request,
  ) {
    return this.newAuthService.verifyEmailOtp(dto, req);
  }

  @Post('signin')
  @UseGuards(RateLimitGuard)
  async signin(
    @Body() dto: SignInDto,
    @Req() req: Request,
  ) {
    return this.newAuthService.signin(dto, req);
  }

  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: Request,
  ) {
    return this.newAuthService.requestPasswordResetOtp(dto, req);
  }

  @Post('verify-password-reset-otp')
  @UseGuards(RateLimitGuard)
  verifyPasswordResetOtp(
    @Body() dto: VerifyPasswordResetOtpDto,
    @Req() req: Request,
  ) {
    return this.newAuthService.verifyPasswordResetOtp(dto, req);
  }

  @Post('reset-password')
  @UseGuards(RateLimitGuard)
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    return this.newAuthService.resetPassword(dto, req);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  logout(@Req() req: Request) {
    return this.newAuthService.logout(req);
  }
}

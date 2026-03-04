import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { NewAuthService } from './new-auth.service';
import {
  RegisterDto,
  SignInDto,
  RequestEmailVerificationDto,
  RequestPasswordResetDto,
  VerifyPasswordResetOtpDto,
  ResetPasswordDto,
  CreateTransactionPinDto,
  UpdateTransactionPinDto,
  RefreshTokenDto,
} from './dto';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';

@Controller('new-auth')
export class NewAuthController {
  constructor(private readonly newAuthService: NewAuthService) {}

  @Post('request-email-verification')
  @UseGuards(RateLimitGuard)
  async requestEmailVerification(
    @Body() dto: RequestEmailVerificationDto,
    @Req() req: Request,
  ) {
    return this.newAuthService.requestEmailVerification(dto, req);
  }

  @Post('verify-email-for-registration')
  @UseGuards(RateLimitGuard)
  verifyEmailForRegistration(
    @Body() dto: VerifyPasswordResetOtpDto,
    @Req() req: Request,
  ) {
    return this.newAuthService.verifyEmailForRegistration(dto, req);
  }

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

  @Post('refresh')
  @UseGuards(RateLimitGuard)
  refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    return this.newAuthService.refreshTokens(dto, req);
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

  @Post('complete-onboarding')
  @UseGuards(AuthGuard('jwt'))
  completeOnboarding(@Req() req: any) {
    return this.newAuthService.completeOnboarding(req.user.sub);
  }

  @Post('create-transaction-pin')
  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @RateLimit({ ipLimit: 5, deviceLimit: 5, windowMs: 60 * 60 * 1000 }) // 5 requests per hour per IP and device
  createTransactionPin(
    @Body() dto: CreateTransactionPinDto,
    @Req() req: any,
  ) {
    return this.newAuthService.createTransactionPin(req.user.sub, dto, req);
  }

  @Post('update-transaction-pin')
  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @RateLimit({ ipLimit: 5, deviceLimit: 5, windowMs: 60 * 60 * 1000 }) // 5 requests per hour per IP and device
  updateTransactionPin(
    @Body() dto: UpdateTransactionPinDto,
    @Req() req: any,
  ) {
    return this.newAuthService.updateTransactionPin(req.user.sub, dto, req);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  logout(@Req() req: Request) {
    return this.newAuthService.logout(req);
  }
}

import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthDto, RequestEmailOTPDto, ResetPasswordDto, SignInDto, VerifyEmailOTPDto } from "./dto";

@Controller('auth')
export class AuthController{
    constructor(private authService: AuthService) {}

    @Get('health')
    healthCheck() {
        return { status: 'OK', message: 'Service is running' };
    }

    @Post('request-email-otp')
    requestEmailOTP(@Body() dto: RequestEmailOTPDto) {
        return this.authService.requestEmailOTP(dto)
    }

    @Post('verify-email-otp')
    verifyEmailOTP(@Body() dto: VerifyEmailOTPDto) {
        return this.authService.verifyEmailOTP(dto)
    }

    @Post('signup')
    signup(@Body() dto: AuthDto) {
        return this.authService.signup(dto)
    }

    @Post('signin')
    signin(@Body() dto: SignInDto) {
        return this.authService.signin(dto);
    }

    @Post('request-password-reset-email')
    requestEmailResetOTP(@Body() dto: RequestEmailOTPDto) {
        return this.authService.requestEmailOTP(dto)
    }

    @Post('verify-password-reset-email')
    verifyOTP(@Body() dto: VerifyEmailOTPDto) {
        return this.authService.verifyEmailOTP(dto)
    }

    @Post('reset-password')
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto)
    }
}


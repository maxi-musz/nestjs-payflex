import { Body, Controller, Get, Post, BadRequestException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthDto, RequestEmailOTPDto, ResetPasswordDto, SignInDto, VerifyEmailOTPDto } from "./dto";
import * as colors from "colors";

@Controller('auth')
export class AuthController{
    constructor(private authService: AuthService) {}

    @Post('signup')
    async signup(@Body() dto: AuthDto) {
        
        try {
            return await this.authService.signup(dto);
        } catch (error) {
            console.error(colors.red("Error in signup:"), error);
            throw error;
        }
    }

    @Get('health') 
    healthCheck() {
        return { status: 'OK', message: 'Service is running on local machine not dockerized yet' };
    }

    @Get('health/docker') 
    healthCheckDocker() {
        return { status: 'OK', message: 'Service is running on Docker' };
    }

    @Post('request-email-otp')
    requestEmailOTP(@Body() dto: RequestEmailOTPDto) {
        return this.authService.requestEmailOTP(dto) 
    }

    @Post('verify-email-otp')
    verifyEmailOTP(@Body() dto: VerifyEmailOTPDto) {
        return this.authService.verifyEmailOTP(dto)
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


import { Body, Controller, Get, Post, BadRequestException, Headers, Ip, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthDto, RequestEmailOTPDto, ResetPasswordDto, SignInDto, VerifyEmailOTPDto, StartRegistrationDto } from "./dto";
import { RegistrationService } from "./registration.service";
import * as colors from "colors";
import { Request } from 'express';
import { DeviceMetadataDto, ResendOtpDto, VerifyOtpDto, SubmitIdInformationDto } from "./dto/registration.dto";
import { SecurityHeadersGuard } from "src/common/guards/security-headers.guard";
import { RateLimitGuard, RateLimit } from "src/common/guards/rate-limit.guard";

@Controller('auth')
export class AuthController{
    constructor(
        private authService: AuthService,
        private registrationService: RegistrationService,
    ) {}

    /**
     * Extract device metadata from headers or body
     */
    private extractDeviceMetadata(headers: any, body?: any): DeviceMetadataDto | undefined {
        // Try to get from body first (if provided)
        if (body?.device_metadata && body.device_metadata.device_id) {
            return body.device_metadata as DeviceMetadataDto;
        }

        // Otherwise, try to construct from headers
        const deviceId = headers['x-device-id'];
        if (!deviceId) {
            return undefined;
        }

        return {
            device_id: deviceId,
            device_fingerprint: headers['x-device-fingerprint'] || deviceId,
            device_name: headers['x-device-name'] || undefined,
            device_model: headers['x-device-model'] || undefined,
            platform: headers['platform']?.toLowerCase() || 'ios',
            os_name: headers['x-os-name'] || undefined,
            os_version: headers['x-os-version'] || undefined,
            app_version: headers['x-app-version'] || undefined,
            ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || undefined,
        } as DeviceMetadataDto;
    }

    @Post('signup')
    async signup(
        @Body() dto: AuthDto,
        @Headers() headers: any,
        @Ip() ipAddress: string,
        @Req() req: Request,
    ) {
        try {
            const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
            const deviceMetadata = this.extractDeviceMetadata(headers, dto);
            
            return await this.authService.signup(dto, deviceMetadata, clientIp);
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
    async signin(
        @Body() dto: SignInDto,
        @Headers() headers: any,
        @Ip() ipAddress: string,
        @Req() req: Request,
    ) {
        try {
            const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
            const deviceMetadata = this.extractDeviceMetadata(headers, dto);
            
            return await this.authService.signin(dto, deviceMetadata, clientIp);
        } catch (error) {
            console.error(colors.red("Error in signin:"), error);
            throw error;
        }
    }

    @Post('request-password-reset-email')
    requestEmailResetOTP(@Body() dto: RequestEmailOTPDto) {
        return this.authService.requestEmailOTP(dto)
    }

    @Post('verify-password-reset-email')
    verifyPasswordResetOTP(@Body() dto: VerifyEmailOTPDto) {
        return this.authService.verifyEmailOTP(dto)
    }
 
    @Post('reset-password')
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto)
    }

    @Post('register/start')
    @UseGuards(SecurityHeadersGuard, RateLimitGuard)
    @RateLimit({ phoneLimit: 3, ipLimit: 10, deviceLimit: 5 })
    async startRegistration(
        @Body() dto: StartRegistrationDto,
        @Headers() headers: any,
        @Ip() ipAddress: string,
        @Req() req: Request,
    ) {
        try {
            // Get IP address from request (handles proxies)
            const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
            
            return await this.registrationService.registerWithPhoneNumber(
                dto,
                headers,
                clientIp,
            );
        } catch (error) {
            console.error(colors.red("Error in registration:"), error);
            throw error;
        }
    }

    @Post('register/resend-otp')
    @UseGuards(SecurityHeadersGuard, RateLimitGuard)
    @RateLimit({ phoneLimit: 3, ipLimit: 10, deviceLimit: 5 })
    async resendOTP(
        @Body() dto: ResendOtpDto,
        @Headers() headers: any,
        @Ip() ipAddress: string,
        @Req() req: Request,
    ) {
        try {
            // Get IP address from request (handles proxies)
            const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
            
            return await this.registrationService.resendOTP(
                dto,
                headers,
                clientIp,
            );
        } catch (error) {
            console.error(colors.red("Error in resend OTP:"), error);
            throw error;
        }
    }

    @Post('register/verify-otp')
    @UseGuards(SecurityHeadersGuard)
    async verifyOTP(
        @Body() dto: VerifyOtpDto,
        @Headers() headers: any,
        @Ip() ipAddress: string,
        @Req() req: Request,
    ) {
        try {
            // Get IP address from request (handles proxies)
            const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
            
            return await this.registrationService.verifyOTP(
                dto,
                headers,
                clientIp,
            );
        } catch (error) {
            console.error(colors.red("Error in verify OTP:"), error);
            throw error;
        }
    }

    @Post('register/step-3/submit-id')
    @UseGuards(SecurityHeadersGuard)
    async submitIdInformation(
        @Body() dto: SubmitIdInformationDto,
        @Headers() headers: any,
        @Ip() ipAddress: string,
        @Req() req: Request,
    ) {
        try {
            // Get IP address from request (handles proxies)
            const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
            
            return await this.registrationService.submitIdInformation(
                dto,
                headers,
                clientIp,
            );
        } catch (error) {
            console.error(colors.red("Error in submit ID information:"), error);
            throw error;
        }
    }
}


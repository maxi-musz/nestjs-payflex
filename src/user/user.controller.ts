import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { Request } from '@nestjs/common'
import { UserService } from "./user.service";
import { RequestEmailOTPDto } from "src/auth/dto";
import { AuthGuard } from "@nestjs/passport";
import { KycVerificationDto, UpdateUserDto } from "./dto/user.dto";

@Controller('user')
export class UserController{
    constructor(private userService: UserService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('fetch-user-dashboard')
    fetchUserDashboard(@Request() req) {
        return this.userService.fetchUserDashboard(req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('fetch-user-profile')
    fetchUserprofile(@Request() req) {
        return this.userService.fetchUserProfile(req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('fetch-user-kyc')
    fetchUserKYC(@Request() req) {
        return this.userService.fetchUserKYC(req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Put('update-profile')
    updateUserProfile(@Body() dto: UpdateUserDto, @Request() req) {
        return this.userService.updateUserProfile(dto, req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Put('update-kyc')
    UpdateKyc(@Body() dto: KycVerificationDto, @Request() req) {
        return this.userService.UpdateKyc(dto, req.user)
    }
} 
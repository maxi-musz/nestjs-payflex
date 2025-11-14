import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { Request } from '@nestjs/common'
import { UserService } from "./user.service";
import { AuthGuard } from "@nestjs/passport";
import { KycVerificationDto, UpdateUserDto, SetupTransactionPinDto, UpdateTransactionPinDto } from "./dto/user.dto";

@Controller('user')
export class UserController{
    constructor(private userService: UserService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('fetch-user-dashboard')
    fetchUserDashboard(@Request() req) {
        return this.userService.fetchUserDashboard(req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('fetch-app-homepage-details')
    fetchUserWalletAndLatestTransaction(@Request() req) {
        return this.userService.fetchUserWalletAndLatestTransaction(req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('app-user-profile-page')
    fetchUserProfileForApp(@Request() req: any) {
        return this.userService.fetchUserProfileForApp(req.user);
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

    @UseGuards(AuthGuard('jwt'))
    @Post('setup-transaction-pin')
    setupTransactionPin(@Body() dto: SetupTransactionPinDto, @Request() req) {
        return this.userService.setupTransactionPin(dto, req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Put('update-transaction-pin')
    updateTransactionPin(@Body() dto: UpdateTransactionPinDto, @Request() req) {
        return this.userService.updateTransactionPin(dto, req.user)
    }
} 
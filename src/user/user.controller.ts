import { Body, Controller, Get, Post, Put, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { Request } from '@nestjs/common'
import { FileInterceptor } from "@nestjs/platform-express";
import { UserService } from "./user.service";
import { AuthGuard } from "@nestjs/passport";
import { KycVerificationDto, UpdateUserDto, SetupTransactionPinDto, UpdateTransactionPinDto, RequestAccountDeletionDto } from "./dto/user.dto";

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
        return this.userService.fetchUserProfileForApp(req.user)
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
    @Post('update-display-picture')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 5 * 1024 * 1024 },
        }),
    )
    updateDisplayPicture(
        @UploadedFile() file: Express.Multer.File | undefined,
        @Request() req: any,
    ) {
        return this.userService.updateDisplayPicture(file, req.user);
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

    @UseGuards(AuthGuard('jwt'))
    @Post('request-account-deletion')
    requestAccountDeletion(@Body() dto: RequestAccountDeletionDto, @Request() req) {
        return this.userService.requestAccountDeletion(req.user, dto)
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('cancel-account-deletion-request')
    cancelAccountDeletionRequest(@Request() req) {
        return this.userService.cancelAccountDeletionRequest(req.user)
    }
} 
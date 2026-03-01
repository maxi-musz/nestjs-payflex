import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { BankingService } from './banking.service';
import { PaystackFundingDto, PaystackFundingVerifyDto, PaystackFundingCancelDto } from 'src/common/dto/banking.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreateTempVirtualLocalAccountDto, CreateVirtualAccountDto, InitiateTransferDto, VerifyAccountNumberDto } from './dto/accountNo-creation.dto';
import { SecurityHeadersGuard } from 'src/common/guards/security-headers.guard';
import { RateLimitGuard, RateLimit } from 'src/common/guards/rate-limit.guard';

@Controller('banking')
export class BankingController {
    constructor(private bankingService: BankingService) {}

    // tighter limit — each call creates a pending tx + hits paystack API
    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 10, deviceLimit: 5, windowMs: 60 * 60 * 1000 })
    @Post('initialise-paystack-funding')
    initiatePaystackFunding(@Body() dto: PaystackFundingDto, @Request() req){
        return this.bankingService.initialisePaystackFunding(dto, req.user)
    }

    // slightly more lenient — users may retry verification if the page reloads
    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 20, deviceLimit: 10, windowMs: 60 * 60 * 1000 })
    @Post('verify-paystack-funding')
    verifyPaystackFunding(@Body() dto: PaystackFundingVerifyDto, @Request() req) {
        return this.bankingService.verifyPaystackFunding(dto, req.user)
    }

    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 20, deviceLimit: 10, windowMs: 60 * 60 * 1000 })
    @Post('cancel-paystack-funding')
    cancelPaystackFunding(@Body() dto: PaystackFundingCancelDto, @Request() req) {
        return this.bankingService.cancelPaystackFunding(dto, req.user)
    }

    // creating a bank account is heavy — keep it tight
    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 5, deviceLimit: 3, windowMs: 60 * 60 * 1000 })
    @Post('create-virtual-bank-account')
    createVirtualIntlBankAccountNumber(@Body() dto: CreateVirtualAccountDto, @Request() req) {
        return this.bankingService.createVirtualIntlBankAccountNumber(dto, req.user)
    }

    // flw
    // @UseGuards(AuthGuard('jwt'))
    // @Post('/flw/create-one-time-virtual-account')
    // createTemporaryVirtualAccount(@Body() dto: CreateTempVirtualLocalAccountDto, @Request() req) {
    //     return this.bankingService.createTemporaryVirtualAccount(dto, req.user)
    // }

    // @UseGuards(AuthGuard('jwt'))
    // @Post('/flw/create-permanent-virtual-account')
    // createPermanentVirtualAccount(@Request() req) {
    //     return this.bankingService.createPermanentVirtualAccount(req.user)
    // }

    // @UseGuards(AuthGuard('jwt'))
    // @Get('fetch-user-virtual-accounts')
    // getAllUserVirtualAccounts(@Request() req) {
    //     return this.bankingService.getAllUserVirtualAccounts(req.user)
    // }

    // // @UseGuards(AuthGuard('jwt'))
    // @Get('fetch-all-banks')
    // fetchAllBanks(@Request() req) {
    //     return this.bankingService.fetchAllBanks()
    // }

    // @UseGuards(AuthGuard('jwt'))
    // @Post('verify-account-number')
    // verifyAccountNumberPaystack(@Body() dto: VerifyAccountNumberDto, @Request() req) {
    //     return this.bankingService.verifyAccountNumber(dto, req.user)
    // }

    // @UseGuards(AuthGuard('jwt'))
    // @Post('send-ngn-money')
    // initiateTransferFlutterwave(@Body() dto: InitiateTransferDto, @Request() req) {
    //     return this.bankingService.initiateNewTransferFlutterwave(dto, req.user)
    // }
}

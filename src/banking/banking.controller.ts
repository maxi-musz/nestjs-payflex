import { Body, Controller, Get, HttpException, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { BankingService } from './banking.service';
import { PaystackFundingDto, PaystackFundingVerifyDto, PaystackFundingCancelDto } from 'src/common/dto/banking.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreateTempVirtualLocalAccountDto, CreateVirtualAccountDto, InitiateTransferDto, VerifyAccountNumberDto } from './dto/accountNo-creation.dto';
import { SecurityHeadersGuard } from 'src/common/guards/security-headers.guard';
import { RateLimitGuard, RateLimit } from 'src/common/guards/rate-limit.guard';

const FUNDING_DISABLED_MESSAGE =
    'Wallet funding is temporarily unavailable while we improve the platform. Please try again later.';

@Controller('banking')
export class BankingController {
    constructor(private bankingService: BankingService) {}

    // tighter limit — each call creates a pending tx + hits paystack API
    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 10, deviceLimit: 5, windowMs: 3 * 60 * 1000 }) // 10 requests per 3 minutes
    @Post('initialise-paystack-funding')
    initiatePaystackFunding(@Body() dto: PaystackFundingDto, @Request() req){
        throw new HttpException(FUNDING_DISABLED_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
        // return this.bankingService.initialisePaystackFunding(dto, req.user)
    }

    // slightly more lenient — users may retry verification if the page reloads
    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 20, deviceLimit: 10, windowMs: 3 * 60 * 1000 }) // 20 requests per 3 minutes
    @Post('verify-paystack-funding')
    verifyPaystackFunding(@Body() dto: PaystackFundingVerifyDto, @Request() req) {
        throw new HttpException(FUNDING_DISABLED_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
        // return this.bankingService.verifyPaystackFunding(dto, req.user)
    }

    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 20, deviceLimit: 10, windowMs: 3 * 60 * 1000 }) // 20 requests per 3 minutes
    @Post('cancel-paystack-funding')
    cancelPaystackFunding(@Body() dto: PaystackFundingCancelDto, @Request() req) {
        throw new HttpException(FUNDING_DISABLED_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
        // return this.bankingService.cancelPaystackFunding(dto, req.user)
    }

    // creating a bank account is heavy — keep it tight
    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 5, deviceLimit: 3, windowMs: 60 * 60 * 1000 }) // 5 requests per hour
    @Post('create-virtual-bank-account')
    createVirtualIntlBankAccountNumber(@Body() dto: CreateVirtualAccountDto, @Request() req) {
        return this.bankingService.createVirtualIntlBankAccountNumber(dto, req.user)
    }
}

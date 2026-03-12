import { Body, Controller, Delete, Get, Post, Request, UseGuards } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { AuthGuard } from '@nestjs/passport';
import { AssignDvaDto } from './dto/dva.dto';
import { SecurityHeadersGuard } from 'src/common/guards/security-headers.guard';
import { RateLimitGuard, RateLimit } from 'src/common/guards/rate-limit.guard';
import { VerifyAccountNumberDto, InitiateTransferDto } from '../dto/accountNo-creation.dto';

@Controller('banking/paystack')
export class PaystackController {
    constructor(private paystackService: PaystackService) {}

    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 5, deviceLimit: 3, windowMs: 60 * 60 * 1000 })
    @Post('create-customer')
    createOrGetPaystackCustomer(@Request() req) {
        return this.paystackService.createOrGetPaystackCustomer(req.user);
    }

    // one-off action — keep it very tight
    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 3, deviceLimit: 2, windowMs: 60 * 60 * 1000 })
    @Post('assign-dva')
    assignDedicatedVirtualAccount(@Body() dto: AssignDvaDto, @Request() req) {
        return this.paystackService.assignDedicatedVirtualAccount(req.user, dto);
    }

    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @Get('my-dva')
    getUserDedicatedVirtualAccount(@Request() req) {
        return this.paystackService.getUserDedicatedVirtualAccount(req.user);
    }

    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 3, deviceLimit: 2, windowMs: 60 * 60 * 1000 })
    @Delete('deactivate-dva')
    deactivateDedicatedVirtualAccount(@Request() req) {
        return this.paystackService.deactivateDedicatedVirtualAccount(req.user);
    }

    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @Get('list-all-dvas')
    listAllDedicatedVirtualAccounts() {
        return this.paystackService.listAllDedicatedVirtualAccounts();
    }

    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @Get('fetch-all-banks')
    fetchAllBanks() {
        return this.paystackService.fetchAllBanks();
    }

    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 15, deviceLimit: 10, windowMs: 60 * 1000 }) // 1 minute
    @Post('verify-account-number')
    verifyAccountNumber(@Body() dto: VerifyAccountNumberDto) {
        return this.paystackService.verifyAccountNumber(dto.account_number, dto.bank_code);
    }

    // money leaving the platform — strictest limit
    @UseGuards(SecurityHeadersGuard, RateLimitGuard, AuthGuard('jwt'))
    @RateLimit({ ipLimit: 5, deviceLimit: 3, windowMs: 60 * 1000 }) // 1 minute
    @Post('initiate-transfer')
    initiateTransfer(@Body() dto: InitiateTransferDto, @Request() req) {
        return this.paystackService.initiateTransfer(
            dto.account_number,
            dto.bank_code,
            dto.amount,
            dto.beneficiary_name,
            dto.narration,
            req.user
        );
    }
}


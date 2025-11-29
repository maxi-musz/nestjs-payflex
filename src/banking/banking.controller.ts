import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { BankingService } from './banking.service';
import { PaystackFundingDto, PaystackFundingVerifyDto } from 'src/common/dto/banking.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreateTempVirtualLocalAccountDto, CreateVirtualAccountDto, InitiateTransferDto, VerifyAccountNumberDto } from './dto/accountNo-creation.dto';

@Controller('banking')
export class BankingController {
    constructor(private bankingService: BankingService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('initialise-paystack-funding')
    initiatePaystackFunding(@Body() dto: PaystackFundingDto, @Request() req){
        return this.bankingService.initialisePaystackFunding(dto, req.user)
    }
 
    @UseGuards(AuthGuard('jwt'))
    @Post('verify-paystack-funding')
    verifyPaystackFunding(@Body() dto: PaystackFundingVerifyDto, @Request() req) {
        return this.bankingService.verifyPaystackFunding(dto, req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('create-virtual-bank-account')
    createVirtualIntlBankAccountNumber(@Body() dto: CreateVirtualAccountDto, @Request() req) {
        return this.bankingService.createVirtualIntlBankAccountNumber(dto, req.user)
    }

    // flw
    @UseGuards(AuthGuard('jwt'))
    @Post('/flw/create-one-time-virtual-account')
    createTemporaryVirtualAccount(@Body() dto: CreateTempVirtualLocalAccountDto, @Request() req) {
        return this.bankingService.createTemporaryVirtualAccount(dto, req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('/flw/create-permanent-virtual-account')
    createPermanentVirtualAccount(@Request() req) {
        return this.bankingService.createPermanentVirtualAccount(req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('fetch-user-virtual-accounts')
    getAllUserVirtualAccounts(@Request() req) {
        return this.bankingService.getAllUserVirtualAccounts(req.user)
    }

    // @UseGuards(AuthGuard('jwt'))
    @Get('fetch-all-banks')
    fetchAllBanks(@Request() req) {
        return this.bankingService.fetchAllBanks()
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('verify-account-number')
    verifyAccountNumberPaystack(@Body() dto: VerifyAccountNumberDto, @Request() req) {
        return this.bankingService.verifyAccountNumber(dto, req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('send-ngn-money')
    initiateTransferFlutterwave(@Body() dto: InitiateTransferDto, @Request() req) {
        return this.bankingService.initiateNewTransferFlutterwave(dto, req.user)
    }
}

import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { BankingService } from './banking.service';
import { PaystackFundingDto, PaystackFundingVerifyDto } from 'src/common/dto/banking.dto';
import { AuthGuard } from '@nestjs/passport';

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
}

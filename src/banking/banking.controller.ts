import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BankingService } from './banking.service';
import { PaystackFundingDto } from 'src/common/dto/banking.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('banking')
export class BankingController {
    constructor(private bankingService: BankingService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('initialise-paystack-funding')
    initiatePaystackFunding(@Body() dto: PaystackFundingDto){
        return this.bankingService.initialisePaystackFunding(dto)
    }
}

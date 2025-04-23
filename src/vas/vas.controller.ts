import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VasService } from './vas.service';
import { ValidateBettingProviderGiftBillDto } from './dto/vas.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('vas')
export class VasController {
    constructor(private vasService: VasService) {}

    @Get('gb/betting')
    async getBettingProviders() {
        return this.vasService.FetchAllBettingProvidersGiftBills();
    }

    @Post('gb/betting/validate')
    async validateBettingProviderGiftBill(@Body() dto: ValidateBettingProviderGiftBillDto) {
        return this.vasService.validateBettingProviderGiftBill(dto);
    }
}
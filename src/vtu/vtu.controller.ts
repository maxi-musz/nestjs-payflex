import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { VtuService } from './vtu.service';
import { AuthGuard } from '@nestjs/passport';
import { GiftBillsBuyAirtimeDto, GiftBillDataPurchaseDto, SetsubDataPricesDto, SetsubPurchaseAirtimeDto, SetsubPurchaseDataDto } from 'src/common/dto/vtu.dto';

@Controller('vtu')
export class VtuController {
    constructor(private vtuService: VtuService) {}

    // //////////////////////////////////////// GIFT BILLS /////////////////////////////////////
    @UseGuards(AuthGuard('jwt'))
    @Get("/gb")
    testEndpoint(@Request() req) {
        return this.vtuService.test(req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('/gb/airtime-providers')
    fetchAirtimeProviders(@Request() req) {
        return this.vtuService.fetchAirtimeProviders();
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('/gb/airtime/topup')
    topupAirtimeGiftbills(@Request() req, @Body() dto: GiftBillsBuyAirtimeDto) {
        return this.vtuService.topupAirtimeGiftbills(req.user, dto)
    }
 
    @UseGuards(AuthGuard('jwt'))
    @Get('/gb/internet-data')
    fetchDataProviders() {
        return this.vtuService.fetchDataProviders()
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('/gb/internet-data-types')
    fetchAvailableDataTypes() {
        return this.vtuService.fetchAvailableDataTypes()
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('/gb/available-data-plans/:provider')
    fetchDataPlanForAProvidergiftBills(@Param('provider') provider: string) {
        return this.vtuService.fetchDataPlanForAProvidergiftBills(provider)
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('/gb/internet/purchase-data')
    initiateDataPurchaseGiftBills(@Body() dto: GiftBillDataPurchaseDto, @Request() req) {
        return this.vtuService.initiateDataPurchaseGiftBills(dto, req.user)
    }

    // //////////////////////////////////////// SETSUB /////////////////////////////////////
    @UseGuards(AuthGuard('jwt'))
    @Post('/setsub/data-prices')
    getSetsubDataPrices(@Body() dto: SetsubDataPricesDto, @Request() req) {
        return this.vtuService.getSetsubDataPrices(dto, req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('/setsub/purchase-data')
    purchaseDataOnSetsub(@Body() dto: SetsubPurchaseDataDto, @Request() req) {
        return this.vtuService.purchaseDataOnSetsub(dto, req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('/setsub/purchase-airtime')
    purchaseAirtimeOnSetsub(@Body() dto: SetsubPurchaseAirtimeDto, @Request() req) {
        return this.vtuService.purchaseAirtimeOnSetsub(dto, req.user)
    }
}

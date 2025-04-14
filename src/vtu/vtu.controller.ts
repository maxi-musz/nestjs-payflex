import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { VtuService } from './vtu.service';
import { AuthGuard } from '@nestjs/passport';
import { BuyAirtimeDto, DataPurchaseDto } from 'src/common/dto/vtu.dto';

@Controller('vtu')
export class VtuController {
    constructor(private vtuService: VtuService) {}

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
    topupAirtime(@Request() req, @Body() dto: BuyAirtimeDto) {
        return this.vtuService.topupAirtime(req.user, dto)
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
    fetchDataPlanForAProvider(@Param('provider') provider: string) {
        return this.vtuService.fetchDataPlanForAProvider(provider)
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('/gb/internet/purchase-data')
    initiateDataPurchase(@Body() dto: DataPurchaseDto, @Request() req) {
        return this.vtuService.initiateDataPurchase(dto, req.user)
    }

    // /////////////////////////////////////////////////////////////////////// SETSUB ///////////////////////////////////////////////////////////////////////
    @UseGuards(AuthGuard('jwt'))
    @Get('/setsub/data-prices')
    getSetsubDataPrices() {
        return this.vtuService.getSetsubDataPrices()
    }
}

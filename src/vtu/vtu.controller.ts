import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { VtuService } from './vtu.service';
import { AuthGuard } from '@nestjs/passport';
import { BuyAirtimeDto } from 'src/common/dto/vtu.dto';

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
}

import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { FlutterwaveService } from './flutterwave.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateTransferDto } from 'src/common/dto/banking.dto';

@Controller('transfer')
export class FlutterwaveController {
    constructor(private flutterwaveService: FlutterwaveService) {}

    @UseGuards(AuthGuard('jwt'))
        @Post('new')
        initiateTransfer(@Body() dto: CreateTransferDto, @Request() req) {
            return this.flutterwaveService.initiateTransfer(dto, req.user)
        }
}

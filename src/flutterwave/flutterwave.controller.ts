import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { FlutterwaveService } from './flutterwave.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateTransferDto } from 'src/common/dto/banking.dto';
import { VerifyBvnDto } from './dto/flutterwave.dto';

@Controller('flutterwave')
export class FlutterwaveController {
    constructor(private flutterwaveService: FlutterwaveService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('new')
    initiateTransfer(@Body() dto: CreateTransferDto, @Request() req) {
        return this.flutterwaveService.initiateTransfer(dto, req.user)
    }

    @UseGuards(AuthGuard('jwt'))
    @Post("create-virtual-account")
    createVirtualAcct(@Request() req) {
        return this.flutterwaveService.createVirtualAcct(req.user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post("verify-bvn")
    verifyBvn(@Body() dto: VerifyBvnDto, @Request() req) {
        return this.flutterwaveService.verifyBvn(dto, req.user);
    }

    ///////////////////////////////////////////////////////             Verify bvn webhook
    @Post("verify-bvn-webhook")
    verifyBvnWebhook(@Body() body: any) {
        return this.flutterwaveService.verifyBvnWebhook(body);
    }
}

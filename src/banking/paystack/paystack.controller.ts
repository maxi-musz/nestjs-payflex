import { Body, Controller, Delete, Get, Post, Request, UseGuards } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { AuthGuard } from '@nestjs/passport';
import { AssignDvaDto } from './dto/dva.dto';

@Controller('banking/paystack')
export class PaystackController {
    constructor(private paystackService: PaystackService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('create-customer')
    createOrGetPaystackCustomer(@Request() req) {
        return this.paystackService.createOrGetPaystackCustomer(req.user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('assign-dva')
    assignDedicatedVirtualAccount(@Body() dto: AssignDvaDto, @Request() req) {
        return this.paystackService.assignDedicatedVirtualAccount(req.user, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('my-dva')
    getUserDedicatedVirtualAccount(@Request() req) {
        return this.paystackService.getUserDedicatedVirtualAccount(req.user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('deactivate-dva')
    deactivateDedicatedVirtualAccount(@Request() req) {
        return this.paystackService.deactivateDedicatedVirtualAccount(req.user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('list-all-dvas')
    listAllDedicatedVirtualAccounts() {
        return this.paystackService.listAllDedicatedVirtualAccounts();
    }
}


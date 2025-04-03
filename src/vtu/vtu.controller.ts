import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { VtuService } from './vtu.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('vtu')
export class VtuController {
    constructor(private vtuService: VtuService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get("/")
    testEndpoint(@Request() req) {
        return this.vtuService.test(req.user)
    }
}

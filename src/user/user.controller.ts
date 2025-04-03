import { Body, Controller, Get, UseGuards } from "@nestjs/common";
import { Request } from '@nestjs/common'
import { UserService } from "./user.service";
import { RequestEmailOTPDto } from "src/auth/dto";
import { AuthGuard } from "@nestjs/passport";

@Controller('user')
export class UserController{
    constructor(private userService: UserService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('fetch-user-dashboard')
    fetchUserDashboard(@Request() req) {
        return this.userService.fetchUserDashboard(req.user)
    }
}
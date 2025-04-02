import { Body, Controller, Get } from "@nestjs/common";
import { UserService } from "./user.service";
import { RequestEmailOTPDto, VerifyEmailOTPDto } from "src/auth/dto";

@Controller('user')
export class UserController{
    constructor(private userService: UserService) {}

    @Get('fetch-user-dashboard')
    fetchUserDashboard(@Body() dto: RequestEmailOTPDto) {
        return this.userService.fetchUserDashboard(dto)
    }
}
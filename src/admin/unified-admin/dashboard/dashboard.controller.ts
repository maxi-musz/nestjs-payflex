import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { StatsService } from '../../../common/stats/stats.service';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/dashboard')
export class DashboardController {
  constructor(private readonly statsService: StatsService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get()
  async getDashboardStats(@Req() req: any) {
    this.assertAdmin(req.user);
    const data = await this.statsService.getDashboardStats();
    return new ApiResponseDto(true, 'Dashboard stats fetched', data);
  }

  @Post('recalculate')
  async recalculateStats(@Req() req: any) {
    this.assertAdmin(req.user);
    await this.statsService.recalculate();
    const data = await this.statsService.getDashboardStats();
    return new ApiResponseDto(true, 'Stats recalculated successfully', data);
  }
}

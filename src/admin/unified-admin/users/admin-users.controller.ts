import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import {
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  UpdateUserTierDto,
} from './dto/update-user-status.dto';
import { AdjustUserBalancesDto } from './dto/adjust-user-balances.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get()
  listUsers(@Query() query: QueryUsersDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.usersService.listUsers(query, req.user);
  }

  @Get('search')
  searchUsers(@Query('q') q: string, @Query('limit') limit: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.usersService.searchUsersLightweight(q?.trim() || '', Math.min(20, Number(limit) || 10));
  }

  @Post('lookup-by-ids')
  lookupUsersByIds(@Body() body: { ids?: string[] }, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.usersService.lookupUsersByIds(body?.ids ?? []);
  }

  @Get(':id')
  getUserById(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.usersService.getUserById(id);
  }

  @Put(':id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.usersService.updateUserStatus(id, dto, req.user, req);
  }

  @Put(':id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.usersService.updateUserRole(id, dto, req.user, req);
  }

  @Put(':id/tier')
  updateUserTier(
    @Param('id') id: string,
    @Body() dto: UpdateUserTierDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.usersService.updateUserTier(id, dto, req.user, req);
  }

  @Post(':id/balances/adjust')
  adjustUserBalances(
    @Param('id') id: string,
    @Body() dto: AdjustUserBalancesDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.usersService.adjustUserBalances(id, dto, req.user, req);
  }
}

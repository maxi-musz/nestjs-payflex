import {
  Controller,
  Get,
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
    return this.usersService.listUsers(query);
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
}

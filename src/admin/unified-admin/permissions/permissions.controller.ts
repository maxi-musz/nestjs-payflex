import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { BulkAssignPermissionsDto } from './dto/bulk-assign-permissions.dto';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

/**
 * Admin Permissions Controller
 * All endpoints require JWT auth + admin role.
 * Base path: /api/v1/admin/permissions
 */
@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // Inline admin check — will be replaced by RolesGuard later
  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /**
   * GET /admin/permissions/resources
   * List all available permission resource types
   */
  @Get('resources')
  getAvailableResources(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.permissionsService.getAvailableResources();
  }

  /**
   * GET /admin/permissions
   * List all permissions (paginated, optionally filtered by resource)
   */
  @Get()
  listAllPermissions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('resource') resource?: string,
    @Req() req?: any,
  ) {
    this.assertAdmin(req.user);
    return this.permissionsService.listAllPermissions(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      resource,
    );
  }

  /**
   * GET /admin/permissions/user/:userId
   * Get all permissions for a specific user
   */
  @Get('user/:userId')
  getUserPermissions(@Param('userId') userId: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.permissionsService.getUserPermissions(userId);
  }

  /**
   * GET /admin/permissions/:id
   * Get a single permission by ID
   */
  @Get(':id')
  getPermissionById(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.permissionsService.getPermissionById(id);
  }

  /**
   * POST /admin/permissions
   * Create a new permission for a user on a resource
   */
  @Post()
  createPermission(@Body() dto: CreatePermissionDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.permissionsService.createPermission(dto, req.user, req);
  }

  /**
   * POST /admin/permissions/bulk
   * Assign multiple permissions to a user at once (create or update)
   */
  @Post('bulk')
  bulkAssignPermissions(@Body() dto: BulkAssignPermissionsDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.permissionsService.bulkAssignPermissions(dto, req.user, req);
  }

  /**
   * PUT /admin/permissions/:id
   * Update an existing permission
   */
  @Put(':id')
  updatePermission(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.permissionsService.updatePermission(id, dto, req.user, req);
  }

  /**
   * DELETE /admin/permissions/:id
   * Remove a permission
   */
  @Delete(':id')
  deletePermission(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.permissionsService.deletePermission(id, req.user, req);
  }
}

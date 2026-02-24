import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../common/audit-log/audit-log.service';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { BulkAssignPermissionsDto } from './dto/bulk-assign-permissions.dto';
import { AuditAction, AuditStatus, PermissionResource, Role } from '@prisma/client';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // CREATE — Create a new permission (optionally assigned to a user)
  // Payload: { name, key, resource, description?, user_id? }
  // ──────────────────────────────────────────────────────────

  async createPermission(dto: CreatePermissionDto, adminUser: any, req: any) {
    if (dto.user_id) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: dto.user_id },
        select: { id: true, first_name: true, last_name: true, email: true, role: true },
      });
      if (!targetUser) {
        throw new NotFoundException('User not found');
      }
      const existing = await this.prisma.permission.findFirst({
        where: {
          user_id: dto.user_id,
          key: dto.key,
        },
      });
      if (existing) {
        throw new ConflictException(
          `Permission "${dto.key}" already exists for this user. Use update instead.`,
        );
      }
    }

    const permission = await this.prisma.permission.create({
      data: {
        name: dto.name,
        key: dto.key,
        resource: dto.resource,
        description: dto.description,
        user_id: dto.user_id ?? null,
        granted_by: adminUser.sub,
        notes: dto.notes,
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
      },
    });

    if (dto.user_id) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: dto.user_id },
        select: { email: true },
      });
      this.auditLogService.logAdmin(
        AuditAction.TIER_CREATE,
        AuditStatus.SUCCESS,
        adminUser.sub,
        req,
        {
          description: `Admin granted ${dto.name} (${dto.key}) to ${targetUser?.email}`,
          resource_type: 'Permission',
          resource_id: permission.id,
          new_values: { name: dto.name, key: dto.key, resource: dto.resource },
          metadata: { target_user_id: dto.user_id },
        },
      );
    }

    return new ApiResponseDto(true, 'Permission created successfully', permission);
  }

  // ──────────────────────────────────────────────────────────
  // READ — Get all permissions for a user
  // ──────────────────────────────────────────────────────────

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, first_name: true, last_name: true, email: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = await this.prisma.permission.findMany({
      where: { user_id: userId },
      orderBy: [{ resource: 'asc' }, { key: 'asc' }],
    });

    return new ApiResponseDto(true, 'User permissions fetched', {
      user,
      permissions: permissions.map((p) => ({
        id: p.id,
        name: p.name,
        key: p.key,
        resource: p.resource,
        description: p.description,
        granted_by: p.granted_by,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  }

  // ──────────────────────────────────────────────────────────
  // READ — Get a single permission by ID
  // ──────────────────────────────────────────────────────────

  async getPermissionById(permissionId: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return new ApiResponseDto(true, 'Permission fetched', permission);
  }

  // ──────────────────────────────────────────────────────────
  // READ — List all permissions (paginated)
  // ──────────────────────────────────────────────────────────

  async listAllPermissions(page: number = 1, limit: number = 20, resource?: string) {
    const skip = (page - 1) * limit;
    const where: { resource?: string } = {};
    if (resource) where.resource = resource;

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ user_id: 'asc' }, { resource: 'asc' }, { key: 'asc' }],
        include: {
          user: {
            select: { id: true, first_name: true, last_name: true, email: true, role: true },
          },
        },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return new ApiResponseDto(true, 'Permissions fetched', {
      permissions,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // UPDATE — Update a permission by ID
  // ──────────────────────────────────────────────────────────

  async updatePermission(permissionId: string, dto: UpdatePermissionDto, adminUser: any, req: any) {
    const existing = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Permission not found');
    }

    const updated = await this.prisma.permission.update({
      where: { id: permissionId },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.key != null && { key: dto.key }),
        ...(dto.resource != null && { resource: dto.resource }),
        ...(dto.description !== undefined && { description: dto.description }),
        granted_by: adminUser.sub,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
      },
    });

    this.auditLogService.logAdmin(
      AuditAction.TIER_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin updated permission ${existing.name} for ${existing.user?.email ?? 'definition'}`,
        resource_type: 'Permission',
        resource_id: permissionId,
        old_values: { name: existing.name, key: existing.key, resource: existing.resource },
        new_values: { name: updated.name, key: updated.key, resource: updated.resource },
        metadata: { target_user_id: existing.user_id, target_user_email: existing.user?.email },
      },
    );

    return new ApiResponseDto(true, 'Permission updated successfully', updated);
  }

  // ──────────────────────────────────────────────────────────
  // DELETE — Remove a permission by ID
  // ──────────────────────────────────────────────────────────

  async deletePermission(permissionId: string, adminUser: any, req: any) {
    const existing = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Permission not found');
    }

    await this.prisma.permission.delete({
      where: { id: permissionId },
    });

    this.auditLogService.logAdmin(
      AuditAction.TIER_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin removed permission ${existing.name} from ${existing.user?.email ?? 'definitions'}`,
        resource_type: 'Permission',
        resource_id: permissionId,
        old_values: { name: existing.name, key: existing.key, resource: existing.resource },
        metadata: { target_user_id: existing.user_id, target_user_email: existing.user?.email },
      },
    );

    return new ApiResponseDto(true, 'Permission deleted successfully');
  }

  // ──────────────────────────────────────────────────────────
  // BULK — Assign multiple permissions to a user by key
  // Payload: { user_id, permissions: [{ key }] }
  // ──────────────────────────────────────────────────────────

  async bulkAssignPermissions(dto: BulkAssignPermissionsDto, adminUser: any, req: any) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.user_id },
      select: { id: true, first_name: true, last_name: true, email: true, role: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const keys = [...new Set(dto.permissions.map((p) => p.key))];
    const definitions = await this.prisma.permission.findMany({
      where: { key: { in: keys }, user_id: null },
    });
    const definitionByKey = new Map(definitions.map((d) => [d.key, d]));

    const resolved = await this.prisma.$transaction(
      dto.permissions.map((perm) => {
        const def = definitionByKey.get(perm.key);
        return this.prisma.permission.upsert({
          where: {
            user_id_key: {
              user_id: dto.user_id,
              key: perm.key,
            },
          },
          create: {
            user_id: dto.user_id,
            name: def?.name ?? perm.key,
            key: perm.key,
            resource: def?.resource ?? perm.key,
            description: def?.description ?? null,
            granted_by: adminUser.sub,
            notes: dto.notes,
          },
          update: {
            granted_by: adminUser.sub,
            notes: dto.notes,
          },
        });
      }),
    );

    this.auditLogService.logAdmin(
      AuditAction.TIER_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin bulk-assigned ${dto.permissions.length} permissions to ${targetUser.email}`,
        resource_type: 'Permission',
        resource_id: dto.user_id,
        new_values: dto.permissions,
        metadata: { target_user_id: dto.user_id, target_user_email: targetUser.email },
      },
    );

    return new ApiResponseDto(true, `${resolved.length} permissions assigned successfully`, {
      assigned: dto.permissions.map((p) => ({ key: p.key })),
    });
  }

  // ──────────────────────────────────────────────────────────
  // HELPER — Check if a user has a specific permission by key
  // ──────────────────────────────────────────────────────────

  async hasPermission(userId: string, key: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === Role.admin) return true;

    const permission = await this.prisma.permission.findFirst({
      where: {
        user_id: userId,
        key,
      },
    });

    return !!permission;
  }

  // ──────────────────────────────────────────────────────────
  // LIST RESOURCES — Return all available permission resources
  // ──────────────────────────────────────────────────────────

  getAvailableResources() {
    return new ApiResponseDto(
      true,
      'Available permission resources',
      Object.values(PermissionResource) as unknown as string[],
    );
  }
}

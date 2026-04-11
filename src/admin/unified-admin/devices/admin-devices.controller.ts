import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AdminDevicesService } from './admin-devices.service';
import { QueryDevicesDto, BulkDeviceActionDto } from './dto/device-query.dto';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/devices')
export class AdminDevicesController {
  constructor(private readonly devicesService: AdminDevicesService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) throw new ForbiddenException('Admin access required');
  }

  @Get()
  async listDevices(@Query() query: QueryDevicesDto, @Req() req: any) {
    this.assertAdmin(req.user);
    const result = await this.devicesService.listDevices({
      page: Number(query.page) || 1,
      limit: Math.min(100, Number(query.limit) || 20),
      platform: query.platform,
      status: query.status,
      search: query.search?.trim(),
      os_name: query.os_name?.trim(),
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    });
    return new ApiResponseDto(true, 'Devices fetched', result);
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    this.assertAdmin(req.user);
    const stats = await this.devicesService.getStats();
    return new ApiResponseDto(true, 'Device stats fetched', stats);
  }

  @Get('user/:userId')
  async getUserDevices(@Param('userId') userId: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const devices = await this.devicesService.getUserDevices(userId);
    return new ApiResponseDto(true, 'User devices fetched', devices);
  }

  @Get(':id')
  async getDevice(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const device = await this.devicesService.getDevice(id);
    return new ApiResponseDto(true, 'Device fetched', device);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendDevice(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const device = await this.devicesService.suspendDevice(id, req.user);
    return new ApiResponseDto(true, 'Device suspended', device);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateDevice(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const device = await this.devicesService.reactivateDevice(id, req.user);
    return new ApiResponseDto(true, 'Device reactivated', device);
  }

  @Delete(':id')
  async removeDevice(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const result = await this.devicesService.removeDevice(id, req.user);
    return new ApiResponseDto(true, 'Device removed', result);
  }

  @Post('bulk/suspend')
  @HttpCode(HttpStatus.OK)
  async bulkSuspend(@Body() dto: BulkDeviceActionDto, @Req() req: any) {
    this.assertAdmin(req.user);
    if (!dto.device_ids?.length) throw new BadRequestException('device_ids required');
    const result = await this.devicesService.bulkSuspend(dto.device_ids, req.user);
    return new ApiResponseDto(true, `${result.count} device(s) suspended`, result);
  }

  @Post('bulk/reactivate')
  @HttpCode(HttpStatus.OK)
  async bulkReactivate(@Body() dto: BulkDeviceActionDto, @Req() req: any) {
    this.assertAdmin(req.user);
    if (!dto.device_ids?.length) throw new BadRequestException('device_ids required');
    const result = await this.devicesService.bulkReactivate(dto.device_ids, req.user);
    return new ApiResponseDto(true, `${result.count} device(s) reactivated`, result);
  }
}

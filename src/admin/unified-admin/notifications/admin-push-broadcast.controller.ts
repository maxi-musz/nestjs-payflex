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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AdminPushBroadcastService } from './admin-push-broadcast.service';
import { CreatePushBroadcastDto, QueryPushBroadcastsDto } from './dto/create-push-broadcast.dto';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/notifications/push')
export class AdminPushBroadcastController {
  constructor(private readonly pushBroadcastService: AdminPushBroadcastService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) throw new ForbiddenException('Admin access required');
  }

  @Post('broadcasts')
  @HttpCode(HttpStatus.CREATED)
  async createBroadcast(@Body() dto: CreatePushBroadcastDto, @Req() req: any) {
    this.assertAdmin(req.user);
    if (dto.target_type === 'individual' && (!dto.target_user_ids?.length)) {
      throw new BadRequestException('target_user_ids required for individual target type');
    }
    const broadcast = await this.pushBroadcastService.createBroadcast(dto, req.user);
    return new ApiResponseDto(true, 'Push broadcast created successfully', broadcast);
  }

  @Post('broadcasts/preview')
  @HttpCode(HttpStatus.OK)
  async previewAudience(@Body() dto: CreatePushBroadcastDto, @Req() req: any) {
    this.assertAdmin(req.user);
    const preview = await this.pushBroadcastService.previewAudience(dto);
    return new ApiResponseDto(true, 'Audience preview fetched', preview);
  }

  @Get('broadcasts')
  async listBroadcasts(@Query() query: QueryPushBroadcastsDto, @Req() req: any) {
    this.assertAdmin(req.user);
    const result = await this.pushBroadcastService.listBroadcasts(query);
    return new ApiResponseDto(true, 'Push broadcasts fetched', result);
  }

  @Get('broadcasts/:id')
  async getBroadcast(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const broadcast = await this.pushBroadcastService.getBroadcast(id);
    if (!broadcast) throw new NotFoundException('Push broadcast not found');
    return new ApiResponseDto(true, 'Push broadcast fetched', broadcast);
  }

  @Get('broadcasts/:id/logs')
  async getBroadcastLogs(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    this.assertAdmin(req.user);
    const result = await this.pushBroadcastService.getBroadcastLogs(
      id,
      Number(page) || 1,
      Math.min(100, Number(limit) || 50),
    );
    return new ApiResponseDto(true, 'Broadcast logs fetched', result);
  }

  @Post('broadcasts/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBroadcast(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const result = await this.pushBroadcastService.cancelBroadcast(id, req.user);
    if (!result) throw new NotFoundException('Push broadcast not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return new ApiResponseDto(true, 'Push broadcast cancelled', result);
  }

  @Post('broadcasts/:id/resend-failed')
  @HttpCode(HttpStatus.OK)
  async resendFailed(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const result = await this.pushBroadcastService.resendFailed(id);
    if (!result) throw new NotFoundException('Push broadcast not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return new ApiResponseDto(true, 'Resending to failed recipients', result);
  }

  @Delete('broadcasts/:id')
  @HttpCode(HttpStatus.OK)
  async deleteBroadcast(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const result = await this.pushBroadcastService.deleteBroadcast(id, req.user);
    if (!result) throw new NotFoundException('Push broadcast not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return new ApiResponseDto(true, 'Push broadcast deleted', result);
  }

  // ─── Device Tokens Analytics ─────────────────────────────────

  @Get('device-tokens')
  async listDeviceTokens(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('platform') platform?: string,
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    this.assertAdmin(req.user);
    const result = await this.pushBroadcastService.listDeviceTokens({
      page: Number(page) || 1,
      limit: Math.min(100, Number(limit) || 20),
      platform: platform === 'ios' || platform === 'android' ? platform : undefined,
      is_active: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search?.trim() || undefined,
    });
    return new ApiResponseDto(true, 'Device tokens fetched', result);
  }

  @Get('device-tokens/stats')
  async deviceTokenStats(@Req() req: any) {
    this.assertAdmin(req.user);
    const stats = await this.pushBroadcastService.getDeviceTokenStats();
    return new ApiResponseDto(true, 'Device token stats fetched', stats);
  }
}

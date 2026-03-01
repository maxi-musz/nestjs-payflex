import {
  Controller,
  Get,
  Post,
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
import { AdminNotificationsService } from './admin-notifications.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { QueryCampaignsDto } from './dto/query-campaigns.dto';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: AdminNotificationsService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) throw new ForbiddenException('Admin access required');
  }

  // ─── Create & optionally send / schedule a campaign ─────────

  @Post('campaigns')
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(@Body() dto: CreateCampaignDto, @Req() req: any) {
    this.assertAdmin(req.user);

    if (dto.target_type === 'individual' && (!dto.target_emails?.length)) {
      throw new BadRequestException('target_emails required for individual target type');
    }

    const campaign = await this.notificationsService.createCampaign(dto, req.user);
    return new ApiResponseDto(true, 'Campaign created successfully', campaign);
  }

  // ─── Preview audience count (no emails sent) ────────────────

  @Post('campaigns/preview')
  @HttpCode(HttpStatus.OK)
  async previewAudience(@Body() dto: CreateCampaignDto, @Req() req: any) {
    this.assertAdmin(req.user);
    const preview = await this.notificationsService.previewAudience(dto);
    return new ApiResponseDto(true, 'Audience preview fetched', preview);
  }

  // ─── List all campaigns (paginated) ─────────────────────────

  @Get('campaigns')
  async listCampaigns(@Query() query: QueryCampaignsDto, @Req() req: any) {
    this.assertAdmin(req.user);
    const result = await this.notificationsService.listCampaigns(query);
    return new ApiResponseDto(true, 'Campaigns fetched', result);
  }

  // ─── Single campaign detail ─────────────────────────────────

  @Get('campaigns/:id')
  async getCampaign(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const campaign = await this.notificationsService.getCampaign(id);
    if (!campaign) throw new NotFoundException('Campaign not found');
    return new ApiResponseDto(true, 'Campaign fetched', campaign);
  }

  // ─── Per-recipient delivery logs ────────────────────────────

  @Get('campaigns/:id/logs')
  async getCampaignLogs(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    this.assertAdmin(req.user);
    const result = await this.notificationsService.getCampaignLogs(
      id,
      Number(page) || 1,
      Math.min(100, Number(limit) || 50),
    );
    return new ApiResponseDto(true, 'Campaign logs fetched', result);
  }

  // ─── Cancel a scheduled campaign ────────────────────────────

  @Post('campaigns/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelCampaign(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const result = await this.notificationsService.cancelCampaign(id, req.user);
    if (!result) throw new NotFoundException('Campaign not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return new ApiResponseDto(true, 'Campaign cancelled', result);
  }

  // ─── Resend to previously failed recipients ─────────────────

  @Post('campaigns/:id/resend-failed')
  @HttpCode(HttpStatus.OK)
  async resendFailed(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    const result = await this.notificationsService.resendFailed(id, req.user);
    if (!result) throw new NotFoundException('Campaign not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return new ApiResponseDto(true, 'Resending to failed recipients', result);
  }
}

import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminPushBroadcastService } from './admin-push-broadcast.service';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications/inbox')
export class PushInboxController {
  constructor(private readonly pushBroadcastService: AdminPushBroadcastService) {}

  @Get()
  async getInbox(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const result = await this.pushBroadcastService.getUserInbox(
      req.user.sub,
      Number(page) || 1,
      Math.min(50, Number(limit) || 20),
    );
    return new ApiResponseDto(true, 'Inbox fetched', result);
  }

  @Get(':id')
  async getInboxItem(@Param('id') id: string, @Req() req: any) {
    const item = await this.pushBroadcastService.getInboxItem(req.user.sub, id);
    if (!item) throw new NotFoundException('Notification not found');
    return new ApiResponseDto(true, 'Notification fetched', item);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Req() req: any) {
    await this.pushBroadcastService.markAllRead(req.user.sub);
    return new ApiResponseDto(true, 'All notifications marked as read', null);
  }
}

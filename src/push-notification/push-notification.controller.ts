import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PushNotificationService } from './push-notification.service';
import {
  RegisterDeviceTokenDto,
  SendPushNotificationDto,
} from './dto/push-notification.dto';

@Controller('push-notification')
export class PushNotificationController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Register a device token for push notifications
   * POST /api/v1/push-notification/register
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('register')
  registerDeviceToken(@Body() dto: RegisterDeviceTokenDto, @Request() req) {
    return this.pushNotificationService.registerDeviceToken(
      dto,
      req.user.sub,
    );
  }

  /**
   * Remove a device token (logout/uninstall)
   * DELETE /api/v1/push-notification/remove/:token
   */
  @UseGuards(AuthGuard('jwt'))
  @Delete('remove/:token')
  removeDeviceToken(@Param('token') token: string, @Request() req) {
    return this.pushNotificationService.removeDeviceToken(token, req.user.sub);
  }

  /**
   * Get user's registered device tokens
   * GET /api/v1/push-notification/tokens
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('tokens')
  getUserDeviceTokens(@Request() req) {
    return this.pushNotificationService.getUserDeviceTokens(req.user.sub);
  }

  /**
   * Send push notification to current user (for testing)
   * POST /api/v1/push-notification/send
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('send')
  sendNotification(@Body() dto: SendPushNotificationDto, @Request() req) {
    return this.pushNotificationService.sendNotificationToUser(
      req.user.sub,
      dto,
    );
  }
}


import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhook')
export class WebhooksController {
  constructor(private readonly webhookService: WebhooksService) {}

  @Post('flutterwave')
  @HttpCode(200)
  async handleFlutterwave(@Body() body: any, @Headers() headers: any) {
    await this.webhookService.handleFlutterwaveEvent(body, headers);
    return { status: 'ok' };
  }
}

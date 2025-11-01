import { Controller, Post, Body, Headers, HttpCode, Req } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';

@Controller('webhook')
export class WebhooksController {
  constructor(private readonly webhookService: WebhooksService) {}

  @Post('flutterwave')
  @HttpCode(200)
  async handleFlutterwave(@Body() body: any, @Headers() headers: any) {
    await this.webhookService.handleFlutterwaveEvent(body, headers);
    return { status: 'ok' };
  }

  @Post('paystack')
  @HttpCode(200)
  async handlePaystack(@Req() req: Request, @Headers() headers: any) {
    // Raw body is preserved by middleware for signature verification
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
    const body = req.body instanceof Buffer ? JSON.parse(req.body.toString()) : req.body;
    await this.webhookService.handlePaystackEvent(body, headers, rawBody);
    return { status: 'ok' };
  }
}

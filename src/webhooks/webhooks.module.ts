import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { FlutterwaveModule } from 'src/flutterwave/flutterwave.module';
import { PaystackWebhookModule } from './paystack-webhook/paystack-webhook.module';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';
import { FlutterwaveController } from 'src/flutterwave/flutterwave.controller';

@Module({
  imports: [
    ConfigModule,
    FlutterwaveModule,
    PaystackWebhookModule,
  ],
  controllers: [WebhooksController, FlutterwaveController],
  providers: [WebhooksService, FlutterwaveService],
})
export class WebhooksModule {}

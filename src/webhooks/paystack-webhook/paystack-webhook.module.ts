import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaystackWebhookService } from './paystack-webhook.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PaystackWebhookService],
  exports: [PaystackWebhookService],
})
export class PaystackWebhookModule {}


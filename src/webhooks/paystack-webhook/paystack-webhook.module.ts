import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from 'src/common/mailer/email.module';
import { PushNotificationModule } from 'src/push-notification/push-notification.module';
import { PaystackWebhookService } from './paystack-webhook.service';

@Module({
  imports: [ConfigModule, PrismaModule, EmailModule, PushNotificationModule],
  providers: [PaystackWebhookService],
  exports: [PaystackWebhookService],
})
export class PaystackWebhookModule {}


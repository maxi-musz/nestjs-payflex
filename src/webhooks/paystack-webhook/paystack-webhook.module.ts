import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from 'src/common/mailer/email.module';
import { PaystackWebhookService } from './paystack-webhook.service';

@Module({
  imports: [ConfigModule, PrismaModule, EmailModule],
  providers: [PaystackWebhookService],
  exports: [PaystackWebhookService],
})
export class PaystackWebhookModule {}


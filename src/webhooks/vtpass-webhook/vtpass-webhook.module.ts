import { Module } from '@nestjs/common';
import { VtpassWebhookService } from './vtpass-webhook.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VtpassWebhookService],
  exports: [VtpassWebhookService],
})
export class VtpassWebhookModule {}


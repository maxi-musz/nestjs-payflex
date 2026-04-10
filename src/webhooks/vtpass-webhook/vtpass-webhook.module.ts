import { Module } from '@nestjs/common';
import { VtpassWebhookService } from './vtpass-webhook.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VtpassSharedModule } from 'src/utility-services/vtpass-service/vtpass-shared.module';

@Module({
  imports: [PrismaModule, VtpassSharedModule],
  providers: [VtpassWebhookService],
  exports: [VtpassWebhookService],
})
export class VtpassWebhookModule {}


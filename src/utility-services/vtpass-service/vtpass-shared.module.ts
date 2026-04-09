import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PushNotificationModule } from 'src/push-notification/push-notification.module';
import { VtpassTransactionOrchestrator } from './vtpass-transaction.orchestrator';
import { VtpassFailureCooldownService } from './vtpass-failure-cooldown.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, PushNotificationModule],
  providers: [VtpassFailureCooldownService, VtpassTransactionOrchestrator],
  exports: [VtpassFailureCooldownService, VtpassTransactionOrchestrator],
})
export class VtpassSharedModule {}

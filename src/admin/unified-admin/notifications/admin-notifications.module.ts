import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminPushBroadcastController } from './admin-push-broadcast.controller';
import { AdminPushBroadcastService } from './admin-push-broadcast.service';
import { PushInboxController } from './push-inbox.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from 'src/common/mailer/email.module';
import { AuditLogModule } from 'src/common/audit-log/audit-log.module';
import { PushNotificationModule } from 'src/push-notification/push-notification.module';

@Module({
  imports: [PrismaModule, EmailModule, AuditLogModule, PushNotificationModule],
  controllers: [AdminNotificationsController, AdminPushBroadcastController, PushInboxController],
  providers: [AdminNotificationsService, AdminPushBroadcastService],
  exports: [AdminNotificationsService, AdminPushBroadcastService],
})
export class AdminNotificationsModule {}

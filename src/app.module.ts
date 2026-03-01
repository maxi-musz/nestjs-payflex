import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { BankingModule } from './banking/banking.module';
import { TransactionHistoryModule } from './transaction-history/transaction-history.module';
import { VtuModule } from './vtu/vtu.module';
import { CronModule } from './cron/cron.module';
import { VirtualCardModule } from './virtual-card/virtual-card.module';
import { BridgeCardModule } from './bridge-card/bridge-card.module';
import { FlutterwaveModule } from './flutterwave/flutterwave.module';
import { VasModule } from './vas/vas.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { FlutterwaveService } from './flutterwave/flutterwave.service';
import { UtilityServicesModule } from './utility-services/utility-services.module';
import { PushNotificationModule } from './push-notification/push-notification.module';
import { CommonModule } from './common/common.module';
import { SupportModule } from './support/support.module';
import { EmailModule } from './common/mailer/email.module';
import { AuditLogModule } from './common/audit-log/audit-log.module';
import { CashbackModule } from './common/cashback/cashback.module';
import { NewAuthModule } from './new-auth/new-auth.module';
import { PermissionsModule } from './admin/unified-admin/permissions/permissions.module';
import { StatsModule } from './common/stats/stats.module';
import { DashboardModule } from './admin/unified-admin/dashboard/dashboard.module';
import { AdminUsersModule } from './admin/unified-admin/users/admin-users.module';
import { AdminTransactionsModule } from './admin/unified-admin/transactions/admin-transactions.module';
import { AdminSupportModule } from './admin/unified-admin/support/admin-support.module';
import { AdminAuditLogsModule } from './admin/unified-admin/audit-logs/admin-audit-logs.module';
import { ReferralModule } from './referral/referral.module';
import { AdminReferralsModule } from './admin/unified-admin/referrals/admin-referrals.module';
import { AdminCashbackModule } from './admin/unified-admin/cashback/admin-cashback.module';
import { AdminFirstTxRewardModule } from './admin/unified-admin/first-tx-reward/admin-first-tx-reward.module';
import { AdminNotificationsModule } from './admin/unified-admin/notifications/admin-notifications.module';
import { FirstTxRewardModule } from './common/first-tx-reward/first-tx-reward.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    CommonModule,
    StorageModule,
    StatsModule,
    AuditLogModule,
    CashbackModule,
    FirstTxRewardModule,
    NewAuthModule,
    PermissionsModule,
    DashboardModule,
    AdminUsersModule,
    AdminTransactionsModule,
    AdminSupportModule,
    AdminAuditLogsModule,
    AdminReferralsModule,
    AdminCashbackModule,
    AdminFirstTxRewardModule,
    AdminNotificationsModule,
    ReferralModule,
    UserModule, 
    BookmarkModule, 
    PrismaModule, BankingModule, TransactionHistoryModule, VtuModule, CronModule, VirtualCardModule, BridgeCardModule, FlutterwaveModule, VasModule, WebhooksModule, UtilityServicesModule, PushNotificationModule, SupportModule, EmailModule
  ],
  controllers: [],
  providers: [FlutterwaveService],
})
export class AppModule {}

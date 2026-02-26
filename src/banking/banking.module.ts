import { Module } from '@nestjs/common';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { PaystackModule } from './paystack/paystack.module';
import { SmipayModule } from './smipay/smipay.module';
import { DvaProviderFactory } from './dva-providers/dva-provider.factory';
import { BankProviderFactory } from './bank-providers/bank-provider.factory';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { ReferralModule } from '../referral/referral.module';
import { PushNotificationModule } from 'src/push-notification/push-notification.module';
import { EmailModule } from 'src/common/mailer/email.module';

@Module({
  imports: [PaystackModule, SmipayModule, PrismaModule, CommonModule, ReferralModule, PushNotificationModule, EmailModule],
  providers: [BankingService, DvaProviderFactory, BankProviderFactory],
  controllers: [BankingController],
  exports: [BankingService, DvaProviderFactory, BankProviderFactory],
})
export class BankingModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AirtimeLimitsGuard } from 'src/utility-services/vtpass-service/airtime/guards/airtime.limits.guard';
import { RateLimitGuard } from 'src/utility-services/vtpass-service/guards/rate-limit.guard';
import { AirtimeService } from './airtime.service';
import { AirtimeController } from './airtime.controller';
import { InternationalAirtimeService } from './international-airtime.service';
import { InternationalAirtimeController } from './international-airtime.controller';
import { PushNotificationModule } from 'src/push-notification/push-notification.module';
import { EmailModule } from 'src/common/mailer/email.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PushNotificationModule,
    EmailModule,
  ],
  controllers: [AirtimeController, InternationalAirtimeController],
  providers: [AirtimeService, InternationalAirtimeService, AirtimeLimitsGuard, RateLimitGuard],
  exports: [AirtimeService, InternationalAirtimeService],
})
export class AirtimeModule {}

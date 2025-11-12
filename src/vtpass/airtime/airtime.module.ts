import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AirtimeLimitsGuard } from 'src/vtpass/airtime/guards/airtime.limits.guard';
import { RateLimitGuard } from 'src/vtpass/guards/rate-limit.guard';
import { AirtimeService } from './airtime.service';
import { AirtimeController } from './airtime.controller';
import { PushNotificationModule } from 'src/push-notification/push-notification.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PushNotificationModule
  ],
  controllers: [AirtimeController],
  providers: [AirtimeService, AirtimeLimitsGuard, RateLimitGuard],
  exports: [AirtimeService],
})
export class AirtimeModule {}

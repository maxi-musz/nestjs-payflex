import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AirtimeLimitsGuard } from 'src/utility-services/vtpass-service/airtime/guards/airtime.limits.guard';
import { RateLimitGuard } from 'src/utility-services/vtpass-service/guards/rate-limit.guard';
import { AirtimeService } from './airtime.service';
import { AirtimeController } from './airtime.controller';
import { InternationalAirtimeService } from './international-airtime.service';
import { InternationalAirtimeController } from './international-airtime.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  controllers: [AirtimeController, InternationalAirtimeController],
  providers: [AirtimeService, InternationalAirtimeService, AirtimeLimitsGuard, RateLimitGuard],
  exports: [AirtimeService, InternationalAirtimeService],
})
export class AirtimeModule {}

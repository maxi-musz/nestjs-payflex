import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AirtimeLimitsGuard } from 'src/vtpass/airtime/guards/airtime.limits.guard';
import { RateLimitGuard } from 'src/vtpass/airtime/guards/rate-limit.guard';
import { AirtimeService } from './airtime.service';
import { AirtimeController } from './airtime.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule
  ],
  controllers: [AirtimeController],
  providers: [AirtimeService, AirtimeLimitsGuard, RateLimitGuard],
  exports: [AirtimeService],
})
export class AirtimeModule {}

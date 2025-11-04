import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DataLimitsGuard } from 'src/vtpass/data/guards/data.limits.guard';
import { RateLimitGuard } from 'src/vtpass/data/guards/rate-limit.guard';
import { DataService } from './data.service';
import { DataController } from './data.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule
  ],
  controllers: [DataController],
  providers: [DataService, DataLimitsGuard, RateLimitGuard],
  exports: [DataService],
})
export class DataModule {}

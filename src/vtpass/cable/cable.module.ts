import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CableLimitsGuard } from './guards/cable.limits.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { CableService } from './cable.service';
import { CableController } from './cable.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule
  ],
  providers: [CableService, CableLimitsGuard, RateLimitGuard],
  controllers: [CableController]
})
export class CableModule {}


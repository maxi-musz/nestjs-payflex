import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from 'src/common/mailer/email.module';
import { ElectricityLimitsGuard } from './guards/electricity.limits.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { ElectricityService } from './electricity.service';
import { ElectricityController } from './electricity.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EmailModule,
  ],
  providers: [ElectricityService, ElectricityLimitsGuard, RateLimitGuard],
  controllers: [ElectricityController],
  exports: [ElectricityService],
})
export class ElectricityModule {}

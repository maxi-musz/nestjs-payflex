import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from 'src/common/mailer/email.module';
import { EducationLimitsGuard } from './guards/education.limits.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EmailModule,
  ],
  providers: [EducationService, EducationLimitsGuard, RateLimitGuard],
  controllers: [EducationController],
  exports: [EducationService],
})
export class EducationModule {}

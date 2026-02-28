import { Module } from '@nestjs/common';
import { AdminCashbackController } from './admin-cashback.controller';
import { AdminCashbackService } from './admin-cashback.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCashbackController],
  providers: [AdminCashbackService],
  exports: [AdminCashbackService],
})
export class AdminCashbackModule {}

import { Module } from '@nestjs/common';
import { AdminFirstTxRewardController } from './admin-first-tx-reward.controller';
import { AdminFirstTxRewardService } from './admin-first-tx-reward.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminFirstTxRewardController],
  providers: [AdminFirstTxRewardService],
  exports: [AdminFirstTxRewardService],
})
export class AdminFirstTxRewardModule {}

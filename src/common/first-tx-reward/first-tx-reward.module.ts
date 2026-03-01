import { Global, Module } from '@nestjs/common';
import { FirstTxRewardService } from './first-tx-reward.service';

@Global()
@Module({
  providers: [FirstTxRewardService],
  exports: [FirstTxRewardService],
})
export class FirstTxRewardModule {}

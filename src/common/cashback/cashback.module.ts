import { Global, Module } from '@nestjs/common';
import { CashbackService } from './cashback.service';

@Global()
@Module({
  providers: [CashbackService],
  exports: [CashbackService],
})
export class CashbackModule {}

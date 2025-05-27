import { Module } from '@nestjs/common';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';

@Module({
  providers: [BankingService],
  controllers: [BankingController],
  exports: [BankingService],
})
export class BankingModule {}

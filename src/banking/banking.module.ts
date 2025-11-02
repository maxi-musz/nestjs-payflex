import { Module } from '@nestjs/common';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { PaystackModule } from './paystack/paystack.module';

@Module({
  imports: [PaystackModule],
  providers: [BankingService],
  controllers: [BankingController],
  exports: [BankingService],
})
export class BankingModule {}

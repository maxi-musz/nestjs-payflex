import { Module } from '@nestjs/common';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { PaystackModule } from './paystack/paystack.module';
import { SmipayModule } from './smipay/smipay.module';

@Module({
  imports: [PaystackModule, SmipayModule],
  providers: [BankingService],
  controllers: [BankingController],
  exports: [BankingService],
})
export class BankingModule {}

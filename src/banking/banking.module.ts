import { Module } from '@nestjs/common';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { PaystackModule } from './paystack/paystack.module';
import { SmipayModule } from './smipay/smipay.module';
import { DvaProviderFactory } from './dva-providers/dva-provider.factory';
import { BankProviderFactory } from './bank-providers/bank-provider.factory';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [PaystackModule, SmipayModule, PrismaModule, CommonModule],
  providers: [BankingService, DvaProviderFactory, BankProviderFactory],
  controllers: [BankingController],
  exports: [BankingService, DvaProviderFactory, BankProviderFactory],
})
export class BankingModule {}

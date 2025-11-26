import { Module } from '@nestjs/common';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { PaystackModule } from './paystack/paystack.module';
import { SmipayModule } from './smipay/smipay.module';
import { DvaProviderFactory } from './dva-providers/dva-provider.factory';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PaystackModule, SmipayModule, PrismaModule],
  providers: [BankingService, DvaProviderFactory],
  controllers: [BankingController],
  exports: [BankingService, DvaProviderFactory],
})
export class BankingModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { FlutterwaveModule } from 'src/flutterwave/flutterwave.module';
import { BankingModule } from 'src/banking/banking.module';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';
import { BankingService } from 'src/banking/banking.service';
import { FlutterwaveController } from 'src/flutterwave/flutterwave.controller';
import { BankingController } from 'src/banking/banking.controller';

@Module({
  imports: [ConfigModule, FlutterwaveModule, BankingModule],
  controllers: [WebhooksController, FlutterwaveController, BankingController],
  providers: [WebhooksService, FlutterwaveService, BankingService],
})
export class WebhooksModule {}

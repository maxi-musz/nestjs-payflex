import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { BankingModule } from './banking/banking.module';
import { TransactionHistoryModule } from './transaction-history/transaction-history.module';
import { VtuModule } from './vtu/vtu.module';
import { CronModule } from './cron/cron.module';
import { VirtualCardModule } from './virtual-card/virtual-card.module';
import { BridgeCardModule } from './bridge-card/bridge-card.module';
import { FlutterwaveModule } from './flutterwave/flutterwave.module';
import { VasModule } from './vas/vas.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { FlutterwaveService } from './flutterwave/flutterwave.service';
import { VtpassModule } from './vtpass/vtpass.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }), 
    AuthModule, 
    UserModule, 
    BookmarkModule, 
    PrismaModule, BankingModule, TransactionHistoryModule, VtuModule, CronModule, VirtualCardModule, BridgeCardModule, FlutterwaveModule, VasModule, WebhooksModule, VtpassModule
  ],
  controllers: [AuthController],
  providers: [AuthService, FlutterwaveService],
})
export class AppModule {}

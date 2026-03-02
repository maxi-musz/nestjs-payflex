import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BankingModule } from 'src/banking/banking.module';

@Module({
    imports: [
        PrismaModule,
        BankingModule,
    ],
    providers: [CronService],
})
export class CronModule {}

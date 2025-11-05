import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DataModule } from 'src/vtpass/data/data.module';
import { AirtimeModule } from 'src/vtpass/airtime/airtime.module';

@Module({
    imports: [
        PrismaModule,
        DataModule,
        AirtimeModule,
    ],
    providers: [CronService],
})
export class CronModule {}

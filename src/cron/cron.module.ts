import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DataModule } from 'src/utility-services/vtpass-service/data/data.module';
import { AirtimeModule } from 'src/utility-services/vtpass-service/airtime/airtime.module';

@Module({
    imports: [
        PrismaModule,
        DataModule,
        AirtimeModule,
    ],
    providers: [CronService],
})
export class CronModule {}

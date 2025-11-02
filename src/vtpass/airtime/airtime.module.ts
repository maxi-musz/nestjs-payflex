import { Module } from '@nestjs/common';
import { AirtimeService } from './airtime.service';
import { AirtimeController } from './airtime.controller';

@Module({
  providers: [AirtimeService],
  controllers: [AirtimeController]
})
export class AirtimeModule {}


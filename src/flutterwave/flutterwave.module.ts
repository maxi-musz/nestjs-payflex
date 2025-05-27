import { Module } from '@nestjs/common';
import { FlutterwaveService } from './flutterwave.service';
import { FlutterwaveController } from './flutterwave.controller';

@Module({
  providers: [FlutterwaveService],
  controllers: [FlutterwaveController],
  exports: [FlutterwaveService],
})
export class FlutterwaveModule {}

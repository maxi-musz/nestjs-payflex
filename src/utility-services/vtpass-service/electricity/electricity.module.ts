import { Module } from '@nestjs/common';
import { ElectricityService } from './electricity.service';
import { ElectricityController } from './electricity.controller';

@Module({
  providers: [ElectricityService],
  controllers: [ElectricityController]
})
export class ElectricityModule {}


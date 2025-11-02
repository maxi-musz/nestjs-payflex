import { Module } from '@nestjs/common';
import { CableService } from './cable.service';
import { CableController } from './cable.controller';

@Module({
  providers: [CableService],
  controllers: [CableController]
})
export class CableModule {}


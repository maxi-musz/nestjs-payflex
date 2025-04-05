import { Module } from '@nestjs/common';
import { VirtualCardService } from './virtual-card.service';
import { VirtualCardController } from './virtual-card.controller';

@Module({
  providers: [VirtualCardService],
  controllers: [VirtualCardController]
})
export class VirtualCardModule {}

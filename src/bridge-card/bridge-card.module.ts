import { Module } from '@nestjs/common';
import { BridgeCardService } from './bridge-card.service';
import { BridgeCardController } from './bridge-card.controller';

@Module({
  providers: [BridgeCardService],
  controllers: [BridgeCardController]
})
export class BridgeCardModule {}

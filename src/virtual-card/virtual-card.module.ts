import { Module } from '@nestjs/common';
import { BridgeCardService } from './virtual-card.service';
import { BridgeCardController } from './virtual-card.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule, // ✅ Include HttpModule here
    ConfigModule,
  ],
  providers: [BridgeCardService],
  controllers: [BridgeCardController]
})
export class VirtualCardModule {}

import { Module } from '@nestjs/common';
import { VasController } from './vas.controller';
import { VasService } from './vas.service';

@Module({
  controllers: [VasController],
  providers: [VasService]
})
export class VasModule {}

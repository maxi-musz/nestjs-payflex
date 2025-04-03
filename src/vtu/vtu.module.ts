import { Module } from '@nestjs/common';
import { VtuService } from './vtu.service';
import { VtuController } from './vtu.controller';

@Module({
  providers: [VtuService],
  controllers: [VtuController]
})
export class VtuModule {}

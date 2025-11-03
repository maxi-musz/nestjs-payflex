import { Module } from '@nestjs/common';
import { SmipayService } from './smipay.service';
import { SmipayController } from './smipay.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SmipayService],
  controllers: [SmipayController],
  exports: [SmipayService],
})
export class SmipayModule {}


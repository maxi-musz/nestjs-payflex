import { Module } from '@nestjs/common';
import { SagecloudAirtimeController } from './airtime.controller';
import { SagecloudAirtimeService } from './airtime.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SagecloudAirtimeController],
  providers: [SagecloudAirtimeService],
  exports: [SagecloudAirtimeService],
})
export class SagecloudAirtimeModule {}


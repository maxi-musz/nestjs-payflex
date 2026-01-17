import { Module } from '@nestjs/common';
import { SagecloudDataController } from './data.controller';
import { SagecloudDataService } from './data.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SagecloudDataController],
  providers: [SagecloudDataService],
  exports: [SagecloudDataService],
})
export class SagecloudDataModule {}


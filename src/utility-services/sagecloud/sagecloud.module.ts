import { Module } from '@nestjs/common';
import { SagecloudAirtimeModule } from './airtime/airtime.module';
import { SagecloudDataModule } from './data/data.module';

@Module({
  imports: [
    SagecloudAirtimeModule,
    SagecloudDataModule,
  ],
  exports: [
    SagecloudAirtimeModule,
    SagecloudDataModule,
  ]
})
export class SagecloudModule {}


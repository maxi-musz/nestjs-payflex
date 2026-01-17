import { Module } from '@nestjs/common';
import { VtpassModule } from './vtpass-service/vtpass.module';
import { SagecloudModule } from './sagecloud/sagecloud.module';

@Module({
  imports: [
    VtpassModule,
    SagecloudModule,
  ],
  exports: [
    VtpassModule,
    SagecloudModule,
  ]
})
export class UtilityServicesModule {}


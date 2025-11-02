import { Module } from '@nestjs/common';
import { AirtimeModule } from './airtime/airtime.module';
import { DataModule } from './data/data.module';
import { ElectricityModule } from './electricity/electricity.module';
import { CableModule } from './cable/cable.module';
import { EducationModule } from './education/education.module';
import { InsuranceModule } from './insurance/insurance.module';

@Module({
  imports: [
    AirtimeModule,
    DataModule,
    ElectricityModule,
    CableModule,
    EducationModule,
    InsuranceModule
  ],
  exports: [
    AirtimeModule,
    DataModule,
    ElectricityModule,
    CableModule,
    EducationModule,
    InsuranceModule
  ]
})
export class VtpassModule {}


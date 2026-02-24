import { Module } from '@nestjs/common';
import { AdminSupportController } from './admin-support.controller';
import { AdminSupportService } from './admin-support.service';
import { SupportModule } from '../../../support/support.module';

@Module({
  imports: [SupportModule],
  controllers: [AdminSupportController],
  providers: [AdminSupportService],
  exports: [AdminSupportService],
})
export class AdminSupportModule {}

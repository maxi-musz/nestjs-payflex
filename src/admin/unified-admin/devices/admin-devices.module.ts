import { Module } from '@nestjs/common';
import { AdminDevicesController } from './admin-devices.controller';
import { AdminDevicesService } from './admin-devices.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditLogModule } from 'src/common/audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [AdminDevicesController],
  providers: [AdminDevicesService],
  exports: [AdminDevicesService],
})
export class AdminDevicesModule {}

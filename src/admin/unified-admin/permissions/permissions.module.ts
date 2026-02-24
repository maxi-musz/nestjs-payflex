import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditLogModule } from '../../../common/audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService], // Export so other modules can use hasPermission()
})
export class PermissionsModule {}

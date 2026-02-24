import { Module } from '@nestjs/common';
import { AdminAuditLogsController } from './admin-audit-logs.controller';

@Module({
  controllers: [AdminAuditLogsController],
})
export class AdminAuditLogsModule {}

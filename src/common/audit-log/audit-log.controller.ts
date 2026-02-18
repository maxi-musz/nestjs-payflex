import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto, FlagAuditLogDto, ReviewAuditLogDto } from './dto/query-audit-log.dto';
import { AuditAction, AuditStatus } from '@prisma/client';

@UseGuards(AuthGuard('jwt'))
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * GET /api/v1/audit-logs
   * Query audit logs with filters and pagination.
   */
  @Get()
  async queryLogs(@Query() query: QueryAuditLogDto, @Req() req: any) {
    await this.auditLogService.logAdmin(
      AuditAction.AUDIT_LOG_VIEW,
      AuditStatus.SUCCESS,
      req.user.id,
      req,
      { description: 'Admin queried audit logs' },
    );

    return this.auditLogService.query({
      ...query,
      date_from: query.date_from ? new Date(query.date_from) : undefined,
      date_to: query.date_to ? new Date(query.date_to) : undefined,
    });
  }

  /**
   * GET /api/v1/audit-logs/stats
   * Get audit log summary statistics.
   */
  @Get('stats')
  async getStats(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.auditLogService.getStats(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  /**
   * GET /api/v1/audit-logs/flagged
   * Get all flagged audit logs pending review.
   */
  @Get('flagged')
  async getFlaggedLogs(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.getFlaggedLogs({
      ...query,
      date_from: query.date_from ? new Date(query.date_from) : undefined,
      date_to: query.date_to ? new Date(query.date_to) : undefined,
    });
  }

  /**
   * GET /api/v1/audit-logs/user/:userId
   * Get all audit logs for a specific user.
   */
  @Get('user/:userId')
  async getUserLogs(@Param('userId') userId: string, @Query() query: QueryAuditLogDto) {
    return this.auditLogService.getUserLogs(userId, {
      ...query,
      date_from: query.date_from ? new Date(query.date_from) : undefined,
      date_to: query.date_to ? new Date(query.date_to) : undefined,
    });
  }

  /**
   * GET /api/v1/audit-logs/:id
   * Get a single audit log entry by ID.
   */
  @Get(':id')
  async getLogById(@Param('id') id: string) {
    return this.auditLogService.findById(id);
  }

  /**
   * POST /api/v1/audit-logs/:id/flag
   * Flag an audit log entry for compliance review.
   */
  @Post(':id/flag')
  @HttpCode(HttpStatus.OK)
  async flagLog(
    @Param('id') id: string,
    @Body() body: FlagAuditLogDto,
    @Req() req: any,
  ) {
    const result = await this.auditLogService.flag(id, body.reason, req.user.id);

    await this.auditLogService.logAdmin(
      AuditAction.AUDIT_LOG_FLAG,
      AuditStatus.SUCCESS,
      req.user.id,
      req,
      {
        resource_type: 'AuditLog',
        resource_id: id,
        description: `Flagged audit log: ${body.reason}`,
      },
    );

    return result;
  }

  /**
   * POST /api/v1/audit-logs/:id/review
   * Review a flagged audit log entry.
   */
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async reviewLog(
    @Param('id') id: string,
    @Body() body: ReviewAuditLogDto,
    @Req() req: any,
  ) {
    const result = await this.auditLogService.review(
      id,
      req.user.id,
      body.review_notes,
      body.resolve,
    );

    await this.auditLogService.logAdmin(
      AuditAction.AUDIT_LOG_REVIEW,
      AuditStatus.SUCCESS,
      req.user.id,
      req,
      {
        resource_type: 'AuditLog',
        resource_id: id,
        description: `Reviewed audit log — ${body.resolve ? 'resolved' : 'noted'}`,
      },
    );

    return result;
  }
}

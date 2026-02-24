import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../common/audit-log/audit-log.service';
import { StatsService } from '../../../common/stats/stats.service';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import {
  UpdateTicketStatusDto,
  AssignTicketDto,
  UpdateTicketPriorityDto,
  AdminReplyDto,
} from './dto/update-ticket.dto';
import { AuditAction, AuditStatus, Prisma } from '@prisma/client';
import { SupportGateway } from '../../../support/gateway/support.gateway';

const TICKET_LIST_SELECT = {
  id: true,
  ticket_number: true,
  user_id: true,
  phone_number: true,
  email: true,
  subject: true,
  support_type: true,
  status: true,
  priority: true,
  assigned_to: true,
  first_response_at: true,
  last_response_at: true,
  response_time_seconds: true,
  resolved_at: true,
  satisfaction_rating: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone_number: true,
      smipay_tag: true,
      profile_image: { select: { secure_url: true } },
    },
  },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketSelect;

const TICKET_DETAIL_SELECT = {
  id: true,
  ticket_number: true,
  user_id: true,
  phone_number: true,
  email: true,
  subject: true,
  description: true,
  support_type: true,
  status: true,
  priority: true,
  assigned_to: true,
  resolved_at: true,
  resolved_by: true,
  resolution_notes: true,
  related_transaction_id: true,
  related_registration_progress_id: true,
  device_metadata: true,
  ip_address: true,
  user_agent: true,
  tags: true,
  internal_notes: true,
  attachments: true,
  first_response_at: true,
  last_response_at: true,
  response_time_seconds: true,
  satisfaction_rating: true,
  feedback: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone_number: true,
      smipay_tag: true,
      account_status: true,
      role: true,
      profile_image: { select: { secure_url: true } },
      wallet: { select: { current_balance: true } },
      tier: { select: { tier: true, name: true } },
      kyc_verification: { select: { is_verified: true, status: true } },
    },
  },
  messages: {
    select: {
      id: true,
      message: true,
      is_internal: true,
      is_from_user: true,
      user_id: true,
      sender_name: true,
      sender_email: true,
      attachments: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.SupportTicketSelect;

@Injectable()
export class AdminSupportService {
  private readonly logger = new Logger(AdminSupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly stats: StatsService,
    private readonly gateway: SupportGateway,
  ) {}

  // ──────────────────────────────────────────────────────────
  // LIST — Paginated, filterable, searchable + analytics
  // ──────────────────────────────────────────────────────────

  async listTickets(query: QueryTicketsDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);

    const sortableFields = ['createdAt', 'updatedAt', 'priority', 'status', 'support_type'];
    const sortBy = sortableFields.includes(query.sort_by || '') ? query.sort_by! : 'createdAt';
    const sortOrder = query.sort_order === 'asc' ? 'asc' : 'desc';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(todayStart);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      tickets,
      total,
      totalAll,
      byStatus,
      byPriority,
      byType,
      newToday,
      newThisWeek,
      newThisMonth,
      unassigned,
      avgResponseTime,
      avgSatisfaction,
    ] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        select: TICKET_LIST_SELECT,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.groupBy({ by: ['status'], _count: true }),
      this.prisma.supportTicket.groupBy({ by: ['priority'], _count: true }),
      this.prisma.supportTicket.groupBy({ by: ['support_type'], _count: true }),
      this.prisma.supportTicket.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.supportTicket.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.supportTicket.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.supportTicket.count({ where: { assigned_to: null, status: { in: ['pending', 'in_progress', 'escalated'] } } }),
      this.prisma.supportTicket.aggregate({
        _avg: { response_time_seconds: true },
        where: { response_time_seconds: { not: null } },
      }),
      this.prisma.supportTicket.aggregate({
        _avg: { satisfaction_rating: true },
        _count: { satisfaction_rating: true },
        where: { satisfaction_rating: { not: null } },
      }),
    ]);

    // Resolve assigned admin names in batch
    const assignedIds = [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))] as string[];
    const assignedAdmins = assignedIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: assignedIds } },
          select: { id: true, first_name: true, last_name: true, email: true },
        })
      : [];
    const adminMap = new Map(assignedAdmins.map((a) => [a.id, a]));

    const enrichedTickets = tickets.map((ticket) => ({
      ...ticket,
      message_count: ticket._count.messages,
      _count: undefined,
      assigned_admin: ticket.assigned_to ? adminMap.get(ticket.assigned_to) ?? null : null,
    }));

    const toMap = (items: any[], key: string) => {
      const result: Record<string, number> = {};
      for (const item of items) result[item[key]] = item._count;
      return result;
    };

    const statusCounts = toMap(byStatus, 'status');

    return new ApiResponseDto(true, 'Tickets fetched', {
      analytics: {
        overview: {
          total_tickets: totalAll,
          open: (statusCounts['pending'] ?? 0) + (statusCounts['in_progress'] ?? 0) + (statusCounts['escalated'] ?? 0),
          pending: statusCounts['pending'] ?? 0,
          in_progress: statusCounts['in_progress'] ?? 0,
          escalated: statusCounts['escalated'] ?? 0,
          waiting_user: statusCounts['waiting_user'] ?? 0,
          resolved: statusCounts['resolved'] ?? 0,
          closed: statusCounts['closed'] ?? 0,
          unassigned,
        },
        activity: {
          new_today: newToday,
          new_this_week: newThisWeek,
          new_this_month: newThisMonth,
        },
        performance: {
          avg_response_time_seconds: avgResponseTime._avg.response_time_seconds ?? null,
          avg_satisfaction_rating: avgSatisfaction._avg.satisfaction_rating
            ? Math.round(avgSatisfaction._avg.satisfaction_rating * 10) / 10
            : null,
          total_rated: avgSatisfaction._count.satisfaction_rating,
        },
        by_status: statusCounts,
        by_priority: toMap(byPriority, 'priority'),
        by_type: toMap(byType, 'support_type'),
      },
      tickets: enrichedTickets,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // DETAIL — Full ticket with messages
  // ──────────────────────────────────────────────────────────

  async getTicketById(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: TICKET_DETAIL_SELECT,
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    // Resolve assigned admin
    let assigned_admin: Record<string, any> | null = null;
    if (ticket.assigned_to) {
      assigned_admin = await this.prisma.user.findUnique({
        where: { id: ticket.assigned_to },
        select: { id: true, first_name: true, last_name: true, email: true },
      });
    }

    // Resolve who resolved it
    let resolved_by_admin: Record<string, any> | null = null;
    if (ticket.resolved_by) {
      resolved_by_admin = await this.prisma.user.findUnique({
        where: { id: ticket.resolved_by },
        select: { id: true, first_name: true, last_name: true, email: true },
      });
    }

    // If there's a related transaction, fetch summary
    let related_transaction: Record<string, any> | null = null;
    if (ticket.related_transaction_id) {
      related_transaction = await this.prisma.transactionHistory.findUnique({
        where: { id: ticket.related_transaction_id },
        select: {
          id: true,
          amount: true,
          transaction_type: true,
          status: true,
          transaction_reference: true,
          createdAt: true,
        },
      });
    }

    return new ApiResponseDto(true, 'Ticket fetched', {
      ...ticket,
      assigned_admin,
      resolved_by_admin,
      related_transaction,
    });
  }

  // ──────────────────────────────────────────────────────────
  // REPLY — Admin replies to ticket
  // ──────────────────────────────────────────────────────────

  async replyToTicket(ticketId: string, dto: AdminReplyDto, adminUser: any, req: any) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticket_number: true, status: true, first_response_at: true, createdAt: true, email: true, user_id: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const admin = await this.prisma.user.findUnique({
      where: { id: adminUser.sub },
      select: { first_name: true, last_name: true, email: true },
    });

    const adminName = admin ? `${admin.first_name ?? ''} ${admin.last_name ?? ''}`.trim() : 'Admin';

    const message = await this.prisma.supportMessage.create({
      data: {
        ticket_id: ticketId,
        message: dto.message,
        is_from_user: false,
        is_internal: dto.is_internal ?? false,
        user_id: adminUser.sub,
        sender_name: adminName,
        sender_email: admin?.email,
      },
    });

    // Update ticket response tracking
    const updateData: Prisma.SupportTicketUpdateInput = {
      last_response_at: new Date(),
    };

    if (!ticket.first_response_at) {
      updateData.first_response_at = new Date();
      const responseSeconds = Math.floor(
        (Date.now() - ticket.createdAt.getTime()) / 1000,
      );
      updateData.response_time_seconds = responseSeconds;
    }

    // Auto-set status to in_progress if still pending
    if (ticket.status === 'pending' && !dto.is_internal) {
      updateData.status = 'in_progress';
      this.stats.onTicketStatusChanged('pending', 'in_progress');
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_MESSAGE_ADD,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin replied to ticket ${ticket.ticket_number}${dto.is_internal ? ' (internal note)' : ''}`,
        resource_type: 'SupportTicket',
        resource_id: ticketId,
        metadata: { is_internal: dto.is_internal ?? false },
      },
    );

    const replyPayload = {
      id: message.id,
      message: message.message,
      is_internal: message.is_internal,
      is_from_user: false,
      sender_name: adminName,
      createdAt: message.createdAt,
    };

    if (!message.is_internal) {
      this.gateway.emitNewMessage(ticketId, ticket.user_id, replyPayload);
    }

    return new ApiResponseDto(true, 'Reply sent', replyPayload);
  }

  // ──────────────────────────────────────────────────────────
  // UPDATE STATUS — Change ticket status
  // ──────────────────────────────────────────────────────────

  async updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto, adminUser: any, req: any) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticket_number: true, status: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const oldStatus = ticket.status;
    const updateData: Prisma.SupportTicketUpdateInput = {
      status: dto.status,
    };

    if (dto.status === 'resolved' || dto.status === 'closed') {
      updateData.resolved_at = new Date();
      updateData.resolved_by = adminUser.sub;
      if (dto.resolution_notes) updateData.resolution_notes = dto.resolution_notes;
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      select: { ...TICKET_LIST_SELECT, user_id: true },
    });

    this.stats.onTicketStatusChanged(oldStatus, dto.status);

    this.gateway.emitTicketStatusChanged(ticketId, updated.user_id, {
      old_status: oldStatus,
      new_status: dto.status,
      ticket_number: ticket.ticket_number,
      resolution_notes: dto.resolution_notes,
    });

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_TICKET_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin changed ticket ${ticket.ticket_number} status from ${oldStatus} to ${dto.status}`,
        resource_type: 'SupportTicket',
        resource_id: ticketId,
        old_values: { status: oldStatus },
        new_values: { status: dto.status },
        metadata: { resolution_notes: dto.resolution_notes },
      },
    );

    return new ApiResponseDto(true, `Ticket ${dto.status}`, updated);
  }

  // ──────────────────────────────────────────────────────────
  // ASSIGN — Assign ticket to admin
  // ──────────────────────────────────────────────────────────

  async assignTicket(ticketId: string, dto: AssignTicketDto, adminUser: any, req: any) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticket_number: true, assigned_to: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assigned_to },
      select: { id: true, first_name: true, last_name: true, email: true },
    });

    if (!assignee) throw new NotFoundException('Assignee not found');

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assigned_to: dto.assigned_to },
      select: TICKET_LIST_SELECT,
    });

    this.gateway.emitTicketAssigned(ticketId, {
      ticket_number: ticket.ticket_number,
      assigned_to: dto.assigned_to,
      assigned_admin_name: `${assignee.first_name} ${assignee.last_name}`.trim(),
    });

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_TICKET_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin assigned ticket ${ticket.ticket_number} to ${assignee.first_name} ${assignee.last_name}`,
        resource_type: 'SupportTicket',
        resource_id: ticketId,
        old_values: { assigned_to: ticket.assigned_to },
        new_values: { assigned_to: dto.assigned_to },
      },
    );

    return new ApiResponseDto(true, 'Ticket assigned', updated);
  }

  // ──────────────────────────────────────────────────────────
  // PRIORITY — Change ticket priority
  // ──────────────────────────────────────────────────────────

  async updateTicketPriority(ticketId: string, dto: UpdateTicketPriorityDto, adminUser: any, req: any) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticket_number: true, priority: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const oldPriority = ticket.priority;

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { priority: dto.priority },
      select: TICKET_LIST_SELECT,
    });

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_TICKET_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin changed ticket ${ticket.ticket_number} priority from ${oldPriority} to ${dto.priority}`,
        resource_type: 'SupportTicket',
        resource_id: ticketId,
        old_values: { priority: oldPriority },
        new_values: { priority: dto.priority },
      },
    );

    return new ApiResponseDto(true, 'Priority updated', updated);
  }

  // ──────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────

  private buildWhereClause(query: QueryTicketsDto): Prisma.SupportTicketWhereInput {
    const where: Prisma.SupportTicketWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { ticket_number: { contains: term, mode: 'insensitive' } },
        { subject: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone_number: { contains: term } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.support_type) where.support_type = query.support_type;
    if (query.assigned_to) where.assigned_to = query.assigned_to;
    if (query.user_id) where.user_id = query.user_id;

    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) where.createdAt.gte = new Date(query.date_from);
      if (query.date_to) where.createdAt.lte = new Date(query.date_to);
    }

    return where;
  }
}

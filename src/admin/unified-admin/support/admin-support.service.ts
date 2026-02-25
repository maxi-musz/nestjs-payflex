import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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
import {
  QueryConversationsDto,
  AdminReplyToConversationDto,
  CreateTicketFromConversationDto,
  InitiateHandoverDto,
  RespondToHandoverDto,
} from './dto/conversation.dto';
import { AuditAction, AuditStatus, Prisma } from '@prisma/client';
import { SupportGateway } from '../../../support/gateway/support.gateway';
import { generateTicketNumber } from '../../../common/helper_functions/generators';

// ──────────────────────────────────────────────────────────
// SELECT SHAPES
// ──────────────────────────────────────────────────────────

const CONVERSATION_LIST_SELECT = {
  id: true,
  user_id: true,
  email: true,
  phone_number: true,
  status: true,
  assigned_to: true,
  assigned_at: true,
  satisfaction_rating: true,
  last_message_at: true,
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
  ticket: {
    select: {
      id: true,
      ticket_number: true,
      subject: true,
      status: true,
      priority: true,
      support_type: true,
    },
  },
  _count: { select: { messages: true } },
  messages: {
    where: { is_internal: false } as any,
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      message: true,
      is_from_user: true,
      sender_name: true,
      createdAt: true,
    },
  },
} satisfies Prisma.SupportConversationSelect;

const CONVERSATION_DETAIL_SELECT = {
  id: true,
  user_id: true,
  email: true,
  phone_number: true,
  status: true,
  assigned_to: true,
  assigned_at: true,
  device_metadata: true,
  ip_address: true,
  user_agent: true,
  satisfaction_rating: true,
  feedback: true,
  last_message_at: true,
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
  ticket: {
    select: {
      id: true,
      ticket_number: true,
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
      createdAt: true,
    },
  },
  handovers: {
    select: {
      id: true,
      from_admin_id: true,
      to_admin_id: true,
      reason: true,
      status: true,
      responded_at: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.SupportConversationSelect;

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
  conversation_id: true,
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
  conversation_id: true,
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

  // ════════════════════════════════════════════════════════════
  //  CONVERSATIONS — Live Chat Management
  // ════════════════════════════════════════════════════════════

  async listConversations(query: QueryConversationsDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.SupportConversationWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { phone_number: { contains: term } },
        { user: { first_name: { contains: term, mode: 'insensitive' } } },
        { user: { last_name: { contains: term, mode: 'insensitive' } } },
        { user: { smipay_tag: { contains: term, mode: 'insensitive' } } },
        { messages: { some: { message: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.assigned_to) where.assigned_to = query.assigned_to;
    if (query.user_id) where.user_id = query.user_id;

    if (query.has_ticket === 'true') {
      where.ticket = { isNot: null };
    } else if (query.has_ticket === 'false') {
      where.ticket = null;
    }

    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) where.createdAt.gte = new Date(query.date_from);
      if (query.date_to) where.createdAt.lte = new Date(query.date_to);
    }

    const sortableFields = ['createdAt', 'updatedAt', 'last_message_at', 'status'];
    const sortBy = sortableFields.includes(query.sort_by || '') ? query.sort_by! : 'last_message_at';
    const sortOrder = query.sort_order === 'asc' ? 'asc' : 'desc';

    const [conversations, total, totalAll, byStatus, unassigned, activeCount] = await Promise.all([
      this.prisma.supportConversation.findMany({
        where,
        select: CONVERSATION_LIST_SELECT,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.supportConversation.count({ where }),
      this.prisma.supportConversation.count(),
      this.prisma.supportConversation.groupBy({ by: ['status'], _count: true }),
      this.prisma.supportConversation.count({
        where: { assigned_to: null, status: { in: ['active', 'waiting_support'] } },
      }),
      this.prisma.supportConversation.count({
        where: { status: { in: ['active', 'waiting_support', 'waiting_user'] } },
      }),
    ]);

    // Resolve assigned admin names
    const adminIds = [...new Set(conversations.map(c => c.assigned_to).filter(Boolean))] as string[];
    const admins = adminIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, first_name: true, last_name: true, email: true },
        })
      : [];
    const adminMap = new Map(admins.map(a => [a.id, a]));

    const toMap = (items: any[], key: string) => {
      const result: Record<string, number> = {};
      for (const item of items) result[item[key]] = item._count;
      return result;
    };

    const statusCounts = toMap(byStatus, 'status');

    const enriched = conversations.map(c => ({
      ...c,
      message_count: c._count.messages,
      last_message: c.messages[0] ?? null,
      has_unread: c.messages[0] ? c.messages[0].is_from_user : false,
      _count: undefined,
      messages: undefined,
      assigned_admin: c.assigned_to ? adminMap.get(c.assigned_to) ?? null : null,
    }));

    return new ApiResponseDto(true, 'Conversations fetched', {
      analytics: {
        total_conversations: totalAll,
        active: activeCount,
        unassigned,
        by_status: statusCounts,
      },
      conversations: enriched,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  }

  async getConversationById(conversationId: string) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: CONVERSATION_DETAIL_SELECT,
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    let assigned_admin: Record<string, any> | null = null;
    if (conversation.assigned_to) {
      assigned_admin = await this.prisma.user.findUnique({
        where: { id: conversation.assigned_to },
        select: { id: true, first_name: true, last_name: true, email: true },
      });
    }

    // Resolve admin names in handovers
    const allAdminIds = [
      ...new Set(conversation.handovers.flatMap(h => [h.from_admin_id, h.to_admin_id])),
    ];
    const handoverAdmins = allAdminIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: allAdminIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];
    const handoverAdminMap = new Map(
      handoverAdmins.map(a => [a.id, `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()]),
    );

    const enrichedHandovers = conversation.handovers.map(h => ({
      ...h,
      from_admin_name: handoverAdminMap.get(h.from_admin_id) ?? null,
      to_admin_name: handoverAdminMap.get(h.to_admin_id) ?? null,
    }));

    return new ApiResponseDto(true, 'Conversation fetched', {
      ...conversation,
      assigned_admin,
      handovers: enrichedHandovers,
    });
  }

  // ──────────────────────────────────────────────────────────
  // CLAIM — Admin takes ownership of a conversation
  // ──────────────────────────────────────────────────────────

  async claimConversation(conversationId: string, adminUser: any, req: any) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, assigned_to: true, user_id: true, status: true },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    if (conversation.assigned_to && conversation.assigned_to !== adminUser.sub) {
      throw new BadRequestException(
        'This conversation is already assigned to another support agent. Use the handover flow to request a transfer.',
      );
    }

    if (conversation.status === 'closed') {
      throw new BadRequestException('Cannot claim a closed conversation');
    }

    const admin = await this.prisma.user.findUnique({
      where: { id: adminUser.sub },
      select: { first_name: true, last_name: true, email: true },
    });
    const adminName = admin ? `${admin.first_name ?? ''} ${admin.last_name ?? ''}`.trim() : 'Admin';

    await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        assigned_to: adminUser.sub,
        assigned_at: new Date(),
      },
    });

    this.gateway.emitConversationClaimed(
      conversationId,
      conversation.user_id,
      adminName,
      adminUser.sub,
    );

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_TICKET_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin claimed conversation ${conversationId}`,
        resource_type: 'SupportConversation',
        resource_id: conversationId,
      },
    );

    return new ApiResponseDto(true, 'Conversation claimed', {
      conversation_id: conversationId,
      assigned_to: adminUser.sub,
      assigned_admin_name: adminName,
    });
  }

  // ──────────────────────────────────────────────────────────
  // REPLY — Admin sends a message in a conversation
  // ──────────────────────────────────────────────────────────

  async replyToConversation(
    conversationId: string,
    dto: AdminReplyToConversationDto,
    adminUser: any,
    req: any,
  ) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        user_id: true,
        status: true,
        assigned_to: true,
        ticket: { select: { id: true } },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    if (conversation.status === 'closed') {
      throw new BadRequestException('Cannot reply to a closed conversation');
    }

    // Enforce exclusive ownership: only the assigned admin can reply
    if (conversation.assigned_to && conversation.assigned_to !== adminUser.sub) {
      throw new ForbiddenException(
        'This conversation is assigned to another support agent. Request a handover to take it over.',
      );
    }

    // Auto-claim if not yet assigned
    if (!conversation.assigned_to) {
      await this.prisma.supportConversation.update({
        where: { id: conversationId },
        data: { assigned_to: adminUser.sub, assigned_at: new Date() },
      });
    }

    const admin = await this.prisma.user.findUnique({
      where: { id: adminUser.sub },
      select: { first_name: true, last_name: true, email: true },
    });
    const adminName = admin ? `${admin.first_name ?? ''} ${admin.last_name ?? ''}`.trim() : 'Admin';

    const message = await this.prisma.supportMessage.create({
      data: {
        conversation_id: conversationId,
        ticket_id: conversation.ticket?.id ?? undefined,
        message: dto.message,
        is_from_user: false,
        is_internal: dto.is_internal ?? false,
        user_id: adminUser.sub,
        sender_name: adminName,
        sender_email: admin?.email,
      },
    });

    // Update conversation timestamps + status
    await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        last_message_at: new Date(),
        status: dto.is_internal ? undefined : 'waiting_user',
      },
    });

    const replyPayload = {
      id: message.id,
      message: message.message,
      is_internal: message.is_internal,
      is_from_user: false,
      sender_name: adminName,
      sender_email: admin?.email,
      createdAt: message.createdAt,
    };

    if (!message.is_internal) {
      this.gateway.emitNewConversationMessage(
        conversationId,
        conversation.user_id,
        replyPayload,
      );
    }

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_MESSAGE_ADD,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin replied in conversation ${conversationId}${dto.is_internal ? ' (internal note)' : ''}`,
        resource_type: 'SupportConversation',
        resource_id: conversationId,
        metadata: { is_internal: dto.is_internal ?? false },
      },
    );

    return new ApiResponseDto(true, 'Reply sent', replyPayload);
  }

  // ──────────────────────────────────────────────────────────
  // CREATE TICKET — From an existing conversation
  // ──────────────────────────────────────────────────────────

  async createTicketFromConversation(
    conversationId: string,
    dto: CreateTicketFromConversationDto,
    adminUser: any,
    req: any,
  ) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        user_id: true,
        email: true,
        phone_number: true,
        assigned_to: true,
        device_metadata: true,
        ip_address: true,
        user_agent: true,
        ticket: { select: { id: true, ticket_number: true } },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.ticket) {
      throw new BadRequestException(
        `This conversation already has ticket ${conversation.ticket.ticket_number}`,
      );
    }

    const ticketNumber = await generateTicketNumber(this.prisma);

    const supportType = dto.support_type ?? 'GENERAL_INQUIRY';
    const priority = dto.priority ?? 'medium';

    let relatedTransactionId: string | null = null;
    if (dto.related_transaction_id) {
      const tx = await this.prisma.transactionHistory.findUnique({
        where: { id: dto.related_transaction_id },
        select: { id: true },
      });
      if (tx) relatedTransactionId = tx.id;
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticket_number: ticketNumber,
        conversation_id: conversationId,
        user_id: conversation.user_id,
        email: conversation.email,
        phone_number: conversation.phone_number,
        subject: dto.subject,
        description: dto.description,
        support_type: supportType,
        priority: priority,
        status: 'in_progress',
        assigned_to: conversation.assigned_to,
        related_transaction_id: relatedTransactionId,
        device_metadata: conversation.device_metadata ?? Prisma.DbNull,
        ip_address: conversation.ip_address,
        user_agent: conversation.user_agent,
        first_response_at: new Date(),
      },
    });

    // Link existing conversation messages to the ticket
    await this.prisma.supportMessage.updateMany({
      where: { conversation_id: conversationId, ticket_id: null },
      data: { ticket_id: ticket.id },
    });

    this.stats.onTicketCreated('in_progress');

    this.gateway.emitTicketCreatedFromConversation(
      conversationId,
      conversation.user_id,
      ticket,
    );

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_TICKET_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin created ticket ${ticketNumber} from conversation ${conversationId}`,
        resource_type: 'SupportTicket',
        resource_id: ticket.id,
        metadata: { conversation_id: conversationId },
      },
    );

    return new ApiResponseDto(true, 'Ticket created from conversation', {
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        support_type: ticket.support_type,
        priority: ticket.priority,
        status: ticket.status,
        conversation_id: conversationId,
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // CLOSE CONVERSATION
  // ──────────────────────────────────────────────────────────

  async closeConversation(conversationId: string, adminUser: any, req: any) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, user_id: true, status: true, assigned_to: true },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.status === 'closed') {
      throw new BadRequestException('Conversation is already closed');
    }

    await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: { status: 'closed' },
    });

    this.gateway.emitConversationClosed(conversationId, conversation.user_id);

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_TICKET_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin closed conversation ${conversationId}`,
        resource_type: 'SupportConversation',
        resource_id: conversationId,
      },
    );

    return new ApiResponseDto(true, 'Conversation closed', { conversation_id: conversationId });
  }

  // ──────────────────────────────────────────────────────────
  // HANDOVER — Transfer conversation to another agent
  // ──────────────────────────────────────────────────────────

  async initiateHandover(
    conversationId: string,
    dto: InitiateHandoverDto,
    adminUser: any,
    req: any,
  ) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, assigned_to: true, user_id: true, status: true },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.status === 'closed') {
      throw new BadRequestException('Cannot transfer a closed conversation');
    }
    if (conversation.assigned_to !== adminUser.sub) {
      throw new ForbiddenException('Only the currently assigned agent can initiate a handover');
    }
    if (dto.to_admin_id === adminUser.sub) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Verify target admin exists and is an admin
    const targetAdmin = await this.prisma.user.findUnique({
      where: { id: dto.to_admin_id },
      select: { id: true, role: true, first_name: true, last_name: true },
    });
    if (!targetAdmin || targetAdmin.role !== 'admin') {
      throw new NotFoundException('Target admin not found');
    }

    // Check for existing pending handover
    const existingPending = await this.prisma.conversationHandover.findFirst({
      where: { conversation_id: conversationId, status: 'pending' },
    });
    if (existingPending) {
      throw new BadRequestException('There is already a pending handover for this conversation');
    }

    const handover = await this.prisma.conversationHandover.create({
      data: {
        conversation_id: conversationId,
        from_admin_id: adminUser.sub,
        to_admin_id: dto.to_admin_id,
        reason: dto.reason,
        status: 'pending',
      },
    });

    const fromAdmin = await this.prisma.user.findUnique({
      where: { id: adminUser.sub },
      select: { first_name: true, last_name: true },
    });
    const fromAdminName = fromAdmin
      ? `${fromAdmin.first_name ?? ''} ${fromAdmin.last_name ?? ''}`.trim()
      : 'Admin';

    this.gateway.emitHandoverRequested(conversationId, handover, fromAdminName);

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_TICKET_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin initiated handover of conversation ${conversationId} to ${targetAdmin.first_name} ${targetAdmin.last_name}`,
        resource_type: 'ConversationHandover',
        resource_id: handover.id,
        metadata: { to_admin_id: dto.to_admin_id, reason: dto.reason },
      },
    );

    return new ApiResponseDto(true, 'Handover requested', {
      handover_id: handover.id,
      conversation_id: conversationId,
      to_admin_id: dto.to_admin_id,
      to_admin_name: `${targetAdmin.first_name ?? ''} ${targetAdmin.last_name ?? ''}`.trim(),
      status: 'pending',
    });
  }

  async respondToHandover(
    handoverId: string,
    dto: RespondToHandoverDto,
    adminUser: any,
    req: any,
  ) {
    const handover = await this.prisma.conversationHandover.findUnique({
      where: { id: handoverId },
      select: {
        id: true,
        conversation_id: true,
        from_admin_id: true,
        to_admin_id: true,
        status: true,
        conversation: { select: { user_id: true } },
      },
    });

    if (!handover) throw new NotFoundException('Handover not found');
    if (handover.status !== 'pending') {
      throw new BadRequestException('This handover has already been resolved');
    }
    if (handover.to_admin_id !== adminUser.sub) {
      throw new ForbiddenException('Only the target admin can respond to this handover');
    }

    const accepted = dto.status === 'accepted';

    await this.prisma.conversationHandover.update({
      where: { id: handoverId },
      data: { status: dto.status, responded_at: new Date() },
    });

    if (accepted) {
      await this.prisma.supportConversation.update({
        where: { id: handover.conversation_id },
        data: {
          assigned_to: adminUser.sub,
          assigned_at: new Date(),
        },
      });
    }

    const newAdmin = await this.prisma.user.findUnique({
      where: { id: adminUser.sub },
      select: { first_name: true, last_name: true },
    });
    const newAdminName = newAdmin
      ? `${newAdmin.first_name ?? ''} ${newAdmin.last_name ?? ''}`.trim()
      : 'Admin';

    this.gateway.emitHandoverResolved(
      handover.conversation_id,
      handover.conversation.user_id,
      handover,
      newAdminName,
      accepted,
    );

    this.auditLogService.logAdmin(
      AuditAction.SUPPORT_TICKET_UPDATE,
      AuditStatus.SUCCESS,
      adminUser.sub,
      req,
      {
        description: `Admin ${accepted ? 'accepted' : 'rejected'} handover ${handoverId} for conversation ${handover.conversation_id}`,
        resource_type: 'ConversationHandover',
        resource_id: handoverId,
        metadata: { status: dto.status },
      },
    );

    return new ApiResponseDto(true, `Handover ${dto.status}`, {
      handover_id: handoverId,
      conversation_id: handover.conversation_id,
      status: dto.status,
    });
  }

  // ════════════════════════════════════════════════════════════
  //  TICKETS — Existing ticket management (kept as-is)
  // ════════════════════════════════════════════════════════════

  async listTickets(query: QueryTicketsDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where = this.buildTicketWhereClause(query);

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
      tickets, total, totalAll, byStatus, byPriority, byType,
      newToday, newThisWeek, newThisMonth, unassigned,
      avgResponseTime, avgSatisfaction,
    ] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where, select: TICKET_LIST_SELECT, skip, take: limit,
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

    const assignedIds = [...new Set(tickets.map(t => t.assigned_to).filter(Boolean))] as string[];
    const assignedAdmins = assignedIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: assignedIds } },
          select: { id: true, first_name: true, last_name: true, email: true },
        })
      : [];
    const adminMap = new Map(assignedAdmins.map(a => [a.id, a]));

    const enrichedTickets = tickets.map(ticket => ({
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
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  }

  async getTicketById(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: TICKET_DETAIL_SELECT,
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    let assigned_admin: Record<string, any> | null = null;
    if (ticket.assigned_to) {
      assigned_admin = await this.prisma.user.findUnique({
        where: { id: ticket.assigned_to },
        select: { id: true, first_name: true, last_name: true, email: true },
      });
    }

    let resolved_by_admin: Record<string, any> | null = null;
    if (ticket.resolved_by) {
      resolved_by_admin = await this.prisma.user.findUnique({
        where: { id: ticket.resolved_by },
        select: { id: true, first_name: true, last_name: true, email: true },
      });
    }

    let related_transaction: Record<string, any> | null = null;
    if (ticket.related_transaction_id) {
      related_transaction = await this.prisma.transactionHistory.findUnique({
        where: { id: ticket.related_transaction_id },
        select: {
          id: true, amount: true, transaction_type: true, status: true,
          transaction_reference: true, createdAt: true,
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

  async replyToTicket(ticketId: string, dto: AdminReplyDto, adminUser: any, req: any) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true, ticket_number: true, status: true, first_response_at: true,
        createdAt: true, email: true, user_id: true, conversation_id: true,
      },
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
        conversation_id: ticket.conversation_id ?? undefined,
        message: dto.message,
        is_from_user: false,
        is_internal: dto.is_internal ?? false,
        user_id: adminUser.sub,
        sender_name: adminName,
        sender_email: admin?.email,
      },
    });

    const updateData: Prisma.SupportTicketUpdateInput = {
      last_response_at: new Date(),
    };

    if (!ticket.first_response_at) {
      updateData.first_response_at = new Date();
      updateData.response_time_seconds = Math.floor(
        (Date.now() - ticket.createdAt.getTime()) / 1000,
      );
    }

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
      if (ticket.conversation_id) {
        this.gateway.emitNewConversationMessage(ticket.conversation_id, ticket.user_id, replyPayload);
      }
    }

    return new ApiResponseDto(true, 'Reply sent', replyPayload);
  }

  async updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto, adminUser: any, req: any) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticket_number: true, status: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const oldStatus = ticket.status;
    const updateData: Prisma.SupportTicketUpdateInput = { status: dto.status };

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

  private buildTicketWhereClause(query: QueryTicketsDto): Prisma.SupportTicketWhereInput {
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

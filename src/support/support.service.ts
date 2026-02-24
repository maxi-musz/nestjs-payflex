import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AddMessageToTicketDto } from './dto/add-message.dto';
import { generateTicketNumber } from 'src/common/helper_functions/generators';
import { EmailService } from 'src/common/mailer/email.service';
import { StatsService } from 'src/common/stats/stats.service';
import { SupportType, TicketPriority, Prisma } from '@prisma/client';
import { SupportGateway } from './gateway/support.gateway';
import * as colors from 'colors';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly stats: StatsService,
    private readonly gateway: SupportGateway,
  ) {}

  // ──────────────────────────────────────────────────────────
  // CREATE TICKET
  // ──────────────────────────────────────────────────────────

  async createSupportTicket(
    dto: CreateSupportTicketDto,
    headers: any,
    ipAddress: string,
    authenticatedUserId?: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(`Creating support ticket for ${dto.email} [${dto.support_type || 'auto-detect'}]`),
    );

    try {
      // If ticket_number provided, add message to existing ticket instead
      if (dto.ticket_number) {
        return this.addMessageToExistingTicket(dto, headers, ipAddress);
      }

      const registrationProgress = await this.resolveSession(dto.session_id);

      // Resolve user: JWT user ID first, then email lookup
      let existingUser = authenticatedUserId
        ? await this.prisma.user.findUnique({
            where: { id: authenticatedUserId },
            select: { id: true, email: true, first_name: true, last_name: true, phone_number: true },
          })
        : null;

      if (!existingUser && dto.email) {
        existingUser = await this.prisma.user.findFirst({
          where: { email: { equals: dto.email, mode: 'insensitive' } },
          select: { id: true, email: true, first_name: true, last_name: true, phone_number: true },
        });
      }
      const ticketNumber = await generateTicketNumber(this.prisma);
      const userAgent = this.extractUserAgent(headers);
      const deviceMetadata = this.extractDeviceMetadata(dto.device_metadata, headers, ipAddress);

      const supportType: SupportType = dto.support_type
        ?? (dto.session_id ? SupportType.REGISTRATION_ISSUE : SupportType.GENERAL_INQUIRY);
      const priority: TicketPriority = dto.priority ?? this.inferPriority(supportType);

      // Validate linked transaction if provided
      let relatedTransactionId: string | null = null;
      if (dto.related_transaction_id) {
        const tx = await this.prisma.transactionHistory.findUnique({
          where: { id: dto.related_transaction_id },
          select: { id: true },
        });
        if (tx) relatedTransactionId = tx.id;
      }

      const senderName = existingUser
        ? `${existingUser.first_name ?? ''} ${existingUser.last_name ?? ''}`.trim() || null
        : null;

      const supportTicket = await this.prisma.supportTicket.create({
        data: {
          ticket_number: ticketNumber,
          user_id: existingUser?.id ?? null,
          phone_number: existingUser?.phone_number ?? dto.phone_number ?? null,
          email: dto.email,
          subject: dto.subject,
          description: dto.description,
          support_type: supportType,
          status: 'pending',
          priority,
          related_registration_progress_id: registrationProgress?.id ?? null,
          related_transaction_id: relatedTransactionId,
          device_metadata: deviceMetadata ?? Prisma.DbNull,
          ip_address: ipAddress,
          user_agent: userAgent,
          messages: {
            create: {
              message: dto.description,
              is_from_user: true,
              is_internal: false,
              sender_email: dto.email,
              sender_name: senderName,
              user_id: existingUser?.id ?? null,
              ip_address: ipAddress,
              user_agent: userAgent,
            },
          },
        },
        include: {
          messages: {
            select: {
              id: true,
              message: true,
              is_from_user: true,
              sender_name: true,
              sender_email: true,
              attachments: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      this.logger.log(colors.magenta(`Ticket created: ${ticketNumber} [${supportType}/${priority}]`));
      this.stats.onTicketCreated('pending');
      this.gateway.emitTicketCreated(supportTicket);
      this.sendConfirmationEmail(dto.email, ticketNumber, dto.subject, dto.description, supportTicket.createdAt);

      return new ApiResponseDto(true, 'Support ticket created successfully', {
        ticket: this.formatTicketResponse(supportTicket),
        message: 'Your ticket has been created. Our team will review it and respond as soon as possible.',
      });
    } catch (error) {
      this.logger.error(colors.red(`Support ticket creation error: ${error.message}`), error.stack);
      if (error instanceof BadRequestException) throw error;
      throw new HttpException(
        error.message || 'Failed to create support ticket',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ──────────────────────────────────────────────────────────
  // GET USER TICKETS — All tickets for a specific user
  // ──────────────────────────────────────────────────────────

  async getUserTickets(userId: string): Promise<ApiResponseDto<any>> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { user_id: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticket_number: true,
        subject: true,
        support_type: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        last_response_at: true,
        _count: { select: { messages: { where: { is_internal: false } } } },
        messages: {
          where: { is_internal: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            message: true,
            is_from_user: true,
            createdAt: true,
          },
        },
      },
    });

    const formatted = tickets.map((t) => ({
      id: t.id,
      ticket_number: t.ticket_number,
      subject: t.subject,
      support_type: t.support_type,
      status: t.status,
      priority: t.priority,
      message_count: t._count.messages,
      last_message: t.messages[0] ?? null,
      has_unread: t.messages[0] ? !t.messages[0].is_from_user : false,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
      last_response_at: t.last_response_at,
    }));

    this.logger.debug(`getUserTickets: ${formatted.length} ticket(s) returned for user ${userId}`);

    return new ApiResponseDto(true, 'Tickets fetched', {
      tickets: formatted,
      total_tickets: formatted.length,
    });
  }

  // ──────────────────────────────────────────────────────────
  // GET TICKET BY NUMBER — Full conversation
  // ──────────────────────────────────────────────────────────

  async getTicketByNumber(ticketNumber: string): Promise<ApiResponseDto<any>> {
    this.logger.log(colors.cyan(`Retrieving ticket: ${ticketNumber}`));

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { ticket_number: ticketNumber },
      include: {
        messages: {
          where: { is_internal: false },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            message: true,
            is_from_user: true,
            sender_name: true,
            sender_email: true,
            attachments: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketNumber} not found`);
    }

    return new ApiResponseDto(true, 'Ticket retrieved', {
      ticket: this.formatTicketResponse(ticket),
    });
  }

  // ──────────────────────────────────────────────────────────
  // ADD MESSAGE — User sends a message to existing ticket
  // ──────────────────────────────────────────────────────────

  async addMessageToTicket(
    dto: AddMessageToTicketDto,
    headers: any,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(colors.cyan(`Adding message to ticket: ${dto.ticket_number}`));

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { ticket_number: dto.ticket_number },
      select: {
        id: true,
        ticket_number: true,
        email: true,
        user_id: true,
        status: true,
        user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${dto.ticket_number} not found`);
    }

    if (ticket.email && ticket.email.toLowerCase() !== dto.email.toLowerCase()) {
      throw new BadRequestException('Email does not match the ticket owner');
    }

    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      throw new BadRequestException('Cannot add messages to a closed or resolved ticket');
    }

    const userAgent = this.extractUserAgent(headers);
    const senderName = ticket.user
      ? `${ticket.user.first_name ?? ''} ${ticket.user.last_name ?? ''}`.trim() || null
      : null;

    const message = await this.prisma.supportMessage.create({
      data: {
        ticket_id: ticket.id,
        message: dto.message,
        is_from_user: true,
        is_internal: false,
        sender_email: dto.email,
        sender_name: senderName,
        user_id: ticket.user_id,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
      select: {
        id: true,
        message: true,
        is_from_user: true,
        sender_name: true,
        sender_email: true,
        attachments: true,
        createdAt: true,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { last_response_at: new Date() },
    });

    this.logger.log(colors.magenta(`Message added to ticket ${dto.ticket_number}`));
    this.gateway.emitNewMessage(ticket.id, ticket.user_id, message);

    return new ApiResponseDto(true, 'Message sent', {
      ticket_number: dto.ticket_number,
      ticket_id: ticket.id,
      message,
    });
  }

  // ──────────────────────────────────────────────────────────
  // RATE TICKET — User submits satisfaction rating
  // ──────────────────────────────────────────────────────────

  async rateTicket(
    ticketNumber: string,
    userId: string,
    rating: number,
    feedback?: string,
  ): Promise<ApiResponseDto<any>> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { ticket_number: ticketNumber },
      select: { id: true, user_id: true, status: true, satisfaction_rating: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.user_id !== userId) throw new BadRequestException('You can only rate your own tickets');
    if (ticket.satisfaction_rating) throw new BadRequestException('Ticket already rated');
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      throw new BadRequestException('Can only rate resolved or closed tickets');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { satisfaction_rating: rating, feedback },
      select: { ticket_number: true, satisfaction_rating: true, feedback: true },
    });

    return new ApiResponseDto(true, 'Rating submitted', updated);
  }

  // ──────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────

  private async addMessageToExistingTicket(
    dto: CreateSupportTicketDto,
    headers: any,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    const existingTicket = await this.prisma.supportTicket.findUnique({
      where: { ticket_number: dto.ticket_number },
      select: {
        id: true,
        ticket_number: true,
        email: true,
        user_id: true,
        subject: true,
        status: true,
        user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    if (!existingTicket) {
      this.logger.log(colors.yellow(`Ticket ${dto.ticket_number} not found, creating new ticket`));
      const dtoWithoutTicket = { ...dto, ticket_number: undefined };
      return this.createSupportTicket(dtoWithoutTicket, headers, ipAddress);
    }

    if (existingTicket.email && existingTicket.email.toLowerCase() !== dto.email.toLowerCase()) {
      return new ApiResponseDto(false, 'Email does not match the ticket owner', null);
    }

    const userAgent = this.extractUserAgent(headers);
    const senderName = existingTicket.user
      ? `${existingTicket.user.first_name ?? ''} ${existingTicket.user.last_name ?? ''}`.trim() || null
      : null;

    const message = await this.prisma.supportMessage.create({
      data: {
        ticket_id: existingTicket.id,
        message: dto.description,
        is_from_user: true,
        is_internal: false,
        sender_email: dto.email,
        sender_name: senderName,
        user_id: existingTicket.user_id,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
      select: {
        id: true,
        message: true,
        is_from_user: true,
        sender_name: true,
        sender_email: true,
        attachments: true,
        createdAt: true,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: existingTicket.id },
      data: { last_response_at: new Date() },
    });

    this.logger.log(colors.magenta(`Message added to existing ticket ${dto.ticket_number}`));
    this.gateway.emitNewMessage(existingTicket.id, existingTicket.user_id, message);

    this.sendUpdateEmail(
      existingTicket.email || dto.email,
      existingTicket.ticket_number,
      existingTicket.subject,
    );

    return new ApiResponseDto(true, 'Message added to existing ticket', {
      ticket_number: existingTicket.ticket_number,
      ticket_id: existingTicket.id,
      message,
    });
  }

  private formatTicketResponse(ticket: any) {
    return {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      description: ticket.description,
      support_type: ticket.support_type,
      status: ticket.status,
      priority: ticket.priority,
      email: ticket.email,
      phone_number: ticket.phone_number,
      related_transaction_id: ticket.related_transaction_id ?? null,
      satisfaction_rating: ticket.satisfaction_rating ?? null,
      feedback: ticket.feedback ?? null,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
      last_response_at: ticket.last_response_at ?? null,
      messages: (ticket.messages ?? []).map((msg: any) => ({
        id: msg.id,
        message: msg.message,
        is_from_user: msg.is_from_user,
        sender_name: msg.sender_name,
        sender_email: msg.sender_email,
        attachments: msg.attachments,
        created_at: msg.createdAt,
      })),
      total_messages: ticket.messages?.length ?? 0,
    };
  }

  private async resolveSession(sessionId?: string) {
    if (!sessionId) return null;
    const progress = await this.prisma.registrationProgress.findUnique({
      where: { id: sessionId },
    });
    if (!progress) {
      throw new BadRequestException('Invalid session ID');
    }
    return progress;
  }

  private extractUserAgent(headers: any): string | null {
    return headers['user-agent'] || headers['User-Agent'] || headers['x-user-agent'] || null;
  }

  private extractDeviceMetadata(dtoMetadata: any, headers: any, ipAddress: string): any | null {
    if (dtoMetadata) return dtoMetadata;
    const deviceId = headers['x-device-id'] || headers['X-Device-ID'];
    if (!deviceId) return null;
    return {
      device_id: deviceId,
      device_fingerprint: headers['x-device-fingerprint'] || headers['X-Device-Fingerprint'] || deviceId,
      device_name: headers['x-device-name'] || headers['X-Device-Name'],
      device_model: headers['x-device-model'] || headers['X-Device-Model'],
      platform: (headers['platform'] || headers['Platform'] || 'unknown').toLowerCase(),
      os_name: headers['x-os-name'] || headers['X-OS-Name'],
      os_version: headers['x-os-version'] || headers['X-OS-Version'],
      app_version: headers['x-app-version'] || headers['X-App-Version'],
      ip_address: ipAddress,
    };
  }

  private inferPriority(supportType: SupportType): TicketPriority {
    const highPriority: SupportType[] = [
      SupportType.SECURITY_ISSUE,
      SupportType.REFUND_REQUEST,
      SupportType.REGISTRATION_ISSUE,
      SupportType.LOGIN_ISSUE,
    ];
    const lowPriority: SupportType[] = [
      SupportType.FEATURE_REQUEST,
      SupportType.GENERAL_INQUIRY,
      SupportType.OTHER,
    ];

    if (highPriority.includes(supportType)) return TicketPriority.high;
    if (lowPriority.includes(supportType)) return TicketPriority.low;
    return TicketPriority.medium;
  }

  private async sendConfirmationEmail(email: string, ticketNumber: string, subject: string, description: string, createdAt: Date) {
    try {
      await this.emailService.sendSupportTicketConfirmationEmail(email, ticketNumber, subject, description, createdAt);
      this.logger.log(colors.green(`Confirmation email sent to ${email}`));
    } catch (err) {
      this.logger.error(colors.yellow(`Failed to send confirmation email: ${err.message}`));
    }
  }

  private async sendUpdateEmail(email: string, ticketNumber: string, subject: string) {
    try {
      await this.emailService.sendSupportTicketUpdateEmail(email, ticketNumber, subject, [], 0, new Date());
      this.logger.log(colors.green(`Update email sent to ${email}`));
    } catch (err) {
      this.logger.error(colors.yellow(`Failed to send update email: ${err.message}`));
    }
  }
}

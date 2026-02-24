import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  namespace: '/support',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // CONNECTION LIFECYCLE
  // ──────────────────────────────────────────────────────────

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected — no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      client.userId = payload.sub;
      client.userRole = payload.role;

      // Join user's personal room for targeted events
      client.join(`user:${payload.sub}`);

      // Admins join the admin room to receive all ticket events
      if (payload.role === 'admin') {
        client.join('admins');
      }

      this.logger.log(`Connected: ${payload.sub} [${payload.role}]`);
    } catch {
      this.logger.warn(`Connection rejected — invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`Disconnected: ${client.userId}`);
    }
  }

  // ──────────────────────────────────────────────────────────
  // CLIENT EVENTS — User / Admin joins a specific ticket room
  // ──────────────────────────────────────────────────────────

  @SubscribeMessage('join_ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticket_id: string },
  ) {
    if (!client.userId || !data.ticket_id) return;

    // Verify access: user must own the ticket or be admin
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: data.ticket_id },
      select: { user_id: true },
    });

    if (!ticket) return;

    const isOwner = ticket.user_id === client.userId;
    const isAdmin = client.userRole === 'admin';

    if (!isOwner && !isAdmin) return;

    client.join(`ticket:${data.ticket_id}`);
    this.logger.log(`${client.userId} joined ticket:${data.ticket_id}`);
  }

  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticket_id: string },
  ) {
    if (data.ticket_id) {
      client.leave(`ticket:${data.ticket_id}`);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticket_id: string },
  ) {
    if (!client.userId || !data.ticket_id) return;
    client.to(`ticket:${data.ticket_id}`).emit('typing', {
      ticket_id: data.ticket_id,
      user_id: client.userId,
      is_admin: client.userRole === 'admin',
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticket_id: string },
  ) {
    if (!client.userId || !data.ticket_id) return;
    client.to(`ticket:${data.ticket_id}`).emit('stop_typing', {
      ticket_id: data.ticket_id,
      user_id: client.userId,
    });
  }

  // ──────────────────────────────────────────────────────────
  // SERVER-SIDE EMITTERS — Called by services after DB writes
  // ──────────────────────────────────────────────────────────

  emitNewMessage(ticketId: string, ticketOwnerId: string | null, message: any) {
    // Everyone in the ticket room gets the new message
    this.server.to(`ticket:${ticketId}`).emit('new_message', {
      ticket_id: ticketId,
      message,
    });

    // If admin sent the message, also notify the user's personal room
    // (in case they're on the ticket list, not inside this ticket)
    if (!message.is_from_user && ticketOwnerId) {
      this.server.to(`user:${ticketOwnerId}`).emit('ticket_updated', {
        ticket_id: ticketId,
        event: 'new_reply',
        message: {
          id: message.id,
          preview: message.message?.substring(0, 100),
          sender_name: message.sender_name,
          created_at: message.created_at || message.createdAt,
        },
      });
    }

    // If user sent the message, notify all admins
    if (message.is_from_user) {
      this.server.to('admins').emit('ticket_updated', {
        ticket_id: ticketId,
        event: 'new_user_message',
        message: {
          id: message.id,
          preview: message.message?.substring(0, 100),
          sender_name: message.sender_name,
          created_at: message.created_at || message.createdAt,
        },
      });
    }
  }

  emitTicketCreated(ticket: any) {
    this.server.to('admins').emit('ticket_created', {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      support_type: ticket.support_type,
      priority: ticket.priority,
      email: ticket.email,
      created_at: ticket.createdAt,
    });
  }

  emitTicketStatusChanged(ticketId: string, ticketOwnerId: string | null, data: {
    old_status: string;
    new_status: string;
    ticket_number: string;
    resolution_notes?: string;
  }) {
    this.server.to(`ticket:${ticketId}`).emit('status_changed', {
      ticket_id: ticketId,
      ...data,
    });

    if (ticketOwnerId) {
      this.server.to(`user:${ticketOwnerId}`).emit('ticket_updated', {
        ticket_id: ticketId,
        event: 'status_changed',
        ...data,
      });
    }
  }

  emitTicketAssigned(ticketId: string, data: {
    ticket_number: string;
    assigned_to: string;
    assigned_admin_name: string;
  }) {
    this.server.to(`ticket:${ticketId}`).emit('ticket_assigned', {
      ticket_id: ticketId,
      ...data,
    });

    this.server.to('admins').emit('ticket_updated', {
      ticket_id: ticketId,
      event: 'assigned',
      ...data,
    });
  }
}

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
        this.logger.warn(`🔌 Connection REJECTED — no token provided (socket: ${client.id})`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      client.userId = payload.sub;
      client.userRole = payload.role;

      client.join(`user:${payload.sub}`);

      if (payload.role === 'admin') {
        client.join('admins');
        this.logger.log(`🔌 ADMIN connected — ${payload.email || payload.sub} [socket: ${client.id}] → joined rooms: user:${payload.sub}, admins`);
      } else {
        this.logger.log(`🔌 USER connected — ${payload.email || payload.sub} [socket: ${client.id}] → joined room: user:${payload.sub}`);
      }

      const sockets = await this.server?.fetchSockets();
      const connectedCount = sockets?.length ?? 'unknown';
      this.logger.log(`🔌 Total active connections: ${connectedCount}`);
    } catch {
      this.logger.warn(`🔌 Connection REJECTED — invalid/expired token (socket: ${client.id})`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`🔌 DISCONNECTED — ${client.userId} [${client.userRole}] (socket: ${client.id})`);
    }
  }

  // ──────────────────────────────────────────────────────────
  // CLIENT EVENTS — Join/leave conversation rooms
  // ──────────────────────────────────────────────────────────

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversation_id: string },
  ) {
    if (!client.userId || !data.conversation_id) return;

    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: data.conversation_id },
      select: { user_id: true },
    });

    if (!conversation) {
      this.logger.warn(`📋 join_conversation DENIED — conversation ${data.conversation_id} not found`);
      return;
    }

    const isOwner = conversation.user_id === client.userId;
    const isAdmin = client.userRole === 'admin';

    if (!isOwner && !isAdmin) {
      this.logger.warn(`📋 join_conversation DENIED — ${client.userId} has no access`);
      return;
    }

    client.join(`conversation:${data.conversation_id}`);
    this.logger.log(`📋 ${client.userRole?.toUpperCase()} ${client.userId} joined conversation room: ${data.conversation_id}`);
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversation_id: string },
  ) {
    if (data.conversation_id) {
      client.leave(`conversation:${data.conversation_id}`);
      this.logger.log(`📋 ${client.userId} left conversation room: ${data.conversation_id}`);
    }
  }

  // Backward compat: ticket rooms (for conversations that have tickets)
  @SubscribeMessage('join_ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticket_id: string },
  ) {
    if (!client.userId || !data.ticket_id) return;

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: data.ticket_id },
      select: { user_id: true, ticket_number: true, conversation_id: true },
    });

    if (!ticket) return;

    const isOwner = ticket.user_id === client.userId;
    const isAdmin = client.userRole === 'admin';
    if (!isOwner && !isAdmin) return;

    client.join(`ticket:${data.ticket_id}`);
    if (ticket.conversation_id) {
      client.join(`conversation:${ticket.conversation_id}`);
    }
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
    @MessageBody() data: { conversation_id?: string; ticket_id?: string },
  ) {
    if (!client.userId) return;
    const room = data.conversation_id
      ? `conversation:${data.conversation_id}`
      : data.ticket_id
        ? `ticket:${data.ticket_id}`
        : null;
    if (!room) return;

    client.to(room).emit('typing', {
      conversation_id: data.conversation_id,
      ticket_id: data.ticket_id,
      user_id: client.userId,
      is_admin: client.userRole === 'admin',
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversation_id?: string; ticket_id?: string },
  ) {
    if (!client.userId) return;
    const room = data.conversation_id
      ? `conversation:${data.conversation_id}`
      : data.ticket_id
        ? `ticket:${data.ticket_id}`
        : null;
    if (!room) return;

    client.to(room).emit('stop_typing', {
      conversation_id: data.conversation_id,
      ticket_id: data.ticket_id,
      user_id: client.userId,
    });
  }

  // ──────────────────────────────────────────────────────────
  // ROOM DIAGNOSTICS
  // ──────────────────────────────────────────────────────────

  private async getRoomSize(room: string): Promise<number> {
    try {
      const sockets = await this.server.in(room).fetchSockets();
      return sockets.length;
    } catch {
      return 0;
    }
  }

  // ──────────────────────────────────────────────────────────
  // SERVER-SIDE EMITTERS — Called by services after DB writes
  // ──────────────────────────────────────────────────────────

  async emitNewConversationMessage(
    conversationId: string,
    conversationOwnerId: string | null,
    message: any,
  ) {
    const from = message.is_from_user ? 'USER' : 'ADMIN';
    const preview = (message.message || '').substring(0, 80);
    const room = `conversation:${conversationId}`;
    const roomSize = await this.getRoomSize(room);

    this.logger.log(`💬 NEW MSG [${from}] → ${room} (${roomSize} client(s)) | "${preview}..."`);

    if (roomSize === 0) {
      this.logger.warn(`⚠️  NO CLIENTS in room ${room}`);
    }

    this.server.to(room).emit('new_message', {
      conversation_id: conversationId,
      message,
    });

    // Notify user's personal room for badge updates (admin reply)
    if (!message.is_from_user && conversationOwnerId) {
      const userRoom = `user:${conversationOwnerId}`;
      this.server.to(userRoom).emit('conversation_updated', {
        conversation_id: conversationId,
        event: 'new_reply',
        message: {
          id: message.id,
          preview: message.message?.substring(0, 100),
          sender_name: message.sender_name,
          created_at: message.created_at || message.createdAt,
        },
      });
    }

    // Notify admins room for queue updates (user message)
    if (message.is_from_user) {
      const adminsRoomSize = await this.getRoomSize('admins');
      if (adminsRoomSize === 0) {
        this.logger.warn(`⚠️  NO ADMINS connected`);
      }
      this.server.to('admins').emit('conversation_updated', {
        conversation_id: conversationId,
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

  async emitConversationCreated(conversation: any) {
    const adminsRoomSize = await this.getRoomSize('admins');
    this.logger.log(`🎫 NEW CONVERSATION → admins (${adminsRoomSize} admin(s)) | ${conversation.id}`);

    this.server.to('admins').emit('conversation_created', {
      id: conversation.id,
      user_id: conversation.user_id,
      email: conversation.email,
      status: conversation.status,
      created_at: conversation.createdAt,
      first_message: conversation.messages?.[0]?.message?.substring(0, 100),
    });
  }

  async emitConversationClaimed(
    conversationId: string,
    conversationOwnerId: string | null,
    adminName: string,
    adminId: string,
  ) {
    const room = `conversation:${conversationId}`;
    this.logger.log(`👤 CONVERSATION CLAIMED → ${conversationId} by ${adminName}`);

    this.server.to(room).emit('conversation_claimed', {
      conversation_id: conversationId,
      assigned_to: adminId,
      assigned_admin_name: adminName,
    });

    if (conversationOwnerId) {
      this.server.to(`user:${conversationOwnerId}`).emit('conversation_updated', {
        conversation_id: conversationId,
        event: 'claimed',
        assigned_admin_name: adminName,
      });
    }

    this.server.to('admins').emit('conversation_updated', {
      conversation_id: conversationId,
      event: 'claimed',
      assigned_to: adminId,
      assigned_admin_name: adminName,
    });
  }

  async emitConversationClosed(
    conversationId: string,
    conversationOwnerId: string | null,
  ) {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit('conversation_closed', {
      conversation_id: conversationId,
    });

    if (conversationOwnerId) {
      this.server.to(`user:${conversationOwnerId}`).emit('conversation_updated', {
        conversation_id: conversationId,
        event: 'closed',
      });
    }

    this.server.to('admins').emit('conversation_updated', {
      conversation_id: conversationId,
      event: 'closed',
    });
  }

  async emitHandoverRequested(
    conversationId: string,
    handover: any,
    fromAdminName: string,
  ) {
    // Notify the target admin
    this.server.to(`user:${handover.to_admin_id}`).emit('handover_requested', {
      handover_id: handover.id,
      conversation_id: conversationId,
      from_admin_id: handover.from_admin_id,
      from_admin_name: fromAdminName,
      reason: handover.reason,
    });
  }

  async emitHandoverResolved(
    conversationId: string,
    conversationOwnerId: string | null,
    handover: any,
    newAdminName: string,
    accepted: boolean,
  ) {
    const room = `conversation:${conversationId}`;

    if (accepted) {
      this.server.to(room).emit('conversation_claimed', {
        conversation_id: conversationId,
        assigned_to: handover.to_admin_id,
        assigned_admin_name: newAdminName,
      });

      if (conversationOwnerId) {
        this.server.to(`user:${conversationOwnerId}`).emit('conversation_updated', {
          conversation_id: conversationId,
          event: 'handover_completed',
          assigned_admin_name: newAdminName,
        });
      }
    }

    // Notify the originating admin
    this.server.to(`user:${handover.from_admin_id}`).emit('handover_resolved', {
      handover_id: handover.id,
      conversation_id: conversationId,
      status: accepted ? 'accepted' : 'rejected',
      to_admin_name: newAdminName,
    });

    this.server.to('admins').emit('conversation_updated', {
      conversation_id: conversationId,
      event: accepted ? 'handover_accepted' : 'handover_rejected',
    });
  }

  async emitTicketCreatedFromConversation(
    conversationId: string,
    conversationOwnerId: string | null,
    ticket: any,
  ) {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit('ticket_created_from_conversation', {
      conversation_id: conversationId,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        support_type: ticket.support_type,
        priority: ticket.priority,
        status: ticket.status,
      },
    });

    if (conversationOwnerId) {
      this.server.to(`user:${conversationOwnerId}`).emit('conversation_updated', {
        conversation_id: conversationId,
        event: 'ticket_created',
        ticket_number: ticket.ticket_number,
      });
    }

    this.server.to('admins').emit('ticket_created', {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      support_type: ticket.support_type,
      priority: ticket.priority,
      email: ticket.email,
      created_at: ticket.createdAt,
      conversation_id: conversationId,
    });
  }

  // Legacy emitters for backward compatibility with existing ticket operations
  async emitNewMessage(ticketId: string, ticketOwnerId: string | null, message: any) {
    const ticketRoom = `ticket:${ticketId}`;
    const ticketRoomSize = await this.getRoomSize(ticketRoom);

    this.server.to(ticketRoom).emit('new_message', {
      ticket_id: ticketId,
      message,
    });

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

  async emitTicketCreated(ticket: any) {
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

  async emitTicketStatusChanged(ticketId: string, ticketOwnerId: string | null, data: {
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

  async emitTicketAssigned(ticketId: string, data: {
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

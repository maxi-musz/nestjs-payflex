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

      // Join user's personal room for targeted events
      client.join(`user:${payload.sub}`);

      // Admins join the admin room to receive all ticket events
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
  // CLIENT EVENTS — User / Admin joins a specific ticket room
  // ──────────────────────────────────────────────────────────

  @SubscribeMessage('join_ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticket_id: string },
  ) {
    if (!client.userId || !data.ticket_id) return;

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: data.ticket_id },
      select: { user_id: true, ticket_number: true },
    });

    if (!ticket) {
      this.logger.warn(`📋 join_ticket DENIED — ticket ${data.ticket_id} not found (user: ${client.userId})`);
      return;
    }

    const isOwner = ticket.user_id === client.userId;
    const isAdmin = client.userRole === 'admin';

    if (!isOwner && !isAdmin) {
      this.logger.warn(`📋 join_ticket DENIED — ${client.userId} [${client.userRole}] has no access to ${ticket.ticket_number}`);
      return;
    }

    client.join(`ticket:${data.ticket_id}`);
    this.logger.log(`📋 ${client.userRole?.toUpperCase()} ${client.userId} joined ticket room: ${ticket.ticket_number}`);
  }

  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticket_id: string },
  ) {
    if (data.ticket_id) {
      client.leave(`ticket:${data.ticket_id}`);
      this.logger.log(`📋 ${client.userId} left ticket room: ${data.ticket_id}`);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticket_id: string },
  ) {
    if (!client.userId || !data.ticket_id) return;
    this.logger.debug(`⌨️  TYPING — ${client.userRole} ${client.userId} in ticket:${data.ticket_id}`);
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
  // ROOM DIAGNOSTICS — Counts clients in a Socket.IO room
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

  async emitNewMessage(ticketId: string, ticketOwnerId: string | null, message: any) {
    const from = message.is_from_user ? 'USER' : 'ADMIN';
    const preview = (message.message || '').substring(0, 80);

    const ticketRoom = `ticket:${ticketId}`;
    const ticketRoomSize = await this.getRoomSize(ticketRoom);
    this.logger.log(`💬 NEW MESSAGE [${from}] → ${ticketRoom} (${ticketRoomSize} client(s) in room) | "${preview}..."`);

    if (ticketRoomSize === 0) {
      this.logger.warn(`⚠️  NO CLIENTS in room ${ticketRoom} — message will not be delivered in real-time. Frontend must connect to Socket.IO /support namespace and emit join_ticket.`);
    }

    this.server.to(ticketRoom).emit('new_message', {
      ticket_id: ticketId,
      message,
    });

    if (!message.is_from_user && ticketOwnerId) {
      const userRoom = `user:${ticketOwnerId}`;
      const userRoomSize = await this.getRoomSize(userRoom);
      this.logger.debug(`💬 → Notifying ${userRoom} (${userRoomSize} client(s)) — admin reply`);

      if (userRoomSize === 0) {
        this.logger.warn(`⚠️  NO CLIENTS in room ${userRoom} — user is not connected to Socket.IO. They will only see the message on next page load/refresh.`);
      }

      this.server.to(userRoom).emit('ticket_updated', {
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
      const adminsRoomSize = await this.getRoomSize('admins');
      this.logger.debug(`💬 → Notifying admins room (${adminsRoomSize} admin(s) connected) — new user message`);

      if (adminsRoomSize === 0) {
        this.logger.warn(`⚠️  NO ADMINS connected to Socket.IO — admin dashboard will not receive real-time update.`);
      }

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
    const adminsRoomSize = await this.getRoomSize('admins');
    this.logger.log(`🎫 NEW TICKET → admins (${adminsRoomSize} admin(s) connected) | ${ticket.ticket_number} [${ticket.support_type}/${ticket.priority}] — "${ticket.subject}"`);

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
    const ticketRoomSize = await this.getRoomSize(`ticket:${ticketId}`);
    this.logger.log(`🔄 STATUS CHANGED → ${data.ticket_number} | ${data.old_status} → ${data.new_status} (${ticketRoomSize} in ticket room)`);

    this.server.to(`ticket:${ticketId}`).emit('status_changed', {
      ticket_id: ticketId,
      ...data,
    });

    if (ticketOwnerId) {
      const userRoomSize = await this.getRoomSize(`user:${ticketOwnerId}`);
      this.logger.debug(`🔄 → Notifying user:${ticketOwnerId} (${userRoomSize} client(s))`);
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
    const ticketRoomSize = await this.getRoomSize(`ticket:${ticketId}`);
    const adminsRoomSize = await this.getRoomSize('admins');
    this.logger.log(`👤 TICKET ASSIGNED → ${data.ticket_number} | assigned to: ${data.assigned_admin_name} (${ticketRoomSize} in ticket room, ${adminsRoomSize} admins connected)`);

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

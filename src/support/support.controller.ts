import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Headers,
  Ip,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AddMessageToTicketDto } from './dto/add-message.dto';
import { SendMessageDto, SendMessageUnauthenticatedDto, RateConversationDto } from './dto/send-message.dto';
import { SecurityHeadersGuard } from 'src/common/guards/security-headers.guard';
import { Request } from 'express';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ──────────────────────────────────────────────────────────
  // LIVE CHAT ENDPOINTS (new — conversation-first)
  // ──────────────────────────────────────────────────────────

  @Post('chat/send')
  @UseGuards(AuthGuard('jwt'))
  async sendMessage(
    @Body() dto: SendMessageDto,
    @Headers() headers: any,
    @Ip() ipAddress: string,
    @Req() req: any,
  ) {
    const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
    return this.supportService.sendMessage(dto, headers, clientIp, req.user.sub);
  }

  @Post('chat/send-unauthenticated')
  @UseGuards(SecurityHeadersGuard)
  async sendMessageUnauthenticated(
    @Body() dto: SendMessageUnauthenticatedDto,
    @Headers() headers: any,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
    return this.supportService.sendMessageUnauthenticated(dto, headers, clientIp);
  }

  @Get('conversations')
  @UseGuards(AuthGuard('jwt'))
  async getConversations(@Req() req: any) {
    return this.supportService.getConversations(req.user.sub);
  }

  @Get('conversations/:id')
  @UseGuards(AuthGuard('jwt'))
  async getConversation(@Param('id') id: string, @Req() req: any) {
    return this.supportService.getConversation(id, req.user.sub);
  }

  @Post('conversations/:id/rate')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async rateConversation(
    @Param('id') id: string,
    @Body() body: RateConversationDto,
    @Req() req: any,
  ) {
    return this.supportService.rateConversation(id, req.user.sub, body.rating, body.feedback);
  }

  // ──────────────────────────────────────────────────────────
  // LEGACY TICKET ENDPOINTS (kept for backward compatibility)
  // ──────────────────────────────────────────────────────────

  @Post('request-support')
  @UseGuards(SecurityHeadersGuard)
  async createSupportTicket(
    @Body() dto: CreateSupportTicketDto,
    @Headers() headers: any,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
    return this.supportService.createSupportTicket(dto, headers, clientIp);
  }

  @Post('create-ticket')
  @UseGuards(AuthGuard('jwt'))
  async createTicketAuthenticated(
    @Body() dto: CreateSupportTicketDto,
    @Headers() headers: any,
    @Ip() ipAddress: string,
    @Req() req: any,
  ) {
    const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
    return this.supportService.createSupportTicket(dto, headers, clientIp, req.user.sub);
  }

  @Get('my-tickets')
  @UseGuards(AuthGuard('jwt'))
  async getMyTickets(@Req() req: any) {
    return this.supportService.getUserTickets(req.user.sub);
  }

  @Get('ticket')
  @UseGuards(SecurityHeadersGuard)
  async getTicketByNumber(@Query('ticket_number') ticketNumber: string) {
    return this.supportService.getTicketByNumber(ticketNumber);
  }

  @Post('ticket/add-message')
  @UseGuards(SecurityHeadersGuard)
  async addMessageToTicket(
    @Body() dto: AddMessageToTicketDto,
    @Headers() headers: any,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || ipAddress || req.socket.remoteAddress || 'unknown';
    return this.supportService.addMessageToTicket(dto, headers, clientIp);
  }

  @Post('ticket/:ticketNumber/rate')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async rateTicket(
    @Param('ticketNumber') ticketNumber: string,
    @Body() body: { rating: number; feedback?: string },
    @Req() req: any,
  ) {
    return this.supportService.rateTicket(ticketNumber, req.user.sub, body.rating, body.feedback);
  }
}

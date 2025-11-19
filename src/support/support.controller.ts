import {
  Body,
  Controller,
  Get,
  Post,
  Headers,
  Ip,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { GetTicketByNumberDto } from './dto/get-ticket.dto';
import { AddMessageToTicketDto } from './dto/add-message.dto';
import { SecurityHeadersGuard } from 'src/common/guards/security-headers.guard';
import { Request } from 'express';
import * as colors from 'colors';

@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  /**
   * Create a support ticket
   * Can be used during registration or by registered users
   */
  @Post('request-support')
  @UseGuards(SecurityHeadersGuard)
  async createSupportTicket(
    @Body() dto: CreateSupportTicketDto,
    @Headers() headers: any,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    try {
      // Get IP address from request (handles proxies)
      const clientIp =
        req.ip || ipAddress || req.socket.remoteAddress || 'unknown';

      return await this.supportService.createSupportTicket(
        dto,
        headers,
        clientIp,
      );
    } catch (error) {
      console.error(colors.red('Error in create support ticket:'), error);
      throw error;
    }
  }

  /**
   * Get support ticket by ticket number with all messages
   */
  @Get('ticket')
  @UseGuards(SecurityHeadersGuard)
  async getTicketByNumber(
    @Query() dto: GetTicketByNumberDto,
  ) {
    try {
      return await this.supportService.getTicketByNumber(dto.ticket_number);
    } catch (error) {
      console.error(colors.red('Error in get ticket:'), error);
      throw error;
    }
  }

  /**
   * Add a message to an existing support ticket
   */
  @Post('ticket/add-message')
  @UseGuards(SecurityHeadersGuard)
  async addMessageToTicket(
    @Body() dto: AddMessageToTicketDto,
    @Headers() headers: any,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    try {
      // Get IP address from request (handles proxies)
      const clientIp =
        req.ip || ipAddress || req.socket.remoteAddress || 'unknown';

      return await this.supportService.addMessageToTicket(
        dto,
        headers,
        clientIp,
      );
    } catch (error) {
      console.error(colors.red('Error in add message to ticket:'), error);
      throw error;
    }
  }
}


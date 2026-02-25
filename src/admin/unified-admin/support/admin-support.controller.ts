import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { AdminSupportService } from './admin-support.service';
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

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/support')
export class AdminSupportController {
  constructor(private readonly supportService: AdminSupportService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CONVERSATIONS — Live Chat
  // ════════════════════════════════════════════════════════════

  @Get('conversations')
  listConversations(@Query() query: QueryConversationsDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.supportService.listConversations(query);
  }

  @Get('conversations/:id')
  getConversationById(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.supportService.getConversationById(id);
  }

  @Post('conversations/:id/claim')
  claimConversation(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.supportService.claimConversation(id, req.user, req);
  }

  @Post('conversations/:id/reply')
  replyToConversation(
    @Param('id') id: string,
    @Body() dto: AdminReplyToConversationDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.supportService.replyToConversation(id, dto, req.user, req);
  }

  @Post('conversations/:id/create-ticket')
  createTicketFromConversation(
    @Param('id') id: string,
    @Body() dto: CreateTicketFromConversationDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.supportService.createTicketFromConversation(id, dto, req.user, req);
  }

  @Post('conversations/:id/close')
  closeConversation(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.supportService.closeConversation(id, req.user, req);
  }

  @Post('conversations/:id/handover')
  initiateHandover(
    @Param('id') id: string,
    @Body() dto: InitiateHandoverDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.supportService.initiateHandover(id, dto, req.user, req);
  }

  @Post('handovers/:id/respond')
  respondToHandover(
    @Param('id') id: string,
    @Body() dto: RespondToHandoverDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.supportService.respondToHandover(id, dto, req.user, req);
  }

  // ════════════════════════════════════════════════════════════
  //  TICKETS — Existing management (unchanged)
  // ════════════════════════════════════════════════════════════

  @Get()
  listTickets(@Query() query: QueryTicketsDto, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.supportService.listTickets(query);
  }

  @Get(':id')
  getTicketById(@Param('id') id: string, @Req() req: any) {
    this.assertAdmin(req.user);
    return this.supportService.getTicketById(id);
  }

  @Post(':id/reply')
  replyToTicket(
    @Param('id') id: string,
    @Body() dto: AdminReplyDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.supportService.replyToTicket(id, dto, req.user, req);
  }

  @Put(':id/status')
  updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.supportService.updateTicketStatus(id, dto, req.user, req);
  }

  @Put(':id/assign')
  assignTicket(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.supportService.assignTicket(id, dto, req.user, req);
  }

  @Put(':id/priority')
  updateTicketPriority(
    @Param('id') id: string,
    @Body() dto: UpdateTicketPriorityDto,
    @Req() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.supportService.updateTicketPriority(id, dto, req.user, req);
  }
}

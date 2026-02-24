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

@UseGuards(AuthGuard('jwt'))
@Controller('unified-admin/support')
export class AdminSupportController {
  constructor(private readonly supportService: AdminSupportService) {}

  private assertAdmin(user: any) {
    if (user?.role !== Role.admin) {
      throw new ForbiddenException('Admin access required');
    }
  }

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

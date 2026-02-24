import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { TicketStatus, TicketPriority } from '@prisma/client';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus) status: TicketStatus;
  @IsOptional() @IsString() resolution_notes?: string;
}

export class AssignTicketDto {
  @IsString() assigned_to: string;
}

export class UpdateTicketPriorityDto {
  @IsEnum(TicketPriority) priority: TicketPriority;
}

export class AdminReplyDto {
  @IsString() message: string;
  @IsOptional() @IsBoolean() is_internal?: boolean;
}

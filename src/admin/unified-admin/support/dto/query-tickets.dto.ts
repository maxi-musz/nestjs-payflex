import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { TicketStatus, TicketPriority, SupportType } from '@prisma/client';

export class QueryTicketsDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;

  @IsOptional() @IsString() search?: string;

  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @IsEnum(SupportType) support_type?: SupportType;

  @IsOptional() @IsString() assigned_to?: string;
  @IsOptional() @IsString() user_id?: string;

  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;

  @IsOptional() @IsString() sort_by?: string;
  @IsOptional() @IsString() sort_order?: string;
}

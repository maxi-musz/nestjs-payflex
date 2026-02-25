import { IsOptional, IsString, IsEnum, IsNumberString, IsBoolean } from 'class-validator';
import { ConversationStatus, SupportType, TicketPriority } from '@prisma/client';

export class QueryConversationsDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ConversationStatus) status?: ConversationStatus;
  @IsOptional() @IsString() assigned_to?: string;
  @IsOptional() @IsString() user_id?: string;
  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;
  @IsOptional() @IsString() sort_by?: string;
  @IsOptional() @IsString() sort_order?: string;
  @IsOptional() @IsString() has_ticket?: string;
}

export class AdminReplyToConversationDto {
  @IsString() message: string;
  @IsOptional() @IsBoolean() is_internal?: boolean;
}

export class ClaimConversationDto {}

export class CreateTicketFromConversationDto {
  @IsString() subject: string;
  @IsString() description: string;
  @IsOptional() @IsEnum(SupportType) support_type?: SupportType;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @IsString() related_transaction_id?: string;
}

export class InitiateHandoverDto {
  @IsString() to_admin_id: string;
  @IsOptional() @IsString() reason?: string;
}

export class RespondToHandoverDto {
  @IsEnum(['accepted', 'rejected'] as any) status: 'accepted' | 'rejected';
}

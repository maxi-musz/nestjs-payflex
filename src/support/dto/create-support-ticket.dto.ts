import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, MinLength, MaxLength } from 'class-validator';
import { SupportType, TicketPriority } from '@prisma/client';

export class CreateSupportTicketDto {
  @IsString()
  @IsOptional()
  ticket_number?: string;

  @IsString()
  @IsOptional()
  phone_number?: string | null;

  @IsString()
  @IsOptional()
  session_id?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(SupportType)
  support_type?: SupportType;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  related_transaction_id?: string;

  @IsOptional()
  device_metadata?: any;
}

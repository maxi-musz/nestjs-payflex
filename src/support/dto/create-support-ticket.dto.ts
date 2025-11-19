import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, MinLength, MaxLength } from 'class-validator';
import { SupportType } from '@prisma/client';

export class CreateSupportTicketDto {
  // Ticket number (optional - if provided and exists, adds message to existing ticket)
  @IsString()
  @IsOptional()
  ticket_number?: string;

  // Phone number (optional - will be formatted and validated in service)
  @IsString()
  @IsOptional()
  phone_number?: string | null;

  // Session ID from registration (optional but recommended)
  @IsString()
  @IsOptional()
  session_id?: string;

  // Ticket content
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

  // Required email for contact
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  // Device metadata (optional, can be extracted from headers)
  @IsOptional()
  device_metadata?: any;
}


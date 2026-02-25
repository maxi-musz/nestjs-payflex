import { IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsOptional()
  conversation_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  device_metadata?: any;
}

export class SendMessageUnauthenticatedDto {
  @IsString()
  @IsOptional()
  conversation_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsOptional()
  device_metadata?: any;
}

export class RateConversationDto {
  rating: number;
  feedback?: string;
}

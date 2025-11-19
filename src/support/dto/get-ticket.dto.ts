import { IsString, IsNotEmpty } from 'class-validator';

export class GetTicketByNumberDto {
  @IsString()
  @IsNotEmpty()
  ticket_number: string;
}


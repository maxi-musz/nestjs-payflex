import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ResendLogsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  log_ids!: string[];
}

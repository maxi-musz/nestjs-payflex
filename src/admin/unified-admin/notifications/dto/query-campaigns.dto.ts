import { IsEnum, IsOptional, IsNumberString } from 'class-validator';

export class QueryCampaignsDto {
  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

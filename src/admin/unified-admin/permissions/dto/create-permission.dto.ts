import { IsString, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  /** Display name (e.g. "Manage users") */
  @IsString()
  name: string;

  /** Programmatic key (e.g. "manage_users") */
  @IsString()
  key: string;

  /** Resource label (e.g. "Users") */
  @IsString()
  resource: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Optional: assign to this user; omit to create a definition/template */
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

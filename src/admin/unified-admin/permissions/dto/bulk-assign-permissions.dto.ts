import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BulkPermissionItem {
  /** Permission key (e.g. "manage_users") */
  @IsString()
  key: string;
}

export class BulkAssignPermissionsDto {
  @IsString()
  user_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPermissionItem)
  permissions: BulkPermissionItem[];

  @IsOptional()
  @IsString()
  notes?: string;
}

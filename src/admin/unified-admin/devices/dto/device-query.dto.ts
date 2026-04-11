export class QueryDevicesDto {
  page?: string;
  limit?: string;
  platform?: string;
  status?: string; // 'active' | 'restricted' | 'inactive'
  search?: string;
  os_name?: string;
  sort_by?: string; // 'last_seen_at' | 'first_seen_at' | 'createdAt'
  sort_order?: string; // 'asc' | 'desc'
}

export class BulkDeviceActionDto {
  device_ids: string[];
}

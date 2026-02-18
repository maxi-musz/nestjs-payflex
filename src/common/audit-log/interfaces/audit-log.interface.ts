import {
  AuditAction,
  AuditActorType,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '@prisma/client';

/**
 * Core input for creating an audit log entry.
 * Only `action` and `status` are required — everything else is optional
 * and will be auto-enriched by the service where possible.
 */
export interface CreateAuditLogInput {
  // WHO
  user_id?: string;
  actor_type?: AuditActorType;
  actor_name?: string;
  session_id?: string;

  // WHAT (action is required; category & severity are auto-resolved)
  action: AuditAction;
  category?: AuditCategory;
  status: AuditStatus;
  severity?: AuditSeverity;

  // TARGET
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;

  // WHERE (auto-extracted from request when using convenience methods)
  ip_address?: string;
  user_agent?: string;
  device_id?: string;
  device_model?: string;
  platform?: string;
  geo_location?: string;

  // HOW
  http_method?: string;
  endpoint?: string;
  request_id?: string;

  // CONTEXT
  description?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
  error_message?: string;

  // FINANCIAL
  amount?: number;
  currency?: string;
  balance_before?: number;
  balance_after?: number;
  transaction_ref?: string;
}

/**
 * Request metadata extracted from Express/NestJS Request object.
 */
export interface RequestInfo {
  ip_address?: string;
  user_agent?: string;
  http_method?: string;
  endpoint?: string;
  request_id?: string;
}

/**
 * Filters for querying audit logs.
 */
export interface AuditLogQueryFilters {
  user_id?: string;
  action?: AuditAction;
  category?: AuditCategory;
  status?: AuditStatus;
  severity?: AuditSeverity;
  actor_type?: AuditActorType;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  is_flagged?: boolean;
  date_from?: Date;
  date_to?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated response for audit log queries.
 */
export interface AuditLogPaginatedResponse {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

/**
 * Input for flagging an audit log entry.
 */
export interface FlagAuditLogInput {
  log_id: string;
  reason: string;
  flagged_by: string;
}

/**
 * Input for reviewing a flagged audit log entry.
 */
export interface ReviewAuditLogInput {
  log_id: string;
  reviewed_by: string;
  review_notes: string;
  resolve: boolean;
}

/**
 * Device metadata collected from every request (via headers).
 * Used for audit, security, and analytics. Single source of truth for the shape.
 */
export interface DeviceMetadata {
  device_id: string;
  device_fingerprint?: string;
  device_name?: string;
  device_model?: string;
  platform?: string;
  os_name?: string;
  os_version?: string;
  app_version?: string;
  ip_address?: string;
  latitude?: number;
  longitude?: number;
}

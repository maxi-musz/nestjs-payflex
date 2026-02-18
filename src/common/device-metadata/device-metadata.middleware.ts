import { Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { DeviceMetadata } from './device-metadata.types';

const logger = new Logger('DeviceMetadata');

const HEADERS = {
  DEVICE_ID: 'x-device-id',
  DEVICE_FINGERPRINT: 'x-device-fingerprint',
  DEVICE_NAME: 'x-device-name',
  DEVICE_MODEL: 'x-device-model',
  PLATFORM: 'platform',
  OS_NAME: 'x-os-name',
  OS_VERSION: 'x-os-version',
  APP_VERSION: 'x-app-version',
  FORWARDED_FOR: 'x-forwarded-for',
  REAL_IP: 'x-real-ip',
  LATITUDE: 'x-latitude',
  LONGITUDE: 'x-longitude',
} as const;

function getHeader(req: Request, key: string): string | undefined {
  const v = req.headers[key] ?? req.headers[key.toLowerCase()];
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
}

function parseCoord(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

/**
 * Extracts device metadata from request headers and attaches it to req.deviceMetadata.
 * Runs for every request. If x-device-id is missing, req.deviceMetadata is undefined.
 */
export function deviceMetadataMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const deviceId = getHeader(req, HEADERS.DEVICE_ID);
  if (!deviceId?.trim()) {
    (req as any).deviceMetadata = undefined;
    return next();
  }

  const forwarded = getHeader(req, HEADERS.FORWARDED_FOR);
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : getHeader(req, HEADERS.REAL_IP) ?? (req as any).ip;

  const metadata: DeviceMetadata = {
    device_id: deviceId.trim(),
    device_fingerprint: getHeader(req, HEADERS.DEVICE_FINGERPRINT)?.trim() || deviceId.trim(),
    device_name: getHeader(req, HEADERS.DEVICE_NAME)?.trim(),
    device_model: getHeader(req, HEADERS.DEVICE_MODEL)?.trim(),
    platform: getHeader(req, HEADERS.PLATFORM)?.toLowerCase()?.trim() || undefined,
    os_name: getHeader(req, HEADERS.OS_NAME)?.trim(),
    os_version: getHeader(req, HEADERS.OS_VERSION)?.trim(),
    app_version: getHeader(req, HEADERS.APP_VERSION)?.trim(),
    ip_address: ip,
    latitude: parseCoord(getHeader(req, HEADERS.LATITUDE)),
    longitude: parseCoord(getHeader(req, HEADERS.LONGITUDE)),
  };

  (req as any).deviceMetadata = metadata;

  const deviceLabel = metadata.device_name || metadata.device_model || metadata.device_id;
  const platformLabel = metadata.platform ? ` (${metadata.platform})` : '';
  const geoLabel = metadata.latitude != null && metadata.longitude != null
    ? ` @ ${metadata.latitude},${metadata.longitude}`
    : '';
  logger.log(
    `Device metadata received for ${req.method} ${req.originalUrl} from "${deviceLabel}${platformLabel}"${geoLabel} — will be persisted with audit log`,
  );

  next();
}

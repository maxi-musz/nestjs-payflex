import type { DeviceMetadata } from './device-metadata.types';

declare global {
  namespace Express {
    interface Request {
      deviceMetadata?: DeviceMetadata;
    }
  }
}

export {};

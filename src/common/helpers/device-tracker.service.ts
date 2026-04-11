import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Platform } from '@prisma/client';
import type { DeviceMetadata } from '../device-metadata/device-metadata.types';

@Injectable()
export class DeviceTrackerService {
  private readonly logger = new Logger(DeviceTrackerService.name);

  constructor(private prisma: PrismaService) {}

  async trackDevice(
    userId: string,
    dm: DeviceMetadata | undefined,
    ipAddress?: string,
  ): Promise<void> {
    if (!dm?.device_id) return;

    try {
      const platform = this.mapPlatform(dm.platform);

      const data = {
        device_name: dm.device_name || null,
        device_model: dm.device_model || null,
        device_fingerprint: dm.device_fingerprint || dm.device_id,
        platform,
        os_name: dm.os_name || null,
        os_version: dm.os_version || null,
        app_version: dm.app_version || null,
        last_ip_address: ipAddress || dm.ip_address || null,
        last_location: dm.latitude != null && dm.longitude != null
          ? `${dm.latitude}, ${dm.longitude}` : null,
        last_seen_at: new Date(),
      };

      await this.prisma.userDevice.updateMany({
        where: { user_id: userId },
        data: { is_current_device: false },
      });

      await this.prisma.userDevice.upsert({
        where: { user_id_device_id: { user_id: userId, device_id: dm.device_id } },
        create: {
          user_id: userId,
          device_id: dm.device_id,
          ...data,
          is_current_device: true,
          is_active: true,
          is_restricted: false,
        },
        update: {
          ...data,
          is_current_device: true,
        },
      });

      this.logger.log(`Device tracked for user ${userId}: ${dm.device_model ?? dm.device_id}`);
    } catch (error: any) {
      this.logger.error(`Device tracking failed for user ${userId}: ${error.message}`);
    }
  }

  private mapPlatform(platform?: string): Platform {
    const p = platform?.toLowerCase();
    if (p === 'android') return Platform.android;
    return Platform.ios;
  }
}

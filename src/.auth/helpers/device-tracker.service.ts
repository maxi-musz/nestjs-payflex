import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DeviceMetadataDto } from '../dto/registration.dto';
import { Platform } from '@prisma/client';

@Injectable()
export class DeviceTrackerService {
  private readonly logger = new Logger(DeviceTrackerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Register or update a device for a user
   * Called automatically on login and registration
   */
  async registerOrUpdateDevice(
    userId: string,
    deviceMetadata: DeviceMetadataDto,
    ipAddress?: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Registering/updating device for user ${userId}, device: ${deviceMetadata.device_id}`,
      );

      // Convert platform string to Platform enum
      const platform = this.mapPlatformToEnum(deviceMetadata.platform);

      // Prepare device data
      const deviceData = {
        device_id: deviceMetadata.device_id,
        device_fingerprint: (deviceMetadata as any).device_fingerprint || deviceMetadata.device_id, // Use fingerprint if provided, otherwise use device_id
        device_name: deviceMetadata.device_name || null,
        device_model: deviceMetadata.device_model || null,
        platform: platform,
        os_name: deviceMetadata.os_name || null,
        os_version: deviceMetadata.os_version || null,
        app_version: deviceMetadata.app_version || null,
        last_ip_address: ipAddress || deviceMetadata.ip_address || null,
        last_location: this.formatLocation(deviceMetadata),
        last_seen_at: new Date(),
      };

      // Check if device already exists for this user
      const existingDevice = await this.prisma.userDevice.findUnique({
        where: {
          user_id_device_id: {
            user_id: userId,
            device_id: deviceMetadata.device_id,
          },
        },
      });

      if (existingDevice) {
        // Update existing device
        // Reset is_current_device for all user's devices first
        await this.prisma.userDevice.updateMany({
          where: { user_id: userId },
          data: { is_current_device: false },
        });

        // Update the current device
        await this.prisma.userDevice.update({
          where: { id: existingDevice.id },
          data: {
            ...deviceData,
            is_current_device: true,
            // Only update first_seen_at if it's a new device (shouldn't happen, but safety check)
            first_seen_at: existingDevice.first_seen_at,
          },
        });

        this.logger.log(
          `Device updated for user ${userId}: ${deviceMetadata.device_id}`,
        );
      } else {
        // Reset is_current_device for all user's devices
        await this.prisma.userDevice.updateMany({
          where: { user_id: userId },
          data: { is_current_device: false },
        });

        // Create new device record
        await this.prisma.userDevice.create({
          data: {
            user_id: userId,
            ...deviceData,
            is_current_device: true,
            is_active: true,
            is_restricted: false,
          },
        });

        this.logger.log(
          `New device registered for user ${userId}: ${deviceMetadata.device_id}`,
        );
      }
    } catch (error) {
      // Log error but don't throw - device tracking shouldn't break login/registration
      this.logger.error(
        `Error registering device for user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Map platform string to Platform enum
   */
  private mapPlatformToEnum(platform: string): Platform {
    const normalized = platform.toLowerCase();
    if (normalized === 'ios' || normalized === 'iphone' || normalized === 'ipad') {
      return Platform.ios;
    }
    if (normalized === 'android') {
      return Platform.android;
    }
    // Default to ios if unknown (can be changed based on your preference)
    this.logger.warn(`Unknown platform: ${platform}, defaulting to ios`);
    return Platform.ios;
  }

  /**
   * Format location string from device metadata
   */
  private formatLocation(deviceMetadata: DeviceMetadataDto): string | null {
    // You can enhance this to use geocoding API if needed
    // For now, return null or a simple format
    if (deviceMetadata.latitude && deviceMetadata.longitude) {
      return `${deviceMetadata.latitude}, ${deviceMetadata.longitude}`;
    }
    return null;
  }

  /**
   * Register device from registration progress
   * Called when user completes registration and User record is created
   * This method extracts device metadata from RegistrationProgress and creates UserDevice record
   */
  async registerDeviceFromRegistrationProgress(
    userId: string,
    registrationProgressId: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Registering device from registration progress for user ${userId}`,
      );

      // Get registration progress to extract device metadata
      const registrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { id: registrationProgressId },
        select: { device_metadata: true },
      });

      if (!registrationProgress || !registrationProgress.device_metadata) {
        this.logger.warn(
          `No device metadata found in registration progress ${registrationProgressId}`,
        );
        return;
      }

      const deviceMetadata = registrationProgress.device_metadata as any;

      // Convert to DeviceMetadataDto format
      const deviceMetadataDto: DeviceMetadataDto = {
        device_id: deviceMetadata.device_id,
        device_name: deviceMetadata.device_name,
        device_model: deviceMetadata.device_model,
        platform: deviceMetadata.platform,
        os_name: deviceMetadata.os_name,
        os_version: deviceMetadata.os_version,
        app_version: deviceMetadata.app_version,
        ip_address: deviceMetadata.ip_address || ipAddress,
        latitude: deviceMetadata.latitude,
        longitude: deviceMetadata.longitude,
      };
      
      // Add device_fingerprint to the object (not in DTO but needed for tracking)
      (deviceMetadataDto as any).device_fingerprint = deviceMetadata.device_fingerprint;

      // Register the device
      await this.registerOrUpdateDevice(userId, deviceMetadataDto, ipAddress);

      this.logger.log(
        `Device registered from registration progress for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error registering device from registration progress: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * List all devices (sessions) for a user
   * Returns all devices with their status, location, and last login time
   */
  async getUserDevices(userId: string): Promise<any[]> {
    try {
      this.logger.log(`Fetching devices for user ${userId}`);

      const devices = await this.prisma.userDevice.findMany({
        where: { user_id: userId },
        orderBy: { last_seen_at: 'desc' }, // Most recently used first
        select: {
          id: true,
          device_id: true,
          device_name: true,
          device_model: true,
          platform: true,
          os_name: true,
          os_version: true,
          app_version: true,
          is_active: true,
          is_restricted: true,
          is_current_device: true,
          last_ip_address: true,
          last_location: true,
          first_seen_at: true,
          last_seen_at: true,
          restricted_at: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`Found ${devices.length} device(s) for user ${userId}`);

      return devices;
    } catch (error) {
      this.logger.error(
        `Error fetching devices for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete/restrict a device (session) for a user
   * Sets is_active = false and is_restricted = true
   * Optionally can be used to completely delete the device record
   */
  async deleteUserDevice(
    userId: string,
    deviceId: string,
    hardDelete: boolean = false,
  ): Promise<void> {
    try {
      this.logger.log(
        `Deleting device ${deviceId} for user ${userId}. Hard delete: ${hardDelete}`,
      );

      // First, verify the device belongs to the user
      const device = await this.prisma.userDevice.findUnique({
        where: {
          user_id_device_id: {
            user_id: userId,
            device_id: deviceId,
          },
        },
      });

      if (!device) {
        throw new Error(`Device ${deviceId} not found for user ${userId}`);
      }

      if (hardDelete) {
        // Permanently delete the device record
        await this.prisma.userDevice.delete({
          where: {
            user_id_device_id: {
              user_id: userId,
              device_id: deviceId,
            },
          },
        });

        this.logger.log(
          `Device ${deviceId} permanently deleted for user ${userId}`,
        );
      } else {
        // Soft delete: Mark as inactive and restricted
        await this.prisma.userDevice.update({
          where: {
            user_id_device_id: {
              user_id: userId,
              device_id: deviceId,
            },
          },
          data: {
            is_active: false,
            is_restricted: true,
            is_current_device: false,
            restricted_at: new Date(),
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Device ${deviceId} deactivated and restricted for user ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error deleting device ${deviceId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}


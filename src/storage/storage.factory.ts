import { Injectable, Logger } from '@nestjs/common';
import { IStorageProvider } from './providers/storage-provider.interface';
import { CloudinaryStorageProvider } from './providers/cloudinary-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

@Injectable()
export class StorageProviderFactory {
  private readonly logger = new Logger(StorageProviderFactory.name);
  private provider: IStorageProvider | null = null;

  getProvider(): IStorageProvider {
    if (this.provider) return this.provider;

    const providerName = (process.env.STORAGE_PROVIDER || 'cloudinary').toLowerCase();
    this.logger.log(`Initializing storage provider: ${providerName}`);

    switch (providerName) {
      case 'cloudinary':
        this.provider = new CloudinaryStorageProvider();
        break;

      case 'aws-s3':
      case 's3':
        this.provider = new S3StorageProvider();
        break;

      default:
        this.logger.warn(`Unknown storage provider "${providerName}", defaulting to Cloudinary`);
        this.provider = new CloudinaryStorageProvider();
    }

    return this.provider;
  }

  getAvailableProviders(): string[] {
    return ['cloudinary', 'aws-s3'];
  }
}

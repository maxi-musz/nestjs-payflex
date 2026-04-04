import { Injectable, Logger } from '@nestjs/common';
import { IStorageProvider } from './providers/storage-provider.interface';
import { CloudinaryStorageProvider } from './providers/cloudinary-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

/** Normalize STORAGE_PROVIDER env: aws_s3 | aws-s3 | s3 → aws_s3; cloudinary → cloudinary */
function normalizeStorageProviderEnv(raw: string | undefined): string {
  const v = (raw ?? 'aws_s3').trim().toLowerCase().replace(/-/g, '_');
  if (v === 's3') return 'aws_s3';
  return v;
}

@Injectable()
export class StorageProviderFactory {
  private readonly logger = new Logger(StorageProviderFactory.name);
  private provider: IStorageProvider | null = null;

  getProvider(): IStorageProvider {
    if (this.provider) return this.provider;

    const providerName = normalizeStorageProviderEnv(process.env.STORAGE_PROVIDER);
    this.logger.log(`Initializing storage provider: ${providerName}`);

    switch (providerName) {
      case 'cloudinary':
        this.provider = new CloudinaryStorageProvider();
        break;

      case 'aws_s3':
        this.provider = new S3StorageProvider();
        break;

      default:
        this.logger.warn(
          `Unknown STORAGE_PROVIDER "${process.env.STORAGE_PROVIDER}", defaulting to aws_s3`,
        );
        this.provider = new S3StorageProvider();
    }

    return this.provider;
  }

  getAvailableProviders(): string[] {
    return ['aws_s3', 'cloudinary'];
  }
}

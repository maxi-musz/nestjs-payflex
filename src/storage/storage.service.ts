import { Injectable, Logger } from '@nestjs/common';
import { StorageProviderFactory } from './storage.factory';
import {
  UploadResult,
  UploadOptions,
  DeleteResult,
  SignedUrlResult,
} from './providers/storage-provider.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly factory: StorageProviderFactory) {}

  get providerName(): string {
    return this.factory.getProvider().getProviderName();
  }

  async upload(file: Express.Multer.File, options?: UploadOptions): Promise<UploadResult> {
    const provider = this.factory.getProvider();
    this.logger.log(`Uploading ${file.originalname} (${file.size} bytes) via ${provider.getProviderName()}`);
    return provider.uploadFile(file, options);
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const provider = this.factory.getProvider();
    this.logger.log(`Uploading buffer "${filename}" (${buffer.length} bytes) via ${provider.getProviderName()}`);
    return provider.uploadBuffer(buffer, filename, mimetype, options);
  }

  async delete(publicId: string): Promise<DeleteResult> {
    const provider = this.factory.getProvider();
    this.logger.log(`Deleting ${publicId} via ${provider.getProviderName()}`);
    return provider.deleteFile(publicId);
  }

  async getSignedUrl(publicId: string, expiresInSeconds?: number): Promise<SignedUrlResult> {
    return this.factory.getProvider().getSignedUrl(publicId, expiresInSeconds);
  }
}

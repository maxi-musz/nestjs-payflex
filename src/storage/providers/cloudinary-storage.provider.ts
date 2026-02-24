import { Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import {
  IStorageProvider,
  UploadResult,
  UploadOptions,
  DeleteResult,
  SignedUrlResult,
} from './storage-provider.interface';

export class CloudinaryStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(CloudinaryStorageProvider.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      this.logger.warn('CLOUDINARY_CLOUD_NAME is not set — uploads will fail');
    }
  }

  getProviderName(): string {
    return 'cloudinary';
  }

  async uploadFile(file: Express.Multer.File, options?: UploadOptions): Promise<UploadResult> {
    return this.uploadBuffer(file.buffer, file.originalname, file.mimetype, options);
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const resourceType = options?.resource_type || this.inferResourceType(mimetype);

    const uploadOptions: Record<string, any> = {
      folder: options?.folder || 'smipay',
      resource_type: resourceType,
      overwrite: options?.overwrite ?? true,
      tags: options?.tags,
    };

    if (options?.public_id) uploadOptions.public_id = options.public_id;
    if (options?.allowed_formats) uploadOptions.allowed_formats = options.allowed_formats;
    if (options?.transformation) uploadOptions.transformation = options.transformation;

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) return reject(error);
          resolve(result!);
        });
        stream.end(buffer);
      });

      this.logger.log(`Uploaded to Cloudinary: ${result.public_id} (${result.bytes} bytes)`);

      return {
        success: true,
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        original_filename: result.original_filename,
        format: result.format,
        size_bytes: result.bytes,
        width: result.width,
        height: result.height,
        provider: 'cloudinary',
        raw_response: result,
      };
    } catch (error: any) {
      this.logger.error(`Cloudinary upload failed: ${error.message}`);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async deleteFile(publicId: string): Promise<DeleteResult> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted from Cloudinary: ${publicId}`);
      return { success: true, public_id: publicId, provider: 'cloudinary' };
    } catch (error: any) {
      this.logger.error(`Cloudinary delete failed: ${error.message}`);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async getSignedUrl(publicId: string, expiresInSeconds = 3600): Promise<SignedUrlResult> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const url = cloudinary.url(publicId, {
      sign_url: true,
      type: 'authenticated',
      secure: true,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
    });

    return { url, expires_at: expiresAt };
  }

  private inferResourceType(mimetype: string): 'image' | 'video' | 'raw' | 'auto' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    return 'raw';
  }
}

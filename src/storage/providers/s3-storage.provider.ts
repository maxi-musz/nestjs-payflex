import { Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import {
  IStorageProvider,
  UploadResult,
  UploadOptions,
  DeleteResult,
  SignedUrlResult,
} from './storage-provider.interface';

export class S3StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnBaseUrl?: string;

  constructor() {
    this.region = process.env.AWS_S3_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET || '';
    this.cdnBaseUrl = process.env.AWS_S3_CDN_URL || undefined;

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    if (!this.bucket) {
      this.logger.warn('AWS_S3_BUCKET is not set — uploads will fail');
    }
  }

  getProviderName(): string {
    return 'aws-s3';
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
    const ext = path.extname(filename) || this.mimeToExt(mimetype);
    const folder = options?.folder || 'smipay';
    const publicId = options?.public_id || `${folder}/${randomUUID()}${ext}`;
    const key = publicId.startsWith('/') ? publicId.slice(1) : publicId;

    if (options?.max_file_size && buffer.length > options.max_file_size) {
      throw new Error(`File size ${buffer.length} exceeds maximum ${options.max_file_size} bytes`);
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          Metadata: options?.metadata,
          Tagging: options?.tags?.map((t) => `${t}=${t}`).join('&'),
        }),
      );

      const baseUrl = this.cdnBaseUrl || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
      const fileUrl = `${baseUrl}/${key}`;

      this.logger.log(`Uploaded to S3: ${key} (${buffer.length} bytes)`);

      return {
        success: true,
        url: fileUrl,
        secure_url: fileUrl,
        public_id: key,
        original_filename: path.basename(filename, ext),
        format: ext.replace('.', ''),
        size_bytes: buffer.length,
        provider: 'aws-s3',
      };
    } catch (error: any) {
      this.logger.error(`S3 upload failed: ${error.message}`);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async deleteFile(publicId: string): Promise<DeleteResult> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: publicId,
        }),
      );
      this.logger.log(`Deleted from S3: ${publicId}`);
      return { success: true, public_id: publicId, provider: 'aws-s3' };
    } catch (error: any) {
      this.logger.error(`S3 delete failed: ${error.message}`);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async getSignedUrl(publicId: string, expiresInSeconds = 3600): Promise<SignedUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: publicId,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return { url, expires_at: expiresAt };
  }

  private mimeToExt(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'application/pdf': '.pdf',
    };
    return map[mimetype] || '';
  }
}

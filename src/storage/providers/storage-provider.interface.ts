export interface UploadResult {
  success: boolean;
  url: string;
  secure_url: string;
  public_id: string;
  original_filename?: string;
  format?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  provider: string;
  raw_response?: any;
}

export interface UploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: Record<string, any>;
  allowed_formats?: string[];
  max_file_size?: number;
  tags?: string[];
  overwrite?: boolean;
  metadata?: Record<string, string>;
}

export interface DeleteResult {
  success: boolean;
  public_id: string;
  provider: string;
}

export interface SignedUrlResult {
  url: string;
  expires_at: Date;
}

export interface IStorageProvider {
  getProviderName(): string;

  uploadFile(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  deleteFile(publicId: string): Promise<DeleteResult>;

  getSignedUrl(publicId: string, expiresInSeconds?: number): Promise<SignedUrlResult>;
}

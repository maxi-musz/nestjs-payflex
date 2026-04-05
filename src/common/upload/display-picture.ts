import { BadRequestException } from '@nestjs/common';

export const DISPLAY_PICTURE_MAX_BYTES = 5 * 1024 * 1024;

export const DISPLAY_PICTURE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export const PROFILE_IMAGE_UPLOAD_OPTIONS = {
  folder: 'smipay/profile-images',
  resource_type: 'image' as const,
  allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
};

export function validateProfileImageFile(
  file: Express.Multer.File | undefined,
): asserts file is Express.Multer.File {
  if (!file?.buffer?.length) {
    throw new BadRequestException(
      'Image file is required. Send multipart field name: file',
    );
  }
  if (!DISPLAY_PICTURE_MIMES.has(file.mimetype)) {
    throw new BadRequestException(
      'Only JPEG, PNG, GIF, or WebP images are allowed',
    );
  }
  if (file.size > DISPLAY_PICTURE_MAX_BYTES) {
    throw new BadRequestException('Image must be 5MB or smaller');
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { DeviceMetadata as DeviceMetadataType } from '../device-metadata/device-metadata.types';

/**
 * Use in controllers to inject device metadata attached by deviceMetadataMiddleware.
 * Example: @GetDeviceMetadata() meta: DeviceMetadata | undefined
 */
export const GetDeviceMetadata = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DeviceMetadataType | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.deviceMetadata;
  },
);

import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class DataLimitsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const body = req.body || {};

    if (!user?.sub) throw new ForbiddenException('Unauthorized');

    const serviceID: string = body.serviceID;
    const variation_code: string = body.variation_code;

    const validDataServiceIDs = ['mtn-data', 'airtel-data', 'glo-data', 'etisalat-data', 'smile-direct', 'spectranet', 'glo-sme-data'];
    if (!serviceID || !validDataServiceIDs.includes(serviceID)) {
      throw new BadRequestException(`Invalid serviceID. Must be one of: ${validDataServiceIDs.join(', ')}`);
    }

    if (!variation_code) {
      throw new BadRequestException('variation_code is required');
    }

    return true;
  }
}

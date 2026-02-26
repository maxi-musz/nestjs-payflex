import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { VALID_EDUCATION_SERVICE_IDS } from '../dto/purchase-education.dto';

@Injectable()
export class EducationLimitsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const body = req.body || {};

    if (!user?.sub) throw new ForbiddenException('Unauthorized');

    const serviceID: string = body.serviceID;
    const variation_code: string = body.variation_code;
    const phone: string = body.phone;

    if (!serviceID || !VALID_EDUCATION_SERVICE_IDS.includes(serviceID as any)) {
      throw new BadRequestException(`Invalid serviceID. Must be one of: ${VALID_EDUCATION_SERVICE_IDS.join(', ')}`);
    }

    if (!variation_code) {
      throw new BadRequestException('variation_code is required');
    }

    if (!phone) {
      throw new BadRequestException('phone is required');
    }

    if (serviceID === 'jamb' && !body.billersCode) {
      throw new BadRequestException('billersCode (JAMB Profile ID) is required for JAMB purchases');
    }

    if (body.quantity !== undefined) {
      const qty = Number(body.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
        throw new BadRequestException('quantity must be an integer between 1 and 10');
      }
    }

    return true;
  }
}

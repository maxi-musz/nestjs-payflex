import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VALID_ELECTRICITY_SERVICE_IDS } from '../dto/purchase-electricity.dto';

@Injectable()
export class ElectricityLimitsGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const body = req.body || {};

    if (!user?.sub) throw new ForbiddenException('Unauthorized');

    const serviceID: string = body.serviceID;
    const variation_code: string = body.variation_code;
    const amount: number = Number(body.amount) || 0;

    if (!serviceID || !VALID_ELECTRICITY_SERVICE_IDS.includes(serviceID as any)) {
      throw new BadRequestException(`Invalid serviceID. Must be one of: ${VALID_ELECTRICITY_SERVICE_IDS.join(', ')}`);
    }

    if (!variation_code || !['prepaid', 'postpaid'].includes(variation_code)) {
      throw new BadRequestException('variation_code must be either prepaid or postpaid');
    }

    if (!amount || amount <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }

    const min = Number(this.config.get('ELECTRICITY_MIN_AMOUNT') || 500);
    const max = Number(this.config.get('ELECTRICITY_MAX_AMOUNT') || 500000);
    if (amount < min || amount > max) {
      throw new BadRequestException(`Amount must be between ₦${min} and ₦${max}`);
    }

    return true;
  }
}

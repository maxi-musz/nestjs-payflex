import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AirtimeLimitsGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const body = req.body || {};

    if (!user?.sub) throw new ForbiddenException('Unauthorized');

    const serviceID: string = body.serviceID;
    const amount: number = Number(body.amount);

    const allowed = ['mtn', 'glo', 'airtel', 'etisalat', '9-mobile', 'foreign-airtime'];
    if (!serviceID || !allowed.includes(serviceID)) {
      throw new BadRequestException(`Invalid serviceID. Must be one of: ${allowed.join(', ')}`);
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    const min = Number(this.config.get('AIRTIME_MIN_AMOUNT') || 50);
    const max = Number(this.config.get('AIRTIME_MAX_AMOUNT') || 50000);
    if (amount < min || amount > max) {
      throw new BadRequestException(`Amount must be between ₦${min} and ₦${max}`);
    }

    return true;
  }
}

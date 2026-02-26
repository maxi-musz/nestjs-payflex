import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CableLimitsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const body = req.body || {};

    if (!user?.sub) throw new ForbiddenException('Unauthorized');

    const serviceID: string = body.serviceID;
    const subscription_type: string | undefined = body.subscription_type;
    const variation_code: string | undefined = body.variation_code;
    const amount: number = Number(body.amount) || 0;

    const validServiceIDs = ['dstv', 'gotv', 'startimes', 'showmax'];
    if (!serviceID || !validServiceIDs.includes(serviceID)) {
      throw new BadRequestException(`Invalid serviceID. Must be one of: ${validServiceIDs.join(', ')}`);
    }

    const isDstvOrGotv = serviceID === 'dstv' || serviceID === 'gotv';
    const isStartimesOrShowmax = serviceID === 'startimes' || serviceID === 'showmax';

    if (isDstvOrGotv) {
      if (!subscription_type || !['change', 'renew'].includes(subscription_type)) {
        throw new BadRequestException('subscription_type must be either change or renew for DSTV/GOTV');
      }
      if (subscription_type === 'change' && !variation_code) {
        throw new BadRequestException('variation_code is required for subscription_type=change');
      }
      if (subscription_type === 'renew' && !amount) {
        throw new BadRequestException('amount is required for subscription_type=renew (use Renewal_Amount from verify response)');
      }
    }

    if (isStartimesOrShowmax) {
      if (!variation_code) {
        throw new BadRequestException('variation_code is required for Startimes/Showmax purchases');
      }
      if (subscription_type) {
        throw new BadRequestException('subscription_type is not used for Startimes/Showmax. Omit this field.');
      }
    }

    return true;
  }
}

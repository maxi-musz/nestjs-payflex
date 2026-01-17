import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CableLimitsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const body = req.body || {};

    if (!user?.sub) throw new ForbiddenException('Unauthorized');

    const serviceID: string = body.serviceID;
    const subscription_type: string = body.subscription_type;
    const variation_code: string | undefined = body.variation_code;
    const amount: number = Number(body.amount) || 0;

    const validServiceIDs = ['dstv', 'gotv', 'startimes', 'showmax'];
    if (!serviceID || !validServiceIDs.includes(serviceID)) {
      throw new BadRequestException(`Invalid serviceID. Must be one of: ${validServiceIDs.join(', ')}`);
    }

    if (!subscription_type || !['change', 'renew'].includes(subscription_type)) {
      throw new BadRequestException('subscription_type must be either change or renew');
    }

    if (subscription_type === 'change' && !variation_code) {
      throw new BadRequestException('variation_code is required for subscription_type=change');
    }
    if (subscription_type === 'renew' && !amount) {
      throw new BadRequestException('amount is required for subscription_type=renew (use Renewal_Amount from verify response)');
    }

    // Daily limits for cable
    const dailyCountLimit = Number(this.config.get('CABLE_DAILY_COUNT_LIMIT') || 20);
    const dailyAmountLimit = Number(this.config.get('CABLE_DAILY_AMOUNT_LIMIT') || 500000);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [count, sumAgg] = await Promise.all([
      this.prisma.transactionHistory.count({
        where: { user_id: user.sub, transaction_type: 'cable', createdAt: { gte: startOfDay } }
      }),
      this.prisma.transactionHistory.aggregate({
        _sum: { amount: true },
        where: { user_id: user.sub, transaction_type: 'cable', createdAt: { gte: startOfDay } }
      })
    ]);

    const dailyAmount = Number(sumAgg._sum.amount || 0);
    if (count >= dailyCountLimit) throw new ForbiddenException('Daily cable purchase count limit reached');
    if (amount > 0 && dailyAmount + amount > dailyAmountLimit) throw new ForbiddenException('Daily cable purchase amount limit exceeded');

    return true;
  }
}



import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AirtimeLimitsGuard implements CanActivate {
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
    const amount: number = Number(body.amount);

    // Basic validations
    const allowed = ['mtn', 'glo', 'airtel', 'etisalat', '9-mobile', 'foreign-airtime'];
    if (!allowed.includes(serviceID)) throw new BadRequestException('Invalid serviceID');
    if (!amount || isNaN(amount)) throw new BadRequestException('Invalid amount');

    const min = Number(this.config.get('AIRTIME_MIN_AMOUNT') || 50);
    const max = Number(this.config.get('AIRTIME_MAX_AMOUNT') || 50000);
    if (amount < min || amount > max) throw new BadRequestException(`Amount must be between ${min} and ${max}`);

    // Daily limits
    const dailyCountLimit = Number(this.config.get('AIRTIME_DAILY_COUNT_LIMIT') || 20);
    const dailyAmountLimit = Number(this.config.get('AIRTIME_DAILY_AMOUNT_LIMIT') || 200000);
    console.log(`Airtime limits guard - Daily count limit: ${dailyCountLimit}, Daily amount limit: ${dailyAmountLimit}`);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [count, sumAgg] = await Promise.all([
      this.prisma.transactionHistory.count({
        where: { user_id: user.sub, transaction_type: 'airtime', createdAt: { gte: startOfDay } }
      }),
      this.prisma.transactionHistory.aggregate({
        _sum: { amount: true },
        where: { user_id: user.sub, transaction_type: 'airtime', createdAt: { gte: startOfDay } }
      })
    ]);

    const dailyAmount = Number(sumAgg._sum.amount || 0);

    if (count >= dailyCountLimit) throw new ForbiddenException('Daily airtime purchase count limit reached');
    if (dailyAmount + amount > dailyAmountLimit) throw new ForbiddenException('Daily airtime purchase amount limit exceeded');

    return true;
  }
}



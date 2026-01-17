import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DataLimitsGuard implements CanActivate {
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
    const variation_code: string = body.variation_code;
    const amount: number = Number(body.amount) || 0;

    // Basic validations
    const validDataServiceIDs = ['mtn-data', 'airtel-data', 'glo-data', 'etisalat-data', 'smile-direct', 'spectranet', 'glo-sme-data'];
    if (!serviceID || !validDataServiceIDs.includes(serviceID)) {
      throw new BadRequestException(`Invalid serviceID. Must be one of: ${validDataServiceIDs.join(', ')}`);
    }
    if (!variation_code) throw new BadRequestException('variation_code is required');

    // Daily limits
    const dailyCountLimit = Number(this.config.get('DATA_DAILY_COUNT_LIMIT') || 20);
    const dailyAmountLimit = Number(this.config.get('DATA_DAILY_AMOUNT_LIMIT') || 500000);
    console.log(`Data limits guard - Daily count limit: ${dailyCountLimit}, Daily amount limit: ${dailyAmountLimit}`);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [count, sumAgg] = await Promise.all([
      this.prisma.transactionHistory.count({
        where: { user_id: user.sub, transaction_type: 'data', createdAt: { gte: startOfDay } }
      }),
      this.prisma.transactionHistory.aggregate({
        _sum: { amount: true },
        where: { user_id: user.sub, transaction_type: 'data', createdAt: { gte: startOfDay } }
      })
    ]);

    const dailyAmount = Number(sumAgg._sum.amount || 0);

    if (count >= dailyCountLimit) throw new ForbiddenException('Daily data purchase count limit reached');
    if (amount > 0 && dailyAmount + amount > dailyAmountLimit) throw new ForbiddenException('Daily data purchase amount limit exceeded');

    return true;
  }
}


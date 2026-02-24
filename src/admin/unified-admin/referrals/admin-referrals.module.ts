import { Module } from '@nestjs/common';
import { AdminReferralsController } from './admin-referrals.controller';
import { ReferralModule } from '../../../referral/referral.module';

@Module({
  imports: [ReferralModule],
  controllers: [AdminReferralsController],
})
export class AdminReferralsModule {}

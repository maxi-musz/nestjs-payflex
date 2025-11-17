import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Referral Code Validation Service
 */
@Injectable()
export class ReferralValidator {
  private readonly logger = new Logger(ReferralValidator.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate referral code exists and is valid
   * Returns the referrer user ID if valid, null otherwise
   */
  async validateReferralCode(referralCode: string | undefined): Promise<string | null> {
    if (!referralCode) {
      this.logger.log('No referral code provided, skipping validation');
      return null; // Optional field, skip if not provided
    }

    try {
      this.logger.log(`Validating referral code: ${referralCode}...`);

      // Check if referral code exists in User table
      const userWithReferral = await this.prisma.user.findFirst({
        where: {
          OR: [
            { referral_code: referralCode },
            { smipay_tag: referralCode },
          ],
        },
        select: { id: true, referral_code: true, smipay_tag: true },
      });

      if (!userWithReferral) {
        this.logger.warn(`Invalid referral code attempted: ${referralCode}`);
        return null; // Invalid code, but don't throw (optional field)
      }

      this.logger.log(
        `Valid referral code: ${referralCode} (Referrer User ID: ${userWithReferral.id})`,
      );

      return userWithReferral.id;
    } catch (error) {
      this.logger.error(`Error validating referral code ${referralCode}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Save referral relationship
   * Creates a referral record linking the referrer to the new user's phone number
   */
  async saveReferralRelationship(
    referrerId: string,
    refereePhoneNumber: string,
    referralCodeUsed: string,
    registrationProgressId?: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Saving referral relationship: Referrer ${referrerId} -> Referee ${refereePhoneNumber}`,
      );

      // Check if referral already exists (prevent duplicates)
      const existingReferral = await this.prisma.referral.findUnique({
        where: {
          referee_phone_number_referrer_id: {
            referee_phone_number: refereePhoneNumber,
            referrer_id: referrerId,
          },
        },
      });

      if (existingReferral) {
        this.logger.warn(
          `Referral relationship already exists for ${refereePhoneNumber} from referrer ${referrerId}`,
        );
        return;
      }

      // Create referral relationship
      await this.prisma.referral.create({
        data: {
          referrer_id: referrerId,
          referee_phone_number: refereePhoneNumber,
          referral_code_used: referralCodeUsed,
          registration_progress_id: registrationProgressId,
          is_active: true,
          reward_given: false,
        },
      });

      this.logger.log(
        `Referral relationship saved successfully: Referrer ${referrerId} -> Referee ${refereePhoneNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Error saving referral relationship: ${error.message}`,
        error.stack,
      );
      // Don't throw - referral tracking failure shouldn't block registration
      this.logger.warn('Continuing registration despite referral save failure');
    }
  }
}


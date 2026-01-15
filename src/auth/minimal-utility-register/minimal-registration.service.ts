import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import {
  RequestEmailOTPDto,
  VerifyEmailOTPDto,
  MinimalRegisterDto,
} from './dto/minimal-registration.dto';
import { EmailService } from 'src/common/mailer/email.service';
import { PhoneValidator } from '../helpers/phone.validator';
import { ReferralValidator } from '../helpers/referral.validator';
import { generateSmipayTag } from 'src/common/helper_functions/generators';
import * as argon from 'argon2';
import * as colors from 'colors';
import * as crypto from 'crypto';

/**
 * Minimal Utility Registration Service
 * 
 * This service handles minimal registration for utility operations (bills payment, airtime, data, etc.)
 * while licenses are pending approval. It provides a streamlined registration process:
 * 
 * 1. Request Email OTP - User provides email, receives OTP
 * 2. Verify Email OTP - User verifies email with OTP
 * 3. Register - User completes registration with basic info
 * 
 * Security features:
 * - Rate limiting (handled by guards)
 * - Input trimming and sanitization
 * - Email verification requirement
 * - Password strength validation
 * - Phone number validation
 */
@Injectable()
export class MinimalRegistrationService {
  private readonly logger = new Logger(MinimalRegistrationService.name);
  private readonly OTP_EXPIRY_MINUTES = 5;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private emailService: EmailService,
    private referralValidator: ReferralValidator,
  ) {}

  /**
   * Request Email OTP (Step 1)
   * 
   * Checks if email already exists in the system.
   * If email exists, throws ConflictException.
   * If email doesn't exist, generates and sends OTP.
   * 
   * @param dto - RequestEmailOTPDto containing email
   * @returns ApiResponseDto with success status
   */
  async requestEmailOTP(
    dto: RequestEmailOTPDto,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(`Requesting email OTP for minimal registration: ${dto.email}`),
    );

    try {
      // Email is already trimmed and lowercased by DTO transform
      const email = dto.email;

      // 1. Check if email already exists in User table
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
        select: { 
          id: true, 
          email: true,
          is_email_verified: true,
          password: true, // If password exists, user completed registration
        },
      });

      // Only block if user exists AND is fully registered (has password) or email is verified
      // If user exists but not verified, allow them to request a new OTP
      if (existingUser && (existingUser.password || existingUser.is_email_verified)) {
        this.logger.warn(
          colors.yellow(
            `Email ${email} already registered. User ID: ${existingUser.id}`,
          ),
        );
        throw new ConflictException(
          'This email is already registered. Please login instead or use a different email.',
        );
      }

      // 2. Generate 4-digit OTP
      const otp = crypto.randomInt(1000, 9999).toString();
      const otpExpiresAt = new Date(
        Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
      );

      // 3. Create or update User record with email and temporary phone number
      // We use a temporary phone number format that will be updated in step 3
      const tempPhoneNumber = `temp_${email.replace('@', '_at_').replace(/\./g, '_')}`;
      
      // If user exists but not verified, update with new OTP
      // If user doesn't exist, create new user
      if (existingUser) {
        // Update existing user with new OTP (user exists but not verified/registered)
        await this.prisma.user.update({
          where: { email },
          data: {
            otp,
            otp_expires_at: otpExpiresAt,
            is_email_verified: false, // Reset verification status for new OTP
            updatedAt: new Date(),
          },
        });
        this.logger.log(
          colors.blue(
            `Updating existing unverified user ${existingUser.id} with new OTP`,
          ),
        );
      } else {
        // Create new user with email and temporary phone number
        await this.prisma.user.create({
          data: {
            email: email,
            phone_number: tempPhoneNumber, // Temporary phone, will be updated in step 3
            otp,
            otp_expires_at: otpExpiresAt,
            is_email_verified: false,
            account_status: 'active',
          },
        });
        this.logger.log(
          colors.blue(`Created new user record for email: ${email}`),
        );
      }

      // 4. Send OTP via email
      try {
        await this.emailService.sendOTPEmail(
          email,
          otp,
          `${this.OTP_EXPIRY_MINUTES} minutes`,
        );
        this.logger.log(
          colors.magenta(
            `OTP code: ${otp} sent to email: ${email} for minimal registration`,
          ),
        );
      } catch (emailError: any) {
        // Log detailed error server-side only
        this.logger.error(
          colors.red(
            `Failed to send OTP email to ${email}: ${emailError.message}`,
          ),
          emailError.stack,
        );

        // Clear the stored OTP since sending failed
        try {
          await this.prisma.user.updateMany({
            where: {
              email: email,
            },
            data: {
              otp: null,
              otp_expires_at: null,
            },
          });
        } catch (clearError) {
          this.logger.error(
            colors.red(
              `Failed to clear OTP after sending failure for ${email}: ${clearError.message}`,
            ),
          );
        }

        // Return user-friendly error message
        throw new HttpException(
          'Failed to send OTP email. Please check your email address and try again, or contact support if the issue persists.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      this.logger.log(
        colors.green(
          `Email OTP requested successfully for ${email}. OTP expires in ${this.OTP_EXPIRY_MINUTES} minutes.`,
        ),
      );

      return new ApiResponseDto(
        true,
        `OTP successfully sent to: ${email}. Please check your email.`,
        {
          email: email,
          otp_expires_in: this.OTP_EXPIRY_MINUTES * 60, // in seconds
          message: `OTP will expire in ${this.OTP_EXPIRY_MINUTES} minutes.`,
        },
      );
    } catch (error) {
      this.logger.error(
        colors.red(`Email OTP request error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        (error instanceof HttpException &&
          error.getStatus() === HttpStatus.SERVICE_UNAVAILABLE)
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to request email OTP',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify Email OTP (Step 2)
   * 
   * Verifies the OTP sent to the user's email.
   * Marks email as verified in the registration progress.
   * 
   * @param dto - VerifyEmailOTPDto containing email and OTP
   * @returns ApiResponseDto with verification status
   */
  async verifyEmailOTP(
    dto: VerifyEmailOTPDto,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(
        `Verifying email OTP for minimal registration: ${dto.email}`,
      ),
    );

    try {
      // Email and OTP are already trimmed by DTO transform
      const email = dto.email;
      const otp = dto.otp;

      // 1. Check if email already exists in User table (shouldn't happen if flow is correct)
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        this.logger.warn(
          colors.yellow(
            `Email ${email} already registered. User ID: ${existingUser.id}`,
          ),
        );
        throw new ConflictException(
          'This email is already registered. Please login instead.',
        );
      }

      // 2. Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.logger.error(
          colors.red(
            `No user found for email: ${email}. Please request OTP first.`,
          ),
        );
        throw new BadRequestException(
          'No active registration found. Please request an OTP first.',
        );
      }

      // 3. Check if OTP exists
      if (!user.otp) {
        this.logger.error(
          colors.red(`No OTP found for email: ${email}. Please request a new OTP.`),
        );
        throw new BadRequestException(
          'No OTP found. Please request a new OTP.',
        );
      }

      // 4. Check if OTP is expired
      if (
        !user.otp_expires_at ||
        new Date() > new Date(user.otp_expires_at)
      ) {
        this.logger.error(
          colors.red(`OTP expired for email: ${email}. Please request a new OTP.`),
        );
        throw new BadRequestException(
          'OTP has expired. Please request a new OTP.',
        );
      }

      // 5. Verify OTP matches
      if (user.otp !== otp) {
        this.logger.warn(
          colors.yellow(
            `Invalid OTP provided for email: ${email}. Expected: ${user.otp}, Provided: ${otp}`,
          ),
        );
        throw new BadRequestException(
          'Invalid OTP. Please check and try again.',
        );
      }

      // 6. OTP is valid - mark email as verified
      await this.prisma.user.update({
        where: { email },
        data: {
          is_email_verified: true,
          otp: null, // Clear OTP after successful verification
          otp_expires_at: null,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        colors.green(
          `Email OTP verified successfully for ${email}. User can now proceed to registration.`,
        ),
      );

      return new ApiResponseDto(
        true,
        'Email verified successfully. You can now proceed to complete your registration.',
        {
          email: email,
          email_verified: true,
          can_proceed: true,
          next_step: 'REGISTRATION',
        },
      );
    } catch (error) {
      this.logger.error(
        colors.red(`Email OTP verification error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to verify email OTP',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Register User (Step 3 - Final Step)
   * 
   * Creates a new user account after email verification.
   * Validates that email has been verified.
   * Creates user, wallet, and initializes account.
   * 
   * @param dto - MinimalRegisterDto containing user information
   * @returns ApiResponseDto with user information
   */
  async register(
    dto: MinimalRegisterDto,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(
        `Completing minimal registration for email: ${dto.email}, phone: ${dto.phone_number}`,
      ),
    );

    try {
      // All fields are already trimmed and validated by DTO transform
      const email = dto.email;
      const phoneNumber = PhoneValidator.formatPhoneToE164(dto.phone_number);
      const firstName = dto.first_name;
      const lastName = dto.last_name;

      // 1. Validate phone number format
      if (!PhoneValidator.validatePhoneNumber(phoneNumber)) {
        throw new BadRequestException(
          'Phone number must be in format: 234XXXXXXXXXX',
        );
      }

      // 2. Check if email already exists and verify email verification status
      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { 
          id: true, 
          is_email_verified: true,
          password: true, // If password exists, user is fully registered
        },
      });

      if (!existingUserByEmail) {
        throw new BadRequestException(
          'No registration session found. Please verify your email first.',
        );
      }

      // Check if this is a different user (not the one who requested OTP)
      // If user has password, they're fully registered
      if (existingUserByEmail.password) {
        this.logger.warn(
          colors.yellow(
            `Email ${email} already registered. User ID: ${existingUserByEmail.id}`,
          ),
        );
        throw new ConflictException(
          'This email is already registered. Please login instead.',
        );
      }

      // Verify email has been verified
      if (!existingUserByEmail.is_email_verified) {
        throw new BadRequestException(
          'Email verification required. Please verify your email first.',
        );
      }

      // 3. Check if phone number already exists in User table (different user)
      const existingUserByPhone = await this.prisma.user.findFirst({
        where: { 
          phone_number: phoneNumber,
          password: { not: null }, // Only check fully registered users
        },
        select: { id: true },
      });

      if (existingUserByPhone) {
        this.logger.warn(
          colors.yellow(
            `Phone number ${phoneNumber} already registered. User ID: ${existingUserByPhone.id}`,
          ),
        );
        throw new ConflictException(
          'This phone number is already registered. Please login instead.',
        );
      }

      // 4. Validate referral code if provided and get referrer ID
      let referrerId: string | null = null;
      if (dto.referral_code) {
        referrerId = await this.referralValidator.validateReferralCode(
          dto.referral_code,
        );
        if (!referrerId) {
          this.logger.warn(
            colors.yellow(
              `Invalid referral code provided: ${dto.referral_code}. Continuing registration without referral.`,
            ),
          );
          // Don't throw error - referral code is optional, just log warning
        }
      }

      // 6. Hash password
      const passwordHash = await argon.hash(dto.password);
      this.logger.log(colors.green('Password hashed successfully'));

      // 7. Generate unique Smipay tag
      const smipayTag = await generateSmipayTag(this.prisma);
      this.logger.log(colors.green(`Smipay tag generated: ${smipayTag}`));

      // 8. Update existing user with complete registration details
      // The user was created in step 1 with email and temporary phone number
      const newUser = await this.prisma.user.update({
        where: { email },
        data: {
          phone_number: phoneNumber, // Update with real phone number
          password: passwordHash,
          hash: passwordHash,
          smipay_tag: smipayTag,
          first_name: firstName,
          last_name: lastName,
          referral_code: dto.referral_code || null, // Save referral code to user
          is_email_verified: true, // Email is verified via OTP
          is_phone_verified: false, // Phone not verified in minimal registration
          agree_to_terms: true, // Implied by completing registration
          updates_opt_in: false, // Default
          account_status: 'active',
          otp: null, // Clear any remaining OTP
          otp_expires_at: null,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        colors.green(`User created successfully: ${newUser.id}`),
      );

      // 9. Save referral relationship if valid referral code was provided
      if (dto.referral_code && referrerId) {
        try {
          await this.referralValidator.saveReferralRelationship(
            referrerId,
            phoneNumber,
            dto.referral_code,
            undefined, // No registration progress ID needed
          );
          this.logger.log(
            colors.green(
              `Referral relationship saved: Referrer ${referrerId} -> New User ${newUser.id}`,
            ),
          );
        } catch (referralError) {
          // Log error but don't fail registration
          this.logger.error(
            colors.yellow(
              `Failed to save referral relationship: ${referralError.message}. Registration continues.`,
            ),
          );
        }
      }

      // 10. Create Wallet
      try {
        await this.prisma.wallet.create({
          data: {
            user_id: newUser.id,
            current_balance: 0,
            all_time_fuunding: 0,
            all_time_withdrawn: 0,
            isActive: true,
          },
        });
        this.logger.log(colors.green('Wallet created successfully'));
      } catch (walletError) {
        this.logger.error(
          colors.red(`Error creating wallet: ${walletError.message}`),
        );
        // Don't fail registration if wallet creation fails - can be retried
      }

      // 11. Update referral relationship with user ID (if referral exists)
      if (dto.referral_code && referrerId) {
        try {
          await this.prisma.referral.updateMany({
            where: {
              referee_phone_number: phoneNumber,
              referrer_id: referrerId,
              referee_user_id: null, // Only update if not already linked
            },
            data: {
              referee_user_id: newUser.id,
            },
          });
          this.logger.log(
            colors.green(
              `Referral relationship updated with user ID: ${newUser.id}`,
            ),
          );
        } catch (referralUpdateError) {
          // Log error but don't fail registration
          this.logger.warn(
            colors.yellow(
              `Failed to update referral relationship with user ID: ${referralUpdateError.message}`,
            ),
          );
        }
      }

      // 12. Registration is complete - user record is already updated above
      // No need to update registration progress as we're using User table directly

      this.logger.log(
        colors.magenta(
          `✅ Minimal registration completed successfully for ${email}. User ID: ${newUser.id}${dto.referral_code && referrerId ? ` (Referred by: ${referrerId})` : ''}`,
        ),
      );

      // 13. Return success response
      return new ApiResponseDto(
        true,
        'Registration completed successfully! You can now use utility services.',
        {
          registration_completed: true,
          user_id: newUser.id,
          user: {
            id: newUser.id,
            email: newUser.email,
            phone_number: newUser.phone_number,
            smipay_tag: newUser.smipay_tag,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            referral_code: newUser.referral_code,
            is_email_verified: newUser.is_email_verified,
            is_phone_verified: newUser.is_phone_verified,
            account_status: newUser.account_status,
          },
          referral_applied: dto.referral_code && referrerId ? true : false,
          can_login: true,
          message:
            'Registration completed successfully. You can now login and use utility services.',
        },
      );
    } catch (error) {
      this.logger.error(
        colors.red(`Minimal registration error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to complete registration',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}


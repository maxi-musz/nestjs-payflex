import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { CheckLoginStatusDto, VerifyPasswordDto } from './dto/registration.dto';
import { PhoneValidator } from './helpers/phone.validator';
import { RegistrationStepsHelper } from './helpers/registration-steps.config';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DeviceTrackerService } from './helpers/device-tracker.service';
import * as argon from 'argon2';
import * as colors from 'colors';
import { formatDate } from 'src/common/helper_functions/formatter';

/**
 * Login Service
 * Handles login-related operations including checking registration status
 * to determine which page the app should display
 */
@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private deviceTracker: DeviceTrackerService,
  ) {}

  /**
   * Check login/registration status
   * Returns detailed information about user's registration progress
   * Used by app to determine which page to show when user enters phone number
   * 
   * Flow:
   * 1. Check RegistrationProgress for phone number
   * 2. If is_complete is false: delegate to registration service (returns registration progress)
   * 3. If is_complete is true: return success (no token) to prompt password entry
   * 4. If no registration found: return message to start registration
   */
  async checkLoginStatus(
    dto: CheckLoginStatusDto,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(`Checking login status for ${dto.phone_number}...`),
    );

    try {
      // 1. Format and validate phone number
      const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number);
      if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
        throw new BadRequestException(
          'Phone number must be in E.164 format (+234XXXXXXXXXX)',
        );
      }

      // 2. Check RegistrationProgress first (this is the source of truth)
      const registrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (!registrationProgress) {
        // No registration found - user should start registration
        this.logger.log(
          colors.yellow(
            `No registration found for ${formattedPhone}. User should start registration.`,
          ),
        );

        return new ApiResponseDto(true, 'No registration found. Please start registration.', {
          registration_completed: false,
          has_registration_progress: false,
          current_step: 0,
          next_step: 'START_REGISTRATION',
          can_login: false,
          message: 'Please start registration to create an account.',
        });
      }

      // 3. If registration is not complete, return registration progress status
      // (This matches what registration service would return for incomplete registrations)
      if (!registrationProgress.is_complete) {
        this.logger.log(
          colors.blue(
            `Registration incomplete for ${formattedPhone}. Returning registration progress status.`,
          ),
        );

        // Return registration progress status (same format as registration service)
        const regData = registrationProgress.registration_data as any;

        // Use centralized step helper to find current step
        const currentStepInfo = RegistrationStepsHelper.findCurrentStep(
          registrationProgress,
        );

        // Build steps object using helper
        const steps = RegistrationStepsHelper.buildStepsObject(
          registrationProgress,
          regData,
        );

        // Get status message using helper
        const statusMessage = RegistrationStepsHelper.getStatusMessage(
          currentStepInfo.stepNumber,
          registrationProgress,
        );

        // Build response with all status information
        const responseData = {
          registration_completed: false,
          has_registration_progress: true,
          session_id: registrationProgress.id,
          current_step: currentStepInfo.stepNumber,
          next_step: currentStepInfo.nextStep,
          can_login: false,
          can_proceed: currentStepInfo.canProceed,
          steps: steps,
          registration_data: {
            phone_number: formattedPhone,
            referral_code: registrationProgress.referral_code,
            created_at: registrationProgress.createdAt,
            updated_at: registrationProgress.updatedAt,
          },
          message: statusMessage,
        };

        this.logger.log(
          colors.magenta(
            `Registration status retrieved for ${formattedPhone}. Step: ${currentStepInfo.stepNumber}, Next: ${currentStepInfo.nextStep}`,
          ),
        );

        return new ApiResponseDto(true, 'Registration in progress', responseData);
      }

      // 4. Registration is complete - return success (no token) to prompt password entry
      // Verify that user exists in User table
      const user = await this.prisma.user.findFirst({
        where: { phone_number: formattedPhone },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          is_email_verified: true,
        },
      });

      if (!user) {
        this.logger.error(
          colors.red(
            `Registration marked as complete but user not found in User table for ${formattedPhone}`,
          ),
        );
        throw new HttpException(
          'Registration status inconsistent. Please contact support.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(
        colors.green(
          `Registration completed for ${formattedPhone}. User should enter password.`,
        ),
      );

      return new ApiResponseDto(true, 'Registration completed. Please enter your password.', {
        registration_completed: true,
        can_login: true,
        requires_password: true,
        user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        message: 'Please enter your password to continue.',
      });
    } catch (error: any) {
      this.logger.error(
        colors.red(`Check login status error: ${error.message}`),
        error.stack,
      );

      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to check login status',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify password and return access token
   * Called after checkLoginStatus returns requires_password: true
   * Verifies password and returns access token to direct user to dashboard
   */
  async verifyPassword(
    dto: VerifyPasswordDto,
    deviceMetadata?: any,
    ipAddress?: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(`Verifying password for ${dto.phone_number}...`),
    );

    try {
      // 1. Format and validate phone number
      const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number);
      if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
        throw new BadRequestException(
          'Phone number must be in E.164 format (+234XXXXXXXXXX)',
        );
      }

      // 2. Find user by phone number
      const user = await this.prisma.user.findFirst({
        where: { phone_number: formattedPhone },
        include: {
          profile_image: true,
          kyc_verification: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // 3. Verify password
      if (!user.password) {
        throw new UnauthorizedException('Password not set. Please reset your password.');
      }

      const isPasswordValid = await argon.verify(user.password, dto.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // 4. Generate access token
      const access_token = await this.signToken(user.id, user.email);

      // 5. Track device (if device metadata is provided)
      if (deviceMetadata && deviceMetadata.device_id) {
        // Don't await - let it run in background to not slow down login
        this.deviceTracker.registerOrUpdateDevice(
          user.id,
          deviceMetadata,
          ipAddress,
        ).catch((error) => {
          this.logger.warn(
            colors.yellow(`Device tracking failed (non-critical): ${error.message}`),
          );
        });
      }

      // 6. Format user data for response
      const formattedUser = {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number || null,
        is_email_verified: user.is_email_verified,
        role: user.role || null,
        gender: user.gender || null,
        date_of_birth: user.date_of_birth || null,
        profile_image: user.profile_image?.secure_url || null,
        kyc_verified: user.kyc_verification?.is_verified || false,
        isTransactionPinSetup: !!user.transactionPinHash,
        created_at: formatDate(user.createdAt),
      };

      // 7. Prepare response data
      const responseData = {
        access_token: access_token,
        refresh_token: null, // Placeholder for refresh token if implemented
        user: formattedUser,
      };

      this.logger.log(
        colors.magenta(`Password verified successfully for ${formattedPhone}`),
      );

      return new ApiResponseDto(true, 'Welcome back', responseData);
    } catch (error: any) {
      this.logger.error(
        colors.red(`Password verification error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to verify password',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sign JWT token
   */
  private async signToken(userId: string, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
    };

    const secret = this.config.get('JWT_SECRET');
    const expiration_time = this.config.get('JWT_EXPIRES_IN') || '7d';

    return this.jwt.signAsync(payload, {
      expiresIn: expiration_time,
      secret: secret,
    });
  }
}


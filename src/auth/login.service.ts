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
import { CheckLoginStatusDto, VerifyPasswordDto, VerifyLoginPasswordDto } from './dto/registration.dto';
import { PhoneValidator } from './helpers/phone.validator';
import { RegistrationStepsHelper } from './helpers/registration-steps.config';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DeviceTrackerService } from './helpers/device-tracker.service';
import { OtpService } from './helpers/otp.service';
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
    private otpService: OtpService,
  ) {}

  /**
   * Check login/registration status
   * Returns detailed information about user's registration progress
   * Used by app to determine which page to show when user enters email or phone number
   * 
   * Flow:
   * - If email: Check User table directly (skip RegistrationProgress)
   * - If phone: Check RegistrationProgress first
   *   - If is_complete is false: return registration progress
   *   - If is_complete is true: return success (no token) to prompt password entry
   *   - If no registration found: return message to start registration
   */
  async checkLoginStatus(
    dto: CheckLoginStatusDto,
  ): Promise<ApiResponseDto<any>> {
    // Validate that at least one identifier is provided
    if (!dto.email && !dto.phone_number) {
      throw new BadRequestException(
        'Either email or phone_number must be provided',
      );
    }

    const identifier = dto.email || dto.phone_number;
    this.logger.log(
      colors.cyan(`Checking login status for ${identifier}...`),
    );

    try {
      // If email is provided, check User table directly (skip RegistrationProgress)
      if (dto.email) {
        const user = await this.prisma.user.findUnique({
          where: { email: dto.email },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          is_email_verified: true,
            account_status: true,
        },
      });

        if (!user) {
          this.logger.log(
            colors.yellow(`No user found with email: ${dto.email}`),
          );
          return new ApiResponseDto(true, 'No account found. Please start registration.', {
            registration_completed: false,
            has_registration_progress: false,
            current_step: 0,
            next_step: 'START_REGISTRATION',
            can_login: false,
            message: 'Please start registration to create an account.',
          });
        }

        // Check if account is suspended
        if (user.account_status === 'suspended') {
          this.logger.warn(
            colors.yellow(`Suspended account attempted login: ${dto.email}`),
          );
          return new ApiResponseDto(
            true,
            'Your account has been suspended. Please contact support for assistance.',
            {
              registration_completed: true,
              can_login: false,
              account_suspended: true,
              requires_password: false,
              message: 'Your account has been suspended. Please contact support.',
            },
          );
        }

        // User exists and account is active - prompt for password
        this.logger.log(
          colors.green(`User found with email: ${dto.email}. User should enter password.`),
        );

        return new ApiResponseDto(true, 'Account found. Please enter your password.', {
          registration_completed: true,
          can_login: true,
          requires_password: true,
          user_id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          message: 'Please enter your password to continue.',
        });
      }

      // Phone number flow (existing logic)
      // 1. Format and validate phone number
      const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number!);
      if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
        throw new BadRequestException(
          'Phone number must be in E.164 format (+234XXXXXXXXXX)',
        );
      }

      // 2. Check RegistrationProgress first (this is the source of truth)
      let registrationProgress = await this.prisma.registrationProgress.findUnique({
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

        // Use centralized step helper to find current step
        const currentStepInfo = RegistrationStepsHelper.findCurrentStep(
          registrationProgress,
        );

        // Auto-send OTP if:
        // 1. User is on step 2 (OTP verification), OR
        // 2. User is on step 1 and next step is OTP_VERIFICATION (ready to verify)
        // And phone is not verified yet
        // Check step status to see if step 2 is not_started (needs OTP)
        // Handle both old schema (step_2_completed) and new schema (step_2_status)
        const step2Status = registrationProgress.step_2_status;
        const step2Completed = (registrationProgress as any).step_2_completed;
        const isStep2Done = step2Status === 'completed' || step2Completed === true;
        
        const isOnStep1ReadyForOTP = currentStepInfo.stepNumber === 1 && 
          (currentStepInfo.nextStep === 'OTP_VERIFICATION' || currentStepInfo.stepKey === 'OTP_VERIFICATION');
        const isOnStep2 = currentStepInfo.stepNumber === 2;
        
        // Auto-send OTP logic:
        // 1. If on step 1 and next is OTP_VERIFICATION: send OTP if step 2 is not completed
        //    (Step status is source of truth, ignore is_phone_verified flag)
        // 2. If on step 2: send OTP if phone not verified and step 2 not completed
        // The step status system takes precedence over is_phone_verified flag
        const shouldAutoSendOTP = 
          (isOnStep1ReadyForOTP && !isStep2Done) || // Step 1 → OTP: send if step 2 not done (ignore is_phone_verified)
          (isOnStep2 && !registrationProgress.is_phone_verified && !isStep2Done); // Step 2: send if not verified and not done
        
        this.logger.log(
          colors.cyan(
            `OTP auto-send check: step=${currentStepInfo.stepNumber}, nextStep=${currentStepInfo.nextStep}, stepKey=${currentStepInfo.stepKey}, is_phone_verified=${registrationProgress.is_phone_verified}, step2Status=${step2Status}, step2Completed=${step2Completed}, isStep2Done=${isStep2Done}, isOnStep1ReadyForOTP=${isOnStep1ReadyForOTP}, shouldAutoSend=${shouldAutoSendOTP}`,
          ),
        );
        
        if (shouldAutoSendOTP) {
          const hasValidOTP = registrationProgress.otp && 
            registrationProgress.otp_expires_at && 
            new Date(registrationProgress.otp_expires_at) > new Date();
          
          if (!hasValidOTP) {
            this.logger.log(
              colors.cyan(
                `Auto-sending OTP for ${formattedPhone} (user on step ${currentStepInfo.stepNumber}, next: ${currentStepInfo.nextStep}, OTP missing or expired)`,
              ),
            );
            try {
              // Automatically generate and send OTP
              await this.otpService.generateAndSendOTP(formattedPhone);
              this.logger.log(
                colors.green(`OTP auto-sent successfully for ${formattedPhone}`),
              );
              
              // Refresh registration progress to get updated OTP expiry
              const updatedProgress = await this.prisma.registrationProgress.findUnique({
                where: { phone_number: formattedPhone },
              });
              if (updatedProgress) {
                registrationProgress = updatedProgress;
              }
            } catch (error) {
              // Log error but don't fail the request - user can still resend OTP manually
              this.logger.error(
                colors.yellow(
                  `Failed to auto-send OTP for ${formattedPhone}: ${error.message}`,
                ),
              );
            }
          } else {
            this.logger.log(
              colors.blue(
                `Valid OTP already exists for ${formattedPhone}, skipping auto-send`,
              ),
            );
          }
        }

        // Return registration progress status (same format as registration service)
      const regData = registrationProgress.registration_data as any;

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

        // Build comprehensive step pending status (is_step_1_pending, is_step_2_pending, etc.)
        const stepPendingStatus = RegistrationStepsHelper.buildStepPendingStatus(
          registrationProgress,
        );

        // Build verification status for all steps (step_2_verification_status, step_3_verification_status, etc.)
        const stepVerificationStatus =
          RegistrationStepsHelper.buildStepVerificationStatus(
            registrationProgress,
          );

        // Check if current step is waiting for verification (for backward compatibility)
        const currentStepVerificationStatus =
          RegistrationStepsHelper.getVerificationStatus(
            currentStepInfo.stepNumber,
            registrationProgress,
          );
        const isWaitingForVerification =
          RegistrationStepsHelper.isStepPending(
            currentStepInfo.stepNumber,
            registrationProgress,
          );

        // If waiting for verification, adjust next_step to indicate pending state
        // This helps the app distinguish between "enter ID" vs "ID verification pending"
        let displayNextStep = currentStepInfo.nextStep;
        if (isWaitingForVerification) {
          // When verification is pending, next_step should indicate pending state
          // The app should check step pending flags to show pending screen
          displayNextStep = currentStepInfo.stepKey; // Keep on same step
        }

        // Build response with all status information
        const responseData = {
          registration_completed: false,
          has_registration_progress: true,
          session_id: registrationProgress.id,
          current_step: currentStepInfo.stepNumber,
          next_step: displayNextStep,
          can_login: false,
          can_proceed: currentStepInfo.canProceed,
          // Comprehensive step pending status flags
          ...stepPendingStatus,
          // Comprehensive step verification status
          ...stepVerificationStatus,
          // Backward compatibility fields (deprecated - use step pending flags instead)
          is_waiting_for_verification: isWaitingForVerification,
          verification_status: currentStepVerificationStatus,
          steps: steps,
          registration_data: {
            phone_number: formattedPhone,
            referral_code: registrationProgress.referral_code,
            created_at: registrationProgress.createdAt,
            updated_at: registrationProgress.updatedAt,
          },
          message: statusMessage,
          // Include OTP info if on step 1 (next is OTP) or step 2 (OTP verification)
          ...((currentStepInfo.stepNumber === 1 && currentStepInfo.nextStep === 'OTP_VERIFICATION') || 
              currentStepInfo.stepNumber === 2) && {
            otp_sent: !!registrationProgress.otp,
            otp_expires_in: registrationProgress.otp_expires_at
              ? Math.max(0, Math.floor((new Date(registrationProgress.otp_expires_at).getTime() - Date.now()) / 1000))
              : this.otpService.getOTPExpirySeconds(),
          },
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
   * 
   * Supports login by email or phone number
   * 
   * Implements password attempt tracking:
   * - Tracks failed password attempts
   * - Suspends account after max_password_trial failed attempts
   * - Clears attempts on successful login
   * - Resets attempts after a period (15 minutes)
   */
  async verifyPassword(
    dto: VerifyPasswordDto,
    deviceMetadata?: any,
    ipAddress?: string,
  ): Promise<ApiResponseDto<any>> {
    // Validate that at least one identifier is provided
    if (!dto.email && !dto.phone_number) {
      throw new BadRequestException(
        'Either email or phone_number must be provided',
      );
    }

    const identifier = dto.email || dto.phone_number;
    this.logger.log(
      colors.cyan(`Verifying password for ${identifier}...`),
    );

    try {
      // 1. Get max password trial from config (default: 3)
      const maxPasswordTrial = parseInt(
        this.config.get('MAX_PASSWORD_TRIAL') || '3',
        10,
      );
      const passwordAttemptWindow = parseInt(
        this.config.get('PASSWORD_ATTEMPT_WINDOW_MINUTES') || '15',
        10,
      ); // 15 minutes window

      // 2. Find user by email or phone number
      let user;
      if (dto.email) {
        // Find by email
        user = await this.prisma.user.findUnique({
          where: { email: dto.email },
          include: {
            profile_image: true,
            kyc_verification: true,
          },
        });
      } else {
        // Find by phone number
        const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number!);
        if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
          throw new BadRequestException(
            'Phone number must be in E.164 format (+234XXXXXXXXXX)',
          );
        }

        user = await this.prisma.user.findFirst({
          where: { phone_number: formattedPhone },
          include: {
            profile_image: true,
            kyc_verification: true,
          },
        });
      }

      if (!user) {
        this.logger.error(
          colors.red(`User not found for ${identifier}`),
        );
        return new ApiResponseDto(false, 'invalid credentials', {
          attempts_remaining: null,
        });
      }

      // 3. Check if account is suspended
      if (user.account_status === 'suspended') {
        this.logger.warn(
          colors.yellow(
            `Suspended account attempted login: ${identifier}`,
          ),
        );
        return new ApiResponseDto(
          false,
          'Your account has been suspended due to multiple failed login attempts. Please contact support for assistance.',
          {
            account_suspended: true,
            attempts_remaining: 0,
          },
        );
      }

      // 4. Check if password attempts period has expired (reset attempts)
      const now = new Date();
      let passwordAttempts = user.password_attempts || 0;
      let attemptsStartedAt = user.password_attempts_started_at;

      if (attemptsStartedAt) {
        const windowExpiry = new Date(attemptsStartedAt);
        windowExpiry.setMinutes(
          windowExpiry.getMinutes() + passwordAttemptWindow,
        );

        if (now > windowExpiry) {
          // Reset attempts - window expired
          passwordAttempts = 0;
          attemptsStartedAt = null;
          this.logger.log(
            colors.blue(
              `Password attempt window expired for ${identifier}. Resetting attempts.`,
            ),
          );
        }
      }

      // 5. Verify password
      if (!user.password) {
        this.logger.error(
          colors.red(`Password not set for ${identifier}`),
        );
        return new ApiResponseDto(false, 'password not set. Please reset your password.', {
          attempts_remaining: maxPasswordTrial - passwordAttempts,
        });
      }

      const isPasswordValid = await argon.verify(user.password, dto.password);

      if (!isPasswordValid) {
        // Wrong password - increment attempts
        passwordAttempts += 1;
        const attemptsRemaining = maxPasswordTrial - passwordAttempts;

        // If this is the first failed attempt, set the start time
        if (!attemptsStartedAt) {
          attemptsStartedAt = now;
        }

        // Check if max attempts reached
        if (passwordAttempts >= maxPasswordTrial) {
          // Suspend account
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              account_status: 'suspended',
              password_attempts: passwordAttempts,
              password_attempts_started_at: attemptsStartedAt,
              updatedAt: now,
            },
          });

          this.logger.error(
            colors.red(
              `Account suspended due to ${passwordAttempts} failed password attempts: ${identifier}`,
            ),
          );

          return new ApiResponseDto(
            false,
            `Your account has been suspended due to ${maxPasswordTrial} failed login attempts. Please contact support for assistance.`,
            {
              account_suspended: true,
              attempts_remaining: 0,
              max_attempts: maxPasswordTrial,
            },
          );
        }

        // Update attempts count
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            password_attempts: passwordAttempts,
            password_attempts_started_at: attemptsStartedAt,
            updatedAt: now,
          },
        });

        this.logger.warn(
          colors.yellow(
            `Failed password attempt ${passwordAttempts}/${maxPasswordTrial} for ${identifier}`,
          ),
        );

        return new ApiResponseDto(
          false,
          'invalid credentials',
          {
            attempts_remaining: attemptsRemaining,
            max_attempts: maxPasswordTrial,
            message: `Invalid password. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining before account suspension.`,
          },
        );
      }

      // 7. Password is correct - clear attempts and proceed with login
      if (passwordAttempts > 0 || attemptsStartedAt) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            password_attempts: 0,
            password_attempts_started_at: null,
            updatedAt: now,
          },
        });

        this.logger.log(
          colors.green(
            `Password verified successfully. Cleared ${passwordAttempts} previous failed attempts for ${identifier}`,
          ),
        );
      }

      // 8. Generate access token
      const access_token = await this.signToken(user.id, user.email);

      // 9. Track device (if device metadata is provided)
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

      // 10. Format user data for response
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

      // 11. Prepare response data
      const responseData = {
        access_token: access_token,
        refresh_token: null, // Placeholder for refresh token if implemented
        user: formattedUser,
      };

      this.logger.log(
        colors.magenta(`Password verified successfully for ${identifier}`),
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
   * Verify Password for Login
   * Similar to signin in auth.service.ts but accepts phone_number OR email
   * Used after user enters phone/email and needs to verify password to complete login
   */
  async verifyLoginPassword(
    dto: VerifyLoginPasswordDto,
    deviceMetadata?: any,
    ipAddress?: string,
  ): Promise<ApiResponseDto<any>> {
    // Validate that at least one identifier is provided
    if (!dto.email && !dto.phone_number) {
      throw new BadRequestException(
        'Either email or phone_number must be provided',
      );
    }

    const identifier = dto.email || dto.phone_number;
    this.logger.log(
      colors.cyan(`Verifying login password for ${identifier}...`),
    );

    try {
      // 1. Get max password trial from config (default: 3)
      const maxPasswordTrial = parseInt(
        this.config.get('MAX_PASSWORD_TRIAL') || '3',
        10,
      );
      const passwordAttemptWindow = parseInt(
        this.config.get('PASSWORD_ATTEMPT_WINDOW_MINUTES') || '15',
        10,
      ); // 15 minutes window

      // 2. Find user by email or phone number
      let user;
      if (dto.email) {
        // Find by email
        user = await this.prisma.user.findUnique({
          where: { email: dto.email },
          include: {
            profile_image: true,
            kyc_verification: true,
          },
        });
      } else {
        // Find by phone number
        const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number!);
        if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
          throw new BadRequestException(
            'Phone number must be in E.164 format (+234XXXXXXXXXX)',
          );
        }

        user = await this.prisma.user.findFirst({
          where: { phone_number: formattedPhone },
          include: {
            profile_image: true,
            kyc_verification: true,
          },
        });
      }

      if (!user) {
        this.logger.error(
          colors.red(`User not found for ${identifier}`),
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // 3. Check if account is suspended
      if (user.account_status === 'suspended') {
        this.logger.warn(
          colors.yellow(
            `Suspended account attempted login: ${identifier}`,
          ),
        );
        return new ApiResponseDto(
          false,
          'Your account has been suspended due to multiple failed login attempts. Please contact support for assistance.',
          {
            account_suspended: true,
            attempts_remaining: 0,
          },
        );
      }

      // 4. Check if password attempts period has expired (reset attempts)
      const now = new Date();
      let passwordAttempts = user.password_attempts || 0;
      let attemptsStartedAt = user.password_attempts_started_at;

      if (attemptsStartedAt) {
        const windowExpiry = new Date(attemptsStartedAt);
        windowExpiry.setMinutes(
          windowExpiry.getMinutes() + passwordAttemptWindow,
        );

        if (now > windowExpiry) {
          // Reset attempts - window expired
          passwordAttempts = 0;
          attemptsStartedAt = null;
          this.logger.log(
            colors.blue(
              `Password attempt window expired for ${identifier}. Resetting attempts.`,
            ),
          );
        }
      }

      // 5. Verify password
      if (!user.password) {
        this.logger.error(
          colors.red(`Password not set for ${identifier}`),
        );
        return new ApiResponseDto(false, 'Password not set. Please reset your password.', {
          attempts_remaining: maxPasswordTrial - passwordAttempts,
        });
      }

      const isPasswordValid = await argon.verify(user.password, dto.password);

      if (!isPasswordValid) {
        // Wrong password - increment attempts
        passwordAttempts += 1;
        const attemptsRemaining = maxPasswordTrial - passwordAttempts;

        // If this is the first failed attempt, set the start time
        if (!attemptsStartedAt) {
          attemptsStartedAt = now;
        }

        // Check if max attempts reached
        if (passwordAttempts >= maxPasswordTrial) {
          // Suspend account
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              account_status: 'suspended',
              password_attempts: passwordAttempts,
              password_attempts_started_at: attemptsStartedAt,
              updatedAt: now,
            },
          });

          this.logger.error(
            colors.red(
              `Account suspended due to ${passwordAttempts} failed password attempts: ${identifier}`,
            ),
          );

          return new ApiResponseDto(
            false,
            `Your account has been suspended due to ${maxPasswordTrial} failed login attempts. Please contact support for assistance.`,
            {
              account_suspended: true,
              attempts_remaining: 0,
              max_attempts: maxPasswordTrial,
            },
          );
        }

        // Update attempts count
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            password_attempts: passwordAttempts,
            password_attempts_started_at: attemptsStartedAt,
            updatedAt: now,
          },
        });

        this.logger.warn(
          colors.yellow(
            `Failed password attempt ${passwordAttempts}/${maxPasswordTrial} for ${identifier}`,
          ),
        );

        return new ApiResponseDto(
          false,
          'Invalid credentials',
          {
            attempts_remaining: attemptsRemaining,
            max_attempts: maxPasswordTrial,
            message: `Invalid password. You have ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining before your account gets locked out.`,
          },
        );
      }

      // 6. Password is correct - clear attempts and proceed with login
      if (passwordAttempts > 0 || attemptsStartedAt) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            password_attempts: 0,
            password_attempts_started_at: null,
            updatedAt: now,
          },
        });

        this.logger.log(
          colors.green(
            `Password verified successfully. Cleared ${passwordAttempts} previous failed attempts for ${identifier}`,
          ),
        );
      }

      // 7. Generate access token
      const access_token = await this.signToken(user.id, user.email);

      // 8. Track device (if device metadata is provided)
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

      // 9. Format user data for response (same format as signin in auth.service.ts)
      const formattedUser = {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || null,
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

      // 10. Prepare response data (same format as signin)
      const responseData = {
        access_token: access_token,
        refresh_token: null, // Placeholder for refresh token if implemented
        user: formattedUser,
      };

      this.logger.log(
        colors.magenta(`Login password verified successfully for ${identifier}`),
      );

      return new ApiResponseDto(true, 'Welcome back', responseData);
    } catch (error: any) {
      this.logger.error(
        colors.red(`Login password verification error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to verify login password',
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


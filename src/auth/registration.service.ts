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
import { StartRegistrationDto, ResendOtpDto, VerifyOtpDto, SubmitIdInformationDto, SubmitResidentialAddressDto } from './dto/registration.dto';
import { PhoneValidator } from './helpers/phone.validator';
import { IdValidator } from './helpers/id-validator';
import { RegistrationRateLimiter } from './helpers/rate-limiter';
import { SecurityHeadersValidator } from './helpers/security-headers.validator';
import { OtpService } from './helpers/otp.service';
import { ReferralValidator } from './helpers/referral.validator';
import { SecurityEventService } from './helpers/security-event.service';
import { DeviceTrackerService } from './helpers/device-tracker.service';
import { KycService } from './helpers/kyc.service';
import { RegistrationStepsHelper } from './helpers/registration-steps.config';
import { formatTimeDuration } from 'src/common/helper_functions/time-formatter';
import * as colors from 'colors';
import * as crypto from 'crypto';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private rateLimiter: RegistrationRateLimiter,
    private otpService: OtpService,
    private referralValidator: ReferralValidator,
    private securityEventService: SecurityEventService,
    private deviceTracker: DeviceTrackerService,
    private kycService: KycService,
  ) {}

  /**
   * Register with phone number (Step 1)
   * Main entry point for registration flow
   */
  async registerWithPhoneNumber(
    dto: StartRegistrationDto,
    headers: any,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(colors.cyan('Starting registration with phone number...'));

    try {
      // 1. Format and validate phone number (basic validation first)
      const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number);
      if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
        throw new BadRequestException(
          'Phone number must be in E.164 format (+234XXXXXXXXXX)',
        );
      }

      // Note: Security headers and rate limiting are now handled by guards
      // SecurityHeadersGuard and RateLimitGuard are applied at controller level

      // 4. Check if phone number already exists in User table (completed registration)
      const existingUser = await this.prisma.user.findFirst({
        where: { phone_number: formattedPhone },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException(
          'Phone number already registered. Please login instead.',
        );
      }

      // 5. Check if there's an incomplete registration (user quit before completing)
      const existingRegistration = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (existingRegistration && !existingRegistration.is_complete) {
        this.logger.log(colors.blue(`Currrent regsitration stage: ${JSON.stringify(existingRegistration)}`))
        // User has incomplete registration - they should continue from OTP verification
        this.logger.log(
          `Incomplete registration found for ${formattedPhone}. Returning resume info.`,
        );

        // Check if device changed (for security monitoring, not blocking)
        const previousDeviceId = (existingRegistration.device_metadata as any)?.device_id;
        const currentDeviceId = dto.device_metadata.device_id;
        const deviceChanged = previousDeviceId && previousDeviceId !== currentDeviceId;

        if (deviceChanged) {
          this.logger.warn(
            colors.yellow(
              `Device change detected for ${formattedPhone}. Previous: ${previousDeviceId}, Current: ${currentDeviceId}`,
            ),
          );
          
          // Log device change for fraud detection (but allow continuation)
          await this.securityEventService.logDeviceChange({
            phoneNumber: formattedPhone,
            registrationProgressId: existingRegistration.id,
            previousDeviceId,
            currentDeviceId,
            previousDeviceMetadata: existingRegistration.device_metadata as any,
            currentDeviceMetadata: dto.device_metadata,
            ipAddress,
          });
        }

        // If phone is already verified, skip OTP generation and proceed to next step
        if (existingRegistration.is_phone_verified) {
          this.logger.log(
            `Phone already verified for ${formattedPhone}. Skipping OTP generation. Current step: ${existingRegistration.current_step}`,
          );

          // Update device metadata if device changed (allow continuation on new device)
          if (deviceChanged) {
            await this.prisma.registrationProgress.update({
              where: { phone_number: formattedPhone },
              data: {
                device_metadata: dto.device_metadata as any,
                updatedAt: new Date(),
              },
            });
          }

          // Determine next step based on current progress
          let nextStep = 'OTP_VERIFICATION';
          let message = 'Please continue your registration.';

          if (existingRegistration.current_step === 2 && existingRegistration.step_2_status === 'completed') {
            // Step 2 (OTP) completed, proceed to Step 3 (ID Information)
            nextStep = 'ID_INFORMATION';
            message = 'Please provide your ID information (BVN or NIN) to continue.';
          } else if (existingRegistration.current_step === 3 && existingRegistration.step_3_status === 'completed') {
            // Step 3 completed, proceed to Step 4
            nextStep = 'PERSONAL_INFORMATION';
            message = 'Please provide your personal information to continue.';
          }
          // Add more steps as needed

          return new ApiResponseDto(true, message, {
            session_id: existingRegistration.id,
            step: existingRegistration.current_step,
            next_step: nextStep,
            is_resuming: true,
            is_phone_verified: true,
            device_changed: deviceChanged,
            otp_sent: false,
            registration_data: existingRegistration.registration_data,
          });
        }

        // Phone not verified yet - check if OTP is still valid (not expired)
        const isOtpValid =
          existingRegistration.otp &&
          existingRegistration.otp_expires_at &&
          new Date() < new Date(existingRegistration.otp_expires_at);

        // If OTP expired, generate and send new one
        if (!isOtpValid) {
          this.logger.log(`OTP expired for ${formattedPhone}. Generating new OTP...`);
          await this.otpService.generateAndSendOTP(formattedPhone);
        }

        // Update device metadata if device changed (allow continuation on new device)
        if (deviceChanged) {
          await this.prisma.registrationProgress.update({
            where: { phone_number: formattedPhone },
            data: {
              device_metadata: dto.device_metadata as any,
              updatedAt: new Date(),
            },
          });
        }

        const otpExpiresIn = this.otpService.getOTPExpirySeconds();

        return new ApiResponseDto(true, 'Please verify your phone number with OTP', {
          session_id: existingRegistration.id,
          step: existingRegistration.current_step,
          next_step: 'OTP_VERIFICATION',
          is_resuming: true,
          is_phone_verified: false,
          device_changed: deviceChanged, // Inform frontend of device change
          otp_sent: true,
          otp_expires_in: otpExpiresIn,
          message: deviceChanged
            ? 'You have an incomplete registration. Please verify your phone number to continue on this device.'
            : 'You have an incomplete registration. Please verify your phone number to continue.',
        });
      }

      // 6. Validate referral code if provided and get referrer ID
      let referrerId: string | null = null;
      if (dto.referral_code) {
        referrerId = await this.referralValidator.validateReferralCode(dto.referral_code);
      }

      // 7. Validate device metadata
      this.validateDeviceMetadata(dto.device_metadata);

      // 8. Create or update registration progress
      const registrationProgress = await this.createOrUpdateRegistrationProgress(
        formattedPhone,
        dto.referral_code,
        dto.device_metadata,
      );

      // 9. Save referral relationship if valid referral code was provided
      if (dto.referral_code && referrerId) {
        await this.referralValidator.saveReferralRelationship(
          referrerId,
          formattedPhone,
          dto.referral_code,
          registrationProgress.id,
        );
      }

      // 10. Generate and send OTP
      await this.otpService.generateAndSendOTP(formattedPhone);

      // 11. Note: Device will be stored in UserDevice table when user completes registration
      // The device_metadata is already stored in RegistrationProgress.device_metadata
      // When registration completes and User is created, call:
      // deviceTracker.registerOrUpdateDevice(userId, deviceMetadata, ipAddress)

      // 11. Prepare response
      const sessionId = registrationProgress.id;
      const otpExpiresIn = this.otpService.getOTPExpirySeconds();

      this.logger.log(
        colors.magenta(
          `Registration started successfully for ${formattedPhone}. Session: ${sessionId}`,
        ),
      );

      return new ApiResponseDto(true, 'OTP sent successfully', {
        session_id: sessionId,
        step: 1,
        next_step: 'OTP_VERIFICATION',
        otp_sent: true,
        otp_expires_in: otpExpiresIn,
      });
    } catch (error) {
      this.logger.error(
        colors.red(`Registration error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS)
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Registration failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  /**
   * Validate device metadata
   */
  private validateDeviceMetadata(deviceMetadata: any): void {
    this.logger.log(`Validating device metadata for ${deviceMetadata.device_id}`);
    if (!deviceMetadata || !deviceMetadata.device_id) {
      this.logger.error(colors.red('Device metadata is required'));
      throw new BadRequestException('Device metadata is required');
    }

    if (!deviceMetadata.platform) {
      this.logger.error(colors.red('Platform is required in device metadata'));
      throw new BadRequestException('Platform is required in device metadata');
    }
    this.logger.log(`Device metadata validated successfully for ${deviceMetadata.device_id}`);
  }

  /**
   * Create or update registration progress
   */
  private async createOrUpdateRegistrationProgress(
    phoneNumber: string,
    referralCode: string | undefined,
    deviceMetadata: any,
  ) {
    this.logger.log(`Creating or updating registration progress for ${phoneNumber}`);
    // Set expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Prepare registration data
    const registrationData = {
      phone_number: phoneNumber,
      referral_code: referralCode || null,
    };

    // Create or update registration progress
    const registrationProgress = await this.prisma.registrationProgress.upsert({
      where: { phone_number: phoneNumber },
      update: {
        step_1_status: 'completed',
        current_step: 1,
        referral_code: referralCode || null,
        device_metadata: deviceMetadata,
        registration_data: registrationData,
        expires_at: expiresAt,
        updatedAt: new Date(),
      },
      create: {
        phone_number: phoneNumber,
        current_step: 1,
        total_steps: 9,
        step_1_status: 'completed',
        referral_code: referralCode || null,
        device_metadata: deviceMetadata,
        registration_data: registrationData,
        expires_at: expiresAt,
      },
    }); 

    this.logger.log(`Registration progress updated successfully for ${phoneNumber}`);
    return registrationProgress;
  }

  /**
   * Resend OTP for registration
   * Reuses security checks from main registration endpoint
   */
  async resendOTP(
    dto: ResendOtpDto,
    headers: any,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(colors.cyan(`Resending OTP for ${dto.phone_number}...`));

    try {
      // 1. Format and validate phone number
      const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number);
      if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
        throw new BadRequestException(
          'Phone number must be in E.164 format (+234XXXXXXXXXX)',
        );
      }

      // Note: Security headers and rate limiting are now handled by guards
      // SecurityHeadersGuard and RateLimitGuard are applied at controller level

      // 4. Check if phone number already exists in User table (completed registration)
      const existingUser = await this.prisma.user.findFirst({
        where: { phone_number: formattedPhone },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException(
          'Phone number already registered. Please login instead.',
        );
      }

      // 5. Find registration progress
      const registrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (!registrationProgress) {
        throw new BadRequestException(
          'No active registration found. Please start registration first.',
        );
      }

      if (registrationProgress.is_complete) {
        throw new BadRequestException(
          'Registration already completed. Please login instead.',
        );
      }

      // 6. Validate session_id if provided
      if (dto.session_id && dto.session_id !== registrationProgress.id) {
        throw new BadRequestException(
          'Session ID does not match phone number. Please use the correct session.',
        );
      }

      // 7. Validate device metadata
      this.validateDeviceMetadata(dto.device_metadata);

      // 8. Check if device changed (for security monitoring)
      const previousDeviceId = (registrationProgress.device_metadata as any)?.device_id;
      const currentDeviceId = dto.device_metadata.device_id;
      const deviceChanged = previousDeviceId && previousDeviceId !== currentDeviceId;

      if (deviceChanged) {
        this.logger.warn(
          colors.yellow(
            `Device change detected during OTP resend for ${formattedPhone}. Previous: ${previousDeviceId}, Current: ${currentDeviceId}`,
          ),
        );

        // Log device change for fraud detection
        await this.securityEventService.logDeviceChange({
          phoneNumber: formattedPhone,
          registrationProgressId: registrationProgress.id,
          previousDeviceId,
          currentDeviceId,
          previousDeviceMetadata: registrationProgress.device_metadata as any,
          currentDeviceMetadata: dto.device_metadata,
          ipAddress,
        });

        // Update device metadata
        await this.prisma.registrationProgress.update({
          where: { phone_number: formattedPhone },
          data: {
            device_metadata: dto.device_metadata as any,
            updatedAt: new Date(),
          },
        });
      }

      // 9. Generate and send new OTP
      await this.otpService.generateAndSendOTP(formattedPhone);

      // Fetch updated registration progress to get latest step statuses
      const updatedRegistrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (!updatedRegistrationProgress) {
        throw new BadRequestException('Registration progress not found after OTP resend');
      }

      // Build steps object with status
      const steps = RegistrationStepsHelper.buildStepsObject(
        updatedRegistrationProgress,
        updatedRegistrationProgress.registration_data as any,
      );

      // 10. Prepare response
      const otpExpiresIn = this.otpService.getOTPExpirySeconds();

      this.logger.log(
        colors.magenta(
          `OTP resent successfully for ${formattedPhone}. Session: ${registrationProgress.id}`,
        ),
      );

      return new ApiResponseDto(true, 'OTP resent successfully', {
        session_id: registrationProgress.id,
        step: registrationProgress.current_step,
        next_step: 'OTP_VERIFICATION',
        otp_sent: true,
        otp_expires_in: otpExpiresIn,
        device_changed: deviceChanged,
        steps: steps,
      });
    } catch (error) {
      this.logger.error(
        colors.red(`OTP resend error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS)
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to resend OTP',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify OTP for phone number (Step 2)
   * Validates OTP and marks phone as verified
   */
  async verifyOTP(
    dto: VerifyOtpDto,
    headers: any,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(colors.cyan(`Verifying OTP for ${dto.phone_number}...`));

    try {
      // 1. Format and validate phone number
      const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number);
      if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
        throw new BadRequestException(
          'Phone number must be in E.164 format (+234XXXXXXXXXX)',
        );
      }

      // Note: Security headers are now handled by SecurityHeadersGuard at controller level

      // 3. Check if phone number already exists in User table (completed registration)
      const existingUser = await this.prisma.user.findFirst({
        where: { phone_number: formattedPhone },
        select: { id: true },
      });

      let registrationProgress: any;

      // 4. Find registration progress
      registrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (existingUser) {
         this.logger.error(colors.red(`Phone number already registered. Please login instead.`));
         return new ApiResponseDto(false, 'Phone number already registered. Please login instead.', {
          verification_attempts: registrationProgress.verification_attempts + 1,
        });
      }

      if (!registrationProgress) {
        this.logger.error(colors.red(`No active registration found. Please start registration first.`));
        return new ApiResponseDto(false, 'No active registration found. Please start registration first.', {
          verification_attempts: registrationProgress.verification_attempts + 1,
        });
      }

      if (registrationProgress.is_complete) {
        this.logger.error(colors.red(`Registration already completed. Please login instead.`));
        return new ApiResponseDto(false, 'Registration already completed. Please login instead.', {
          verification_attempts: registrationProgress.verification_attempts + 1,
        });
      }

      // 5. Validate session_id if provided
      if (dto.session_id && dto.session_id !== registrationProgress.id) {
        this.logger.error(colors.red(`Session ID does not match phone number. Please use the correct session.`));
        return new ApiResponseDto(false, 'Session ID does not match phone number. Please use the correct session.', {
          verification_attempts: registrationProgress.verification_attempts + 1,
        });
      }

      // 6. Verify OTP
      if (!registrationProgress.otp) {
        this.logger.error(colors.red(`No OTP found. Please request a new OTP.`));
        return new ApiResponseDto(false, 'No OTP found. Please request a new OTP.', {
          verification_attempts: registrationProgress.verification_attempts + 1,
        });
      }

      if (!registrationProgress.otp_expires_at) {
        this.logger.error(colors.red(`Invalid OTP. Please request a new OTP.`));
        return new ApiResponseDto(false, 'Invalid OTP. Please request a new OTP.', {
          verification_attempts: registrationProgress.verification_attempts + 1,
        });
      }

      // Check if OTP is expired
      if (new Date() > new Date(registrationProgress.otp_expires_at)) {
        this.logger.error(colors.red(`OTP has expired. Please request a new OTP.`));
        return new ApiResponseDto(false, 'OTP has expired. Please request a new OTP.', {
          verification_attempts: registrationProgress.verification_attempts + 1,
        });
      }

      // Verify OTP matches
      if (registrationProgress.otp !== dto.otp) {
        // Increment verification attempts
        await this.prisma.registrationProgress.update({
          where: { phone_number: formattedPhone },
          data: {
            verification_attempts: {
              increment: 1,
            },
          },
        });

        // Log failed verification attempt
        await this.securityEventService.logEvent({
          eventType: 'otp_verification_failed',
          eventCategory: 'registration',
          severity: 'medium',
          phoneNumber: formattedPhone,
          registrationProgressId: registrationProgress.id,
          ipAddress,
          description: `Failed OTP verification attempt for ${formattedPhone}. Attempts: ${registrationProgress.verification_attempts + 1}`,
          metadata: {
            verification_attempts: registrationProgress.verification_attempts + 1,
          },
        });

        this.logger.error(colors.red(`Failed OTP verification attempt for ${formattedPhone}. Attempts: ${registrationProgress.verification_attempts + 1}`));
        return new ApiResponseDto(false, 'Invalid OTP. Please check and try again.', {
          verification_attempts: registrationProgress.verification_attempts + 1,
        });
      }

      // 7. OTP is valid - mark phone as verified and update progress
      await this.prisma.registrationProgress.update({
        where: { phone_number: formattedPhone },
        data: {
          is_phone_verified: true,
          step_2_status: 'completed',
          current_step: 2,
          otp: null, // Clear OTP after successful verification
          otp_expires_at: null,
          verification_attempts: 0, // Reset attempts on success
          updatedAt: new Date(),
        },
      });

      // Fetch updated registration progress to get latest step statuses
      const updatedRegistrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (!updatedRegistrationProgress) {
        throw new BadRequestException('Registration progress not found after OTP verification');
      }

      // Build steps object with status
      const steps = RegistrationStepsHelper.buildStepsObject(
        updatedRegistrationProgress,
        updatedRegistrationProgress.registration_data as any,
      );

      this.logger.log(
        colors.magenta(
          `OTP verified successfully for ${formattedPhone}. Phone number is now verified.`,
        ),
      );

      return new ApiResponseDto(true, 'Phone number verified successfully', {
        session_id: registrationProgress.id,
        step: 2,
        next_step: 'ID_INFORMATION',
        is_phone_verified: true,
        can_proceed: true,
        steps: steps,
      });
    } catch (error) {
      this.logger.error(
        colors.red(`OTP verification error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to verify OTP',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

   /**
   * Validate that all previous steps are completed before allowing current step
   * @param currentStepNumber - The step number being submitted (1-9)
   * @param registrationProgress - The registration progress object
   * @returns Error message if validation fails, null if validation passes
   */
  private validatePreviousSteps(
    currentStepNumber: number,
    registrationProgress: any,
  ): string | null {
    // Step 1: No previous steps to check
    if (currentStepNumber === 1) {
      return null;
    }

    // Step 2: Check step 1 is completed
    if (currentStepNumber === 2) {
      if (registrationProgress.step_1_status !== 'completed') {
        return 'Please complete phone registration first.';
      }
      return null;
    }

    // Step 3: Check steps 1 and 2 are completed
    if (currentStepNumber === 3) {
      if (registrationProgress.step_1_status !== 'completed') {
        return 'Please complete phone registration first.';
      }
      if (!registrationProgress.is_phone_verified || registrationProgress.step_2_status !== 'completed') {
        return 'Please verify your phone number first.';
      }
      return null;
    }

    // Step 4: Check steps 1, 2, and 3 are completed and verified
    if (currentStepNumber === 4) {
      if (registrationProgress.step_1_status !== 'completed') {
        return 'Please complete phone registration first.';
      }
      if (!registrationProgress.is_phone_verified || registrationProgress.step_2_status !== 'completed') {
        return 'Please verify your phone number first.';
      }
      if (registrationProgress.step_3_status !== 'completed' || registrationProgress.id_verification_status !== 'verified') {
        return 'Please complete ID verification first.';
      }
      return null;
    }

    // Step 5: Check steps 1, 2, 3, and 4 are completed and verified
    if (currentStepNumber === 5) {
      if (registrationProgress.step_1_status !== 'completed') {
        return 'Please complete phone registration first.';
      }
      if (!registrationProgress.is_phone_verified || registrationProgress.step_2_status !== 'completed') {
        return 'Please verify your phone number first.';
      }
      if (registrationProgress.step_3_status !== 'completed' || registrationProgress.id_verification_status !== 'verified') {
        return 'Please complete ID verification first.';
      }
      if (registrationProgress.step_4_status && registrationProgress.step_4_status !== 'completed') {
        return 'Please complete face verification first.';
      }
      if (registrationProgress.face_verification_status && registrationProgress.face_verification_status !== 'verified') {
        return 'Face verification is pending. Please wait for verification to complete.';
      }
      return null;
    }

    // Step 6: Check steps 1-5 are completed
    if (currentStepNumber === 6) {
      if (registrationProgress.step_1_status !== 'completed') {
        return 'Please complete phone registration first.';
      }
      if (!registrationProgress.is_phone_verified || registrationProgress.step_2_status !== 'completed') {
        return 'Please verify your phone number first.';
      }
      if (registrationProgress.step_3_status !== 'completed' || registrationProgress.id_verification_status !== 'verified') {
        return 'Please complete ID verification first.';
      }
      if (registrationProgress.step_4_status && registrationProgress.step_4_status !== 'completed') {
        return 'Please complete face verification first.';
      }
      if (registrationProgress.face_verification_status && registrationProgress.face_verification_status !== 'verified') {
        return 'Face verification is pending. Please wait for verification to complete.';
      }
      if (registrationProgress.step_5_status !== 'completed') {
        return 'Please complete residential address first.';
      }
      return null;
    }

    // Step 7: Check steps 1-6 are completed
    if (currentStepNumber === 7) {
      if (registrationProgress.step_1_status !== 'completed') {
        return 'Please complete phone registration first.';
      }
      if (!registrationProgress.is_phone_verified || registrationProgress.step_2_status !== 'completed') {
        return 'Please verify your phone number first.';
      }
      if (registrationProgress.step_3_status !== 'completed' || registrationProgress.id_verification_status !== 'verified') {
        return 'Please complete ID verification first.';
      }
      if (registrationProgress.step_4_status && registrationProgress.step_4_status !== 'completed') {
        return 'Please complete face verification first.';
      }
      if (registrationProgress.face_verification_status && registrationProgress.face_verification_status !== 'verified') {
        return 'Face verification is pending. Please wait for verification to complete.';
      }
      if (registrationProgress.step_5_status !== 'completed') {
        return 'Please complete residential address first.';
      }
      if (registrationProgress.step_6_status !== 'completed') {
        return 'Please complete PEP declaration first.';
      }
      return null;
    }

    // Step 8: Check steps 1-7 are completed
    if (currentStepNumber === 8) {
      if (registrationProgress.step_1_status !== 'completed') {
        return 'Please complete phone registration first.';
      }
      if (!registrationProgress.is_phone_verified || registrationProgress.step_2_status !== 'completed') {
        return 'Please verify your phone number first.';
      }
      if (registrationProgress.step_3_status !== 'completed' || registrationProgress.id_verification_status !== 'verified') {
        return 'Please complete ID verification first.';
      }
      if (registrationProgress.step_4_status && registrationProgress.step_4_status !== 'completed') {
        return 'Please complete face verification first.';
      }
      if (registrationProgress.face_verification_status && registrationProgress.face_verification_status !== 'verified') {
        return 'Face verification is pending. Please wait for verification to complete.';
      }
      if (registrationProgress.step_5_status !== 'completed') {
        return 'Please complete residential address first.';
      }
      if (registrationProgress.step_6_status !== 'completed') {
        return 'Please complete PEP declaration first.';
      }
      if (registrationProgress.step_7_status !== 'completed') {
        return 'Please complete income declaration first.';
      }
      return null;
    }

    // Step 9: Check steps 1-8 are completed
    if (currentStepNumber === 9) {
      if (registrationProgress.step_1_status !== 'completed') {
        return 'Please complete phone registration first.';
      }
      if (!registrationProgress.is_phone_verified || registrationProgress.step_2_status !== 'completed') {
        return 'Please verify your phone number first.';
      }
      if (registrationProgress.step_3_status !== 'completed' || registrationProgress.id_verification_status !== 'verified') {
        return 'Please complete ID verification first.';
      }
      if (registrationProgress.step_4_status && registrationProgress.step_4_status !== 'completed') {
        return 'Please complete face verification first.';
      }
      if (registrationProgress.face_verification_status && registrationProgress.face_verification_status !== 'verified') {
        return 'Face verification is pending. Please wait for verification to complete.';
      }
      if (registrationProgress.step_5_status !== 'completed') {
        return 'Please complete residential address first.';
      }
      if (registrationProgress.step_6_status !== 'completed') {
        return 'Please complete PEP declaration first.';
      }
      if (registrationProgress.step_7_status !== 'completed') {
        return 'Please complete income declaration first.';
      }
      if (registrationProgress.step_8_status !== 'completed') {
        return 'Please complete password setup first.';
      }
      return null;
    }

    // Unknown step number
    return `Invalid step number: ${currentStepNumber}`;
  }

  /**
   * Check if BVN or NIN already exists in the database
   */
   private async checkIdNumberExists(
    idType: 'BVN' | 'NIN',
    idNumber: string,
    currentPhoneNumber: string,
  ): Promise<void> {
    try {
      // Check in KycVerification table
      let existingKyc;

      if (idType === 'BVN') {
        existingKyc = await this.prisma.kycVerification.findFirst({
          where: {
            bvn: idNumber,
          },
          include: {
            user: {
              select: {
                id: true,
                phone_number: true,
                email: true,
              },
            },
          },
        });
      } else if (idType === 'NIN') {
        existingKyc = await this.prisma.kycVerification.findFirst({
          where: {
            nin: idNumber,
          },
          include: {
            user: {
              select: {
                id: true,
                phone_number: true,
                email: true,
              },
            },
          },
        });
      }

      if (existingKyc) {
        // Check if it's the same user (same phone number)
        if (existingKyc.user.phone_number === currentPhoneNumber) {
          // Same user trying to use their own ID - this is okay
          this.logger.log(
            colors.yellow(
              `User ${currentPhoneNumber} is using their own ${idType}: ${idNumber.substring(0, 3)}***${idNumber.substring(8)}`,
            ),
          );
          return;
        }

        // Different user trying to use an already registered ID
        this.logger.error(
          colors.red(
            `${idType} ${idNumber.substring(0, 3)}***${idNumber.substring(8)} is already registered to another user`,
          ),
        );

        // Log security event for fraud detection
        await this.securityEventService.logEvent({
          eventType: 'duplicate_id_attempt',
          eventCategory: 'fraud',
          severity: 'high',
          phoneNumber: currentPhoneNumber,
          description: `Attempt to use ${idType} that is already registered to another user. Existing user: ${existingKyc.user.phone_number}`,
          metadata: {
            id_type: idType,
            id_number_masked: `${idNumber.substring(0, 3)}***${idNumber.substring(8)}`,
            existing_user_phone: existingKyc.user.phone_number,
            existing_user_id: existingKyc.user.id,
          },
        });

        throw new ConflictException(
          `This ${idType} is already registered to another account. Please use a different ${idType} or contact support if this is your ${idType}.`,
        );
      }

      // Also check in RegistrationProgress (incomplete registrations)
      const existingRegistrations = await this.prisma.registrationProgress.findMany({
        where: {
          phone_number: {
            not: currentPhoneNumber, // Exclude current registration
          },
          is_complete: false, // Only check incomplete registrations
        },
      });

      // Check if any incomplete registration has this ID
      for (const reg of existingRegistrations) {
        const regData = reg.registration_data as any;
        if (
          regData?.id_type === idType &&
          regData?.id_number === idNumber &&
          reg.phone_number !== currentPhoneNumber
        ) {
          this.logger.warn(
            colors.yellow(
              `${idType} ${idNumber.substring(0, 3)}***${idNumber.substring(8)} is being used in another incomplete registration`,
            ),
          );

          // Log security event
          await this.securityEventService.logEvent({
            eventType: 'duplicate_id_in_registration',
            eventCategory: 'fraud',
            severity: 'medium',
            phoneNumber: currentPhoneNumber,
            registrationProgressId: reg.id,
            description: `Attempt to use ${idType} that is in another incomplete registration`,
            metadata: {
              id_type: idType,
              id_number_masked: `${idNumber.substring(0, 3)}***${idNumber.substring(8)}`,
              other_registration_phone: reg.phone_number,
            },
          });

          throw new ConflictException(
            `This ${idType} is already being used in another registration. Please use a different ${idType} or contact support.`,
          );
        }
      }

      this.logger.log(
        `ID number ${idNumber.substring(0, 3)}***${idNumber.substring(8)} is available`,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Error checking ID number existence: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Submit ID Information (Step 3)
   * User submits BVN or NIN for verification
   */
  async submitIdInformation(
    dto: SubmitIdInformationDto,
    headers: any,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(
        `Submitting ID information for ${dto.phone_number}. Type: ${dto.id_type}`,
      ),
    );

    try {
      // 1. Format and validate phone number
      const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number);
      this.logger.log(colors.cyan(`Formatted phone number: ${formattedPhone}`));
      if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
        return new ApiResponseDto(false, 'Phone number must be in E.164 format (+234XXXXXXXXXX)', null);
      }

      // Note: Security headers are now handled by SecurityHeadersGuard at controller level

      // 2. Find registration progress
      const registrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (!registrationProgress) {
        return new ApiResponseDto(false, 'No active registration found. Please start registration first.', null);
      }

      if (registrationProgress.is_complete) {
        return new ApiResponseDto(false, 'Registration already completed. Please login instead.', null);
      }

      // 3. Validate session_id if provided
      if (dto.session_id && dto.session_id !== registrationProgress.id) {
        return new ApiResponseDto(false, 'Session ID does not match phone number. Please use the correct session.', null);
      }

      // 4. Validate previous steps are completed
      const previousStepsError = this.validatePreviousSteps(3, registrationProgress);
      if (previousStepsError) {
        return new ApiResponseDto(false, previousStepsError, null);
      }

      // 5. Normalize ID type (uppercase)
      const idType = dto.id_type.toUpperCase() as 'BVN' | 'NIN';

      // 6. Format and validate ID number
      const formattedIdNumber = IdValidator.formatIdNumber(dto.id_number);
      IdValidator.validateIdNumber(idType, formattedIdNumber);

      // 7. Check if this BVN/NIN already exists in the database
      await this.checkIdNumberExists(idType, formattedIdNumber, formattedPhone);

      // 8. Check if user already submitted ID information in this registration
      const existingRegistrationData = registrationProgress.registration_data as any;
      if (
        existingRegistrationData?.id_type &&
        existingRegistrationData?.id_number &&
        existingRegistrationData.id_number === formattedIdNumber
      ) {
        // Same ID already submitted - return success (idempotent)
        this.logger.log(
          colors.yellow(
            `ID information already submitted for ${formattedPhone}. Returning existing data.`,
          ),
        );

        return new ApiResponseDto(true, 'ID information already submitted', {
          session_id: registrationProgress.id,
          step: 3,
          next_step: 'FACE_VERIFICATION',
          id_type: existingRegistrationData.id_type,
          id_verification_status: registrationProgress.id_verification_status || 'pending',
          can_proceed: registrationProgress.step_3_status === 'completed' && registrationProgress.id_verification_status === 'verified',
          message: registrationProgress.step_3_status === 'completed' && registrationProgress.id_verification_status === 'verified'
            ? 'ID verification completed. You can proceed to face verification.'
            : 'ID verification is pending. Please wait for verification to complete.',
        });
      }

      // 9. Perform KYC verification using configured provider
      let verificationResult;
      let verificationStatus: 'pending' | 'verified' | 'failed' = 'pending';
      let canProceed = false;

      if (idType === 'NIN') {
        verificationResult = await this.kycService.verifyNIN(formattedIdNumber);
      } else if (idType === 'BVN') {
        verificationResult = await this.kycService.verifyBVN(formattedIdNumber);
      } else {
        throw new BadRequestException(`Unsupported ID type: ${idType}. Only NIN and BVN are supported.`);
      }

      // Determine verification status
      if (verificationResult.success && verificationResult.verified) {
        verificationStatus = 'verified';
        canProceed = true;
        this.logger.log(
          colors.green(
            `${idType} verification successful for ${formattedPhone}. Provider: ${this.kycService.getProviderName()}`,
          ),
        );
      } else if (verificationResult.success && !verificationResult.verified) {
        // Provider returned success but verification is pending (e.g., "none" provider in test mode)
        verificationStatus = 'pending';
        canProceed = false;
        this.logger.log(
          colors.yellow(
            `${idType} verification pending for ${formattedPhone}. Provider: ${this.kycService.getProviderName()}`,
          ),
        );
      } else {
        verificationStatus = 'failed';
        canProceed = false;
        this.logger.error(
          colors.red(
            `${idType} verification failed for ${formattedPhone}: ${verificationResult.error}`,
          ),
        );
      }

      // 10. Update registration progress with ID information and verification result
      const updatedRegistrationData = {
        ...existingRegistrationData,
        id_type: idType,
        id_number: formattedIdNumber,
        id_submitted_at: new Date().toISOString(),
        verification_result: verificationResult,
        verification_provider: this.kycService.getProviderName(),
      };

      // Determine step 3 status based on verification result
      let step3Status: 'completed' | 'pending' = 'completed';
      if (verificationStatus === 'pending') {
        step3Status = 'pending';
      }

      await this.prisma.registrationProgress.update({
        where: { phone_number: formattedPhone },
        data: {
          step_3_status: step3Status,
          current_step: 3,
          registration_data: updatedRegistrationData,
          id_verification_status: verificationStatus,
          updatedAt: new Date(),
        },
      });

      // Fetch updated registration progress to get latest step statuses
      const updatedRegistrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (!updatedRegistrationProgress) {
        throw new BadRequestException('Registration progress not found after ID submission');
      }

      // Build steps object with status
      const steps = RegistrationStepsHelper.buildStepsObject(
        updatedRegistrationProgress,
        updatedRegistrationData,
      );

      this.logger.log(
        colors.magenta(
          `ID information submitted successfully for ${formattedPhone}. Type: ${idType}, Number: ${formattedIdNumber.substring(0, 3)}***${formattedIdNumber.substring(8)}, Status: ${verificationStatus}`,
        ),
      );

      // 11. Prepare response based on verification status
      let message = '';
      if (verificationStatus === 'verified') {
        message = `${idType} verified successfully. You can proceed to face verification.`;
      } else if (verificationStatus === 'pending') {
        message = `${idType} submitted. Verification is in progress. You will be notified when verification is complete.`;
      } else {
        message = `${idType} verification failed: ${verificationResult.error || 'Unknown error'}. Please check your ${idType} and try again.`;
      }

      return new ApiResponseDto(
        verificationStatus !== 'failed',
        message,
        {
          session_id: registrationProgress.id,
          step: 3,
          next_step: verificationStatus === 'verified' ? 'FACE_VERIFICATION' : 'ID_INFORMATION',
          id_type: idType,
          id_verification_status: verificationStatus,
          can_proceed: canProceed,
          verification_provider: this.kycService.getProviderName(),
          verification_data: verificationResult.data || null,
          steps: steps,
        },
      );
    } catch (error) {
      this.logger.error(
        colors.red(`ID information submission error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to submit ID information',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Submit Residential Address (Step 5)
   * User submits their residential address details
   */
  async submitResidentialAddress(
    dto: SubmitResidentialAddressDto,
    headers: any,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(
        `Submitting residential address for ${dto.phone_number}`,
      ),
    );

    try {
      // 1. Format and validate phone number
      const formattedPhone = PhoneValidator.formatPhoneToE164(dto.phone_number);
      this.logger.log(colors.cyan(`Formatted phone number: ${formattedPhone}`));
      if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
        return new ApiResponseDto(false, 'Phone number must be in E.164 format (+234XXXXXXXXXX)', null);
      }

      // 2. Find registration progress
      const registrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (!registrationProgress) {
        this.logger.error(colors.red(`No active registration found. Please start registration first.`));
        return new ApiResponseDto(false, 'No active registration found. Please start registration first.', null);
      }

      if (registrationProgress.is_complete) {
        this.logger.error(colors.red(`Registration already completed. Please login instead.`));
        return new ApiResponseDto(false, 'Registration already completed. Please login instead.', null);
      }

      // 3. Validate session_id if provided
      if (dto.session_id && dto.session_id !== registrationProgress.id) {
        this.logger.error(colors.red(`Session ID does not match phone number. Please use the correct session.`));
        return new ApiResponseDto(false, 'Session ID does not match phone number. Please use the correct session.', null);
      }

      // 4. Validate previous steps are completed
      const previousStepsError = this.validatePreviousSteps(5, registrationProgress);
      if (previousStepsError) {
        this.logger.error(colors.red(previousStepsError));
        return new ApiResponseDto(false, previousStepsError, null);
      }

      // 5. Validate address data
      if (!dto.address.street_address || !dto.address.state || !dto.address.lga || !dto.address.country) {
        return new ApiResponseDto(false, 'Please provide all required address fields: street_address, state, lga, and country.', null);
      }

      // 6. Get existing registration data
      const existingRegistrationData = registrationProgress.registration_data as any;

      // 7. Update registration progress with address information
      const updatedRegistrationData = {
        ...existingRegistrationData,
        address: {
          street_address: dto.address.street_address.trim(),
          state: dto.address.state.trim(),
          lga: dto.address.lga.trim(),
          area: dto.address.area?.trim() || null,
          country: dto.address.country.trim(),
          submitted_at: new Date().toISOString(),
        },
      };

      await this.prisma.registrationProgress.update({
        where: { phone_number: formattedPhone },
        data: {
          step_5_status: 'completed',
          current_step: 5,
          registration_data: updatedRegistrationData,
          updatedAt: new Date(),
        },
      });

      // Fetch updated registration progress to get latest step statuses
      const updatedRegistrationProgress = await this.prisma.registrationProgress.findUnique({
        where: { phone_number: formattedPhone },
      });

      if (!updatedRegistrationProgress) {
        throw new BadRequestException('Registration progress not found after address submission');
      }

      // Build steps object with status
      const steps = RegistrationStepsHelper.buildStepsObject(
        updatedRegistrationProgress,
        updatedRegistrationData,
      );

      this.logger.log(
        colors.magenta(
          `Residential address submitted successfully for ${formattedPhone}. State: ${dto.address.state}, LGA: ${dto.address.lga}`,
        ),
      );

      return new ApiResponseDto(true, 'Residential address submitted successfully', {
        session_id: registrationProgress.id,
        step: 5,
        next_step: 'PEP_DECLARATION',
        can_proceed: true,
        address: {
          street_address: dto.address.street_address,
          state: dto.address.state,
          lga: dto.address.lga,
          area: dto.address.area || null,
          country: dto.address.country,
        },
        steps: steps,
      });
    } catch (error) {
      this.logger.error(
        colors.red(`Residential address submission error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to submit residential address',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  

}


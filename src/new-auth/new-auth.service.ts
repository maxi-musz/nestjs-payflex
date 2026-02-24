import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditAction, AuditActorType, AuditStatus, Gender } from '@prisma/client';
import * as argon from 'argon2';
import * as crypto from 'crypto';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/mailer/email.service';
import { AuditLogService } from '../common/audit-log/audit-log.service';
import { StatsService } from '../common/stats/stats.service';
import { ReferralService } from '../referral/referral.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { formatDate } from '../common/helper_functions/formatter';
import { generateSmipayTag } from '../common/helper_functions/generators';
import type { SignInDto } from './dto/sign-in.dto';
import type { RegisterDto } from './dto/register.dto';
import type { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import type { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import type { VerifyPasswordResetOtpDto } from './dto/verify-password-reset-otp.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class NewAuthService {
  private readonly logger = new Logger(NewAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly audit: AuditLogService,
    private readonly stats: StatsService,
    private readonly referralService: ReferralService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────

  private async signToken(
    userId: string,
    email: string | null,
    phoneNumber: string | null,
    role: string | null,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email: email ?? null,
      phone_number: phoneNumber ?? null,
      role: role ?? 'user',
    };
    const secret = this.config.get('JWT_SECRET');
    const expiresIn = this.config.get('JWT_EXPIRES_IN') || '7d';
    return this.jwt.signAsync(payload, { expiresIn, secret });
  }

  private deviceFields(req: Request) {
    const dm = req.deviceMetadata;
    return {
      device_id: dm?.device_id,
      device_model: dm?.device_model,
      platform: dm?.platform,
    };
  }

  // ──────────────────────────────────────────────────────────
  // SIGN IN
  // ──────────────────────────────────────────────────────────

  async signin(dto: SignInDto, req: Request) {
    this.logger.log('Sign in attempt');

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile_image: true, kyc_verification: true },
    });

    // User not found
    if (!user) {
      this.audit.logAuth(AuditAction.LOGIN_FAILED, AuditStatus.FAILURE, req, {
        description: `Login failed — no account found for ${dto.email}`,
        metadata: { email: dto.email, reason: 'user_not_found' },
        ...this.deviceFields(req),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Wrong password
    const isPasswordValid =
      user.password && (await argon.verify(user.password, dto.password));
    if (!isPasswordValid) {
      this.audit.logAuth(AuditAction.LOGIN_FAILED, AuditStatus.FAILURE, req, {
        user_id: user.id,
        description: `Login failed — wrong password for ${dto.email}`,
        resource_type: 'User',
        resource_id: user.id,
        metadata: { email: dto.email, reason: 'wrong_password' },
        ...this.deviceFields(req),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = await this.signToken(
      user.id,
      user.email,
      user.phone_number,
      user.role ?? null,
    );

    // Login successful
    this.audit.logAuth(AuditAction.LOGIN, AuditStatus.SUCCESS, req, {
      user_id: user.id,
      actor_name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
      description: `User ${dto.email} signed in`,
      resource_type: 'User',
      resource_id: user.id,
      metadata: {
        email: dto.email,
        is_email_verified: user.is_email_verified,
        role: user.role,
      },
      ...this.deviceFields(req),
    });

    const formattedUser = {
      id: user.id,
      email: user.email,
      name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number ?? null,
      is_email_verified: user.is_email_verified,
      role: user.role ?? null,
      gender: user.gender ?? null,
      date_of_birth: user.date_of_birth ?? null,
      profile_image: user.profile_image?.secure_url ?? null,
      kyc_verified: user.kyc_verification?.is_verified ?? false,
      isTransactionPinSetup: !!user.transactionPinHash,
      created_at: formatDate(user.createdAt),
    };

    return new ApiResponseDto(true, 'Welcome back', {
      access_token,
      refresh_token: null as string | null,
      user: formattedUser,
    });
  }

  // ──────────────────────────────────────────────────────────
  // REQUEST EMAIL VERIFICATION (pre-registration: check email new, send OTP)
  // ──────────────────────────────────────────────────────────

  async requestEmailVerification(dto: RequestEmailVerificationDto, req: Request) {
    this.logger.log(`Request email verification for ${dto.email}`);

    const defaultTier = await this.prisma.tier.findFirst({
      where: { order: 1 },
      orderBy: { order: 'asc' },
    });
    if (!defaultTier) {
      await this.audit.logAuth(AuditAction.EMAIL_OTP_REQUEST, AuditStatus.FAILURE, req, {
        description: `Email verification blocked — tier service not available (no tier with order 1)`,
        metadata: { email: dto.email, reason: 'tier_service_unavailable' },
        ...this.deviceFields(req),
      });
      this.logger.error('Error connecting to Tier service. No tier with order 1 found');
      throw new ServiceUnavailableException(
        'Error connecting toTier service. Please try again later or contact support.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      await this.audit.logAuth(AuditAction.EMAIL_OTP_REQUEST, AuditStatus.FAILURE, req, {
        description: `Email verification requested but email ${dto.email} is already registered`,
        metadata: { email: dto.email, reason: 'email_already_registered' },
        ...this.deviceFields(req),
      });
      this.logger.log("This emil is already registered to another customer")         
      throw new ConflictException('This email is already registered. Please sign in.');
    }

    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.emailVerification.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        otp,
        otp_expires_at: otpExpiresAt,
      },
      update: {
        otp,
        otp_expires_at: otpExpiresAt,
        verified_at: null,
      },
    });

    try {
      await this.emailService.sendOTPEmail(dto.email, otp);
    } catch (err: any) {
      this.logger.error('Failed to send OTP email for verification', err?.message);
      await this.audit.logAuth(AuditAction.EMAIL_OTP_REQUEST, AuditStatus.FAILURE, req, {
        description: `Email verification OTP failed to send for ${dto.email}`,
        error_message: err?.message,
        metadata: { email: dto.email, reason: 'email_send_failed' },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Failed to send verification email. Please try again.');
    }

    await this.audit.logAuth(AuditAction.EMAIL_OTP_REQUEST, AuditStatus.SUCCESS, req, {
      description: `Verification OTP sent to ${dto.email}`,
      metadata: { email: dto.email },
      ...this.deviceFields(req),
    });

    return new ApiResponseDto(true, `OTP sent to ${dto.email}. Enter it to verify your email.`);
  }

  // ──────────────────────────────────────────────────────────
  // VERIFY EMAIL FOR REGISTRATION (pre-registration: confirm OTP, set verified_at)
  // ──────────────────────────────────────────────────────────

  async verifyEmailForRegistration(dto: VerifyPasswordResetOtpDto, req: Request) {
    this.logger.log(`Verifying email for registration: ${dto.email}`);

    const record = await this.prisma.emailVerification.findUnique({
      where: { email: dto.email },
    });

    if (!record) {
      await this.audit.logAuth(AuditAction.EMAIL_OTP_VERIFY, AuditStatus.FAILURE, req, {
        description: `Email verification failed — no verification record for ${dto.email}`,
        metadata: { email: dto.email, reason: 'no_record' },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Invalid or expired OTP. Request a new verification code.');
    }

    if (record.otp !== dto.otp) {
      await this.audit.logAuth(AuditAction.EMAIL_OTP_VERIFY, AuditStatus.FAILURE, req, {
        description: `Email verification failed — wrong OTP for ${dto.email}`,
        metadata: { email: dto.email, reason: 'wrong_otp' },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Invalid or expired OTP provided');
    }

    if (new Date() > new Date(record.otp_expires_at)) {
      await this.audit.logAuth(AuditAction.EMAIL_OTP_VERIFY, AuditStatus.FAILURE, req, {
        description: `Email verification failed — expired OTP for ${dto.email}`,
        metadata: { email: dto.email, reason: 'expired_otp' },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Invalid or expired OTP provided');
    }

    await this.prisma.emailVerification.update({
      where: { email: dto.email },
      data: { verified_at: new Date() },
    });

    await this.audit.logAuth(AuditAction.EMAIL_OTP_VERIFY, AuditStatus.SUCCESS, req, {
      description: `Email ${dto.email} verified for registration`,
      metadata: { email: dto.email },
      ...this.deviceFields(req),
    });

    return new ApiResponseDto(true, 'Email verified. You can now complete registration.');
  }

  // ──────────────────────────────────────────────────────────
  // REGISTER (requires email verified via request-email-verification + verify-email-for-registration)
  // ──────────────────────────────────────────────────────────

  async register(dto: RegisterDto, req: Request) {
    this.logger.log(`Register attempt for ${dto.email}`);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      await this.audit.logAuth(AuditAction.REGISTER_START, AuditStatus.FAILURE, req, {
        description: `Registration failed — email ${dto.email} already exists`,
        metadata: { email: dto.email, reason: 'email_exists' },
        ...this.deviceFields(req),
      });
      throw new ConflictException('User already exists with this email');
    }

    const emailVerification = await this.prisma.emailVerification.findUnique({
      where: { email: dto.email },
    });
    if (!emailVerification?.verified_at) {
      await this.audit.logAuth(AuditAction.REGISTER_START, AuditStatus.FAILURE, req, {
        description: `Registration failed — email ${dto.email} not verified. Verify email first.`,
        metadata: { email: dto.email, reason: 'email_not_verified' },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Please verify your email first using the code we sent you.');
    }

    const verifiedAt = new Date(emailVerification.verified_at);
    const maxAgeMs = 30 * 60 * 1000;
    if (Date.now() - verifiedAt.getTime() > maxAgeMs) {
      await this.audit.logAuth(AuditAction.REGISTER_START, AuditStatus.FAILURE, req, {
        description: `Registration failed — email verification expired for ${dto.email}`,
        metadata: { email: dto.email, reason: 'verification_expired' },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Email verification expired. Please verify your email again.');
    }

    const tierWithOrderOne = await this.prisma.tier.findFirst({
      where: { order: 1 },
      orderBy: { order: 'asc' },
    });
    if (!tierWithOrderOne) {
      await this.audit.logAuth(AuditAction.REGISTER_START, AuditStatus.FAILURE, req, {
        description: `Registration failed — tier service not available (no tier with order 1)`,
        metadata: { email: dto.email, reason: 'tier_service_unavailable' },
        ...this.deviceFields(req),
      });
      throw new ServiceUnavailableException(
        'Tier service is not yet running. Please try again later or contact support.',
      );
    }

    const hash = await argon.hash(dto.password);
    const smipayTag = await generateSmipayTag(this.prisma);
    const genderValue = dto.gender?.toLowerCase();
    const gender =
      genderValue === 'male' || genderValue === 'female'
        ? (genderValue as Gender)
        : undefined;

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        smipay_tag: smipayTag,
        password: hash,
        hash: hash,
        first_name: dto.first_name,
        last_name: dto.last_name,
        middle_name: dto.middle_name ?? null,
        gender: gender ?? null,
        phone_number: dto.phone_number,
        referral_code: dto.referral_code ?? null,
        agree_to_terms: dto.agree_to_terms,
        updates_opt_in: dto.updates_opt_in ?? false,
        is_email_verified: true,
        tier_id: tierWithOrderOne.id,
        address: dto.country
          ? { create: { country: dto.country } }
          : undefined,
      },
    });

    await this.prisma.wallet.create({
      data: {
        user_id: newUser.id,
        current_balance: 0,
        all_time_fuunding: 0,
        all_time_withdrawn: 0,
        isActive: true,
      },
    });

    this.stats.onUserCreated(tierWithOrderOne.tier);

    if (dto.referral_code) {
      this.referralService.createReferral({
        referralCode: dto.referral_code,
        refereeUserId: newUser.id,
        refereePhoneNumber: dto.phone_number,
      });
    }

    await this.audit.logAuth(AuditAction.REGISTER_COMPLETE, AuditStatus.SUCCESS, req, {
      user_id: newUser.id,
      actor_name: `${dto.first_name} ${dto.last_name}`,
      description: `User ${dto.email} registered successfully`,
      resource_type: 'User',
      resource_id: newUser.id,
      metadata: {
        email: dto.email,
        phone_number: dto.phone_number,
        smipay_tag: smipayTag,
        referral_code: dto.referral_code ?? null,
        tier_id: tierWithOrderOne.id,
      },
      ...this.deviceFields(req),
    });

    return new ApiResponseDto(true, 'Account created successfully. You can sign in.', {
      user: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // VERIFY EMAIL OTP (post-registration)
  // ──────────────────────────────────────────────────────────

  async verifyEmailOtp(dto: VerifyPasswordResetOtpDto, req: Request) {
    this.logger.log(`Verifying email OTP for ${dto.email}`);

    const userByEmail = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, otp: dto.otp },
    });

    // Wrong OTP (no match)
    if (!user) {
      this.audit.logAuth(AuditAction.EMAIL_OTP_VERIFY, AuditStatus.FAILURE, req, {
        user_id: userByEmail?.id,
        description: `Email OTP verification failed — wrong OTP for ${dto.email}`,
        resource_type: 'User',
        resource_id: userByEmail?.id,
        metadata: { email: dto.email, reason: 'wrong_otp' },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Invalid or expired OTP provided');
    }

    // Expired OTP
    if (!user.otp_expires_at || new Date() > new Date(user.otp_expires_at)) {
      this.audit.logAuth(AuditAction.EMAIL_OTP_VERIFY, AuditStatus.FAILURE, req, {
        user_id: user.id,
        description: `Email OTP verification failed — expired OTP for ${dto.email}`,
        resource_type: 'User',
        resource_id: user.id,
        metadata: { email: dto.email, reason: 'expired_otp', expired_at: user.otp_expires_at },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Invalid or expired OTP provided');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { is_email_verified: true, otp: null, otp_expires_at: null },
    });

    this.audit.logAuth(AuditAction.EMAIL_OTP_VERIFY, AuditStatus.SUCCESS, req, {
      user_id: user.id,
      actor_name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
      description: `Email verified successfully for ${dto.email}`,
      resource_type: 'User',
      resource_id: user.id,
      metadata: { email: dto.email },
      ...this.deviceFields(req),
    });

    return new ApiResponseDto(true, 'Email verified successfully');
  }

  // ──────────────────────────────────────────────────────────
  // FORGOT PASSWORD — REQUEST OTP
  // ──────────────────────────────────────────────────────────

  async requestPasswordResetOtp(dto: RequestPasswordResetDto, req: Request) {
    this.logger.log(`Password reset OTP requested for ${dto.email}`);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      this.audit.logAuth(AuditAction.PASSWORD_RESET_REQUEST, AuditStatus.FAILURE, req, {
        description: `Password reset requested for non-existent email ${dto.email}`,
        metadata: { email: dto.email, reason: 'user_not_found' },
        ...this.deviceFields(req),
      });
      throw new NotFoundException('User not found');
    }

    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp, otp_expires_at: otpExpiresAt },
    });

    try {
      await this.emailService.sendOTPEmail(dto.email, otp);
    } catch (err: any) {
      this.logger.error('Failed to send OTP email', err?.message);
      this.audit.logAuth(AuditAction.PASSWORD_RESET_REQUEST, AuditStatus.FAILURE, req, {
        user_id: user.id,
        description: `Password reset OTP email failed to send for ${dto.email}`,
        resource_type: 'User',
        resource_id: user.id,
        error_message: err?.message,
        metadata: { email: dto.email, reason: 'email_send_failed' },
        ...this.deviceFields(req),
      });
      return new ApiResponseDto(false, 'Failed to send OTP email. Please try again later.');
    }

    this.audit.logAuth(AuditAction.PASSWORD_RESET_REQUEST, AuditStatus.SUCCESS, req, {
      user_id: user.id,
      actor_name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
      description: `Password reset OTP sent to ${dto.email}`,
      resource_type: 'User',
      resource_id: user.id,
      metadata: { email: dto.email },
      ...this.deviceFields(req),
    });

    return new ApiResponseDto(true, `OTP successfully sent to: ${dto.email}`);
  }

  // ──────────────────────────────────────────────────────────
  // VERIFY PASSWORD RESET OTP
  // ──────────────────────────────────────────────────────────

  async verifyPasswordResetOtp(dto: VerifyPasswordResetOtpDto, req: Request) {
    this.logger.log(`Verifying password reset OTP for ${dto.email}`);

    const userByEmail = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, otp: dto.otp },
    });

    if (!user) {
      this.audit.logAuth(AuditAction.PASSWORD_RESET_VERIFY, AuditStatus.FAILURE, req, {
        user_id: userByEmail?.id,
        description: `Password reset OTP verification failed — wrong OTP for ${dto.email}`,
        resource_type: 'User',
        resource_id: userByEmail?.id,
        metadata: { email: dto.email, reason: 'wrong_otp' },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Invalid or expired OTP provided');
    }

    if (!user.otp_expires_at || new Date() > new Date(user.otp_expires_at)) {
      this.audit.logAuth(AuditAction.PASSWORD_RESET_VERIFY, AuditStatus.FAILURE, req, {
        user_id: user.id,
        description: `Password reset OTP expired for ${dto.email}`,
        resource_type: 'User',
        resource_id: user.id,
        metadata: { email: dto.email, reason: 'expired_otp', expired_at: user.otp_expires_at },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Invalid or expired OTP provided');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otp_expires_at: null },
    });

    this.audit.logAuth(AuditAction.PASSWORD_RESET_VERIFY, AuditStatus.SUCCESS, req, {
      user_id: user.id,
      actor_name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
      description: `Password reset OTP verified for ${dto.email}`,
      resource_type: 'User',
      resource_id: user.id,
      metadata: { email: dto.email },
      ...this.deviceFields(req),
    });

    return new ApiResponseDto(true, 'OTP verified successfully');
  }

  // ──────────────────────────────────────────────────────────
  // RESET PASSWORD
  // ──────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto, req: Request): Promise<ApiResponseDto<null>> {
    this.logger.log('Resetting password');

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      this.audit.logAuth(AuditAction.PASSWORD_RESET_COMPLETE, AuditStatus.FAILURE, req, {
        description: `Password reset failed — no account for ${dto.email}`,
        metadata: { email: dto.email, reason: 'user_not_found' },
        ...this.deviceFields(req),
      });
      throw new NotFoundException('User not found');
    }

    const userWithOtp = await this.prisma.user.findFirst({
      where: { email: dto.email, otp: dto.otp },
    });

    if (!userWithOtp) {
      this.audit.logAuth(AuditAction.PASSWORD_RESET_COMPLETE, AuditStatus.FAILURE, req, {
        user_id: user.id,
        description: `Password reset failed — wrong OTP for ${dto.email}`,
        resource_type: 'User',
        resource_id: user.id,
        metadata: { email: dto.email, reason: 'wrong_otp' },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Invalid or expired OTP provided');
    }

    if (
      !userWithOtp.otp_expires_at ||
      new Date() > new Date(userWithOtp.otp_expires_at)
    ) {
      this.audit.logAuth(AuditAction.PASSWORD_RESET_COMPLETE, AuditStatus.FAILURE, req, {
        user_id: user.id,
        description: `Password reset failed — expired OTP for ${dto.email}`,
        resource_type: 'User',
        resource_id: user.id,
        metadata: { email: dto.email, reason: 'expired_otp', expired_at: userWithOtp.otp_expires_at },
        ...this.deviceFields(req),
      });
      throw new BadRequestException('Invalid or expired OTP provided');
    }

    const hashedPassword = await argon.hash(dto.new_password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: dto.email },
        data: {
          password: hashedPassword,
          hash: hashedPassword,
          otp: null,
          otp_expires_at: null,
        },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    this.audit.logAuth(AuditAction.PASSWORD_RESET_COMPLETE, AuditStatus.SUCCESS, req, {
      user_id: user.id,
      actor_name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
      description: `Password reset successfully for ${dto.email}`,
      resource_type: 'User',
      resource_id: user.id,
      metadata: { email: dto.email, sessions_invalidated: true },
      ...this.deviceFields(req),
    });

    return new ApiResponseDto(true, 'Password reset successfully');
  }

  // ──────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────

  async logout(req: Request) {
    const payload = (req as any).user;
    const userId: string | undefined = payload?.id ?? payload?.sub;

    if (userId) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    // Fetch user from DB so we have a consistent shape for audit (same as login)
    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, first_name: true, last_name: true },
        })
      : null;

    const actorName = user
      ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email
      : payload?.email ?? undefined;
    const description = `User ${user?.email ?? payload?.email ?? userId ?? 'unknown'} logged out`;

    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req as any).ip;
    const dm = req.deviceMetadata;
    const ua = req.headers?.['user-agent'];
    const userAgent = typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] : undefined;
    const rid = req.headers?.['x-request-id'];
    const requestId = typeof rid === 'string' ? rid : Array.isArray(rid) ? rid[0] : undefined;

    await this.audit.log({
      user_id: userId,
      actor_type: AuditActorType.USER,
      actor_name: actorName,
      action: AuditAction.LOGOUT,
      status: AuditStatus.SUCCESS,
      resource_type: 'User',
      resource_id: userId,
      description,
      ip_address: ip,
      user_agent: userAgent,
      http_method: req.method,
      endpoint: req.originalUrl ?? (req as any).url,
      request_id: requestId,
      device_id: dm?.device_id,
      device_model: dm?.device_model,
      platform: dm?.platform,
      latitude: dm?.latitude,
      longitude: dm?.longitude,
    });

    return new ApiResponseDto(true, 'Logged out successfully');
  }
}

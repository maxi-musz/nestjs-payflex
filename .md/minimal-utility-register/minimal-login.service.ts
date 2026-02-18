import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { MinimalLoginDto } from './dto/minimal-login.dto';
import { PhoneValidator } from '../helpers/phone.validator';
import { DeviceTrackerService } from '../helpers/device-tracker.service';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import * as colors from 'colors';

/**
 * Minimal Login Service
 * 
 * Handles login for users who registered via minimal registration flow.
 * Supports login with either email or phone number + password.
 */
@Injectable()
export class MinimalLoginService {
  private readonly logger = new Logger(MinimalLoginService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private deviceTracker: DeviceTrackerService,
  ) {}

  /**
   * Login with email or phone number and password
   * 
   * @param dto - MinimalLoginDto containing email or phone_number and password
   * @param ipAddress - Client IP address
   * @returns ApiResponseDto with access token and user information
   */
  async login(
    dto: MinimalLoginDto,
    ipAddress: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.log(
      colors.cyan(
        `Minimal login attempt: ${dto.email || dto.phone_number}`,
      ),
    );

    try {
      // 1. Validate that either email or phone_number is provided
      if (!dto.email && !dto.phone_number) {
        throw new BadRequestException(
          'Either email or phone number is required',
        );
      }

      // 2. Find user by email or phone number
      let user;
      if (dto.email) {
        user = await this.prisma.user.findUnique({
          where: { email: dto.email },
          include: {
            wallet: {
              select: {
                current_balance: true,
                isActive: true,
              },
            },
          },
        });
      } else if (dto.phone_number) {
        const formattedPhone = PhoneValidator.formatPhoneToE164(
          dto.phone_number,
        );
        if (!PhoneValidator.validatePhoneNumber(formattedPhone)) {
          throw new BadRequestException(
            'Phone number must be in format: 234XXXXXXXXXX',
          );
        }

        user = await this.prisma.user.findFirst({
          where: { phone_number: formattedPhone },
          include: {
            wallet: {
              select: {
                current_balance: true,
                isActive: true,
              },
            },
          },
        });
      }

      // 3. Check if user exists
      if (!user) {
        this.logger.warn(
          colors.yellow(
            `Login attempt with invalid credentials: ${dto.email || dto.phone_number}`,
          ),
        );
        throw new UnauthorizedException('Invalid email/phone number or password');
      }

      // 4. Check if user has a password (user must have completed registration)
      if (!user.password) {
        this.logger.warn(
          colors.yellow(
            `Login attempt for user without password: ${user.id}`,
          ),
        );
        throw new UnauthorizedException(
          'Account not fully set up. Please complete registration first.',
        );
      }

      // 5. Check if account is active
      if (user.account_status === 'suspended') {
        this.logger.warn(
          colors.yellow(`Suspended account attempted login: ${user.id}`),
        );
        throw new UnauthorizedException(
          'Your account has been suspended. Please contact support.',
        );
      }

      // 6. Verify password
      const isPasswordValid = await argon.verify(user.password, dto.password);
      if (!isPasswordValid) {
        this.logger.warn(
          colors.yellow(
            `Invalid password attempt for user: ${user.id}`,
          ),
        );
        throw new UnauthorizedException('Invalid email/phone number or password');
      }

      // 7. Generate JWT access token
      const accessToken = await this.signToken(
        user.id,
        user.email,
        user.phone_number,
      );
      this.logger.log(colors.green(`Access token generated for user: ${user.id}`));

      // 8. Track device (non-blocking)
      // Device tracking is optional and runs in background
      // Note: Device metadata would need to be passed from controller if needed

      // 9. Format user data for response
      const userData = {
        id: user.id,
        email: user.email,
        phone_number: user.phone_number,
        smipay_tag: user.smipay_tag,
        first_name: user.first_name,
        last_name: user.last_name,
        is_email_verified: user.is_email_verified,
        is_phone_verified: user.is_phone_verified,
        account_status: user.account_status,
        wallet: user.wallet
          ? {
              current_balance: user.wallet.current_balance,
              isActive: user.wallet.isActive,
            }
          : null,
      };

      this.logger.log(
        colors.magenta(
          `✅ Login successful for user: ${user.id} (${user.email || user.phone_number})`,
        ),
      );

      return new ApiResponseDto(true, 'Login successful', {
        access_token: accessToken,
        user: userData,
        token_type: 'Bearer',
      });
    } catch (error) {
      this.logger.error(
        colors.red(`Minimal login error: ${error.message}`),
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Login failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sign JWT token
   */
  private async signToken(
    userId: string,
    email: string | null,
    phone_number: string | null,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email: email || null,
      phone_number: phone_number || null,
    };

    const secret = this.config.get('JWT_SECRET');
    const expiration_time = this.config.get('JWT_EXPIRES_IN') || '7d';

    return this.jwt.signAsync(payload, {
      expiresIn: expiration_time,
      secret: secret,
    });
  }
}


import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthDto, RequestEmailOTPDto, ResetPasswordDto, SignInDto, VerifyEmailOTPDto } from "./dto";
import * as argon from "argon2"
import { Gender } from "@prisma/client";
import * as crypto from "crypto"
import { sendOTPByEmail } from "src/common/mailer/send-email";
import * as colors from "colors"
import { JwtService } from '@nestjs/jwt';
import generateTokens from "src/utils/generate.token";
import { ConfigService } from "@nestjs/config";
import { ApiResponseDto } from "src/common/dto/api-response.dto";

@Injectable()
export class AuthService {
 
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService, 
        private config: ConfigService
    ) {}

    async requestEmailOTP(dto: RequestEmailOTPDto, context: 'signup' | 'resetPassword' = 'signup') {
        console.log(colors.cyan(`Requesting OTP for ${context}...`));
    
        try {
            // Check if user exists
            const user = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
    
            if (!user) {
                console.log(colors.red("❌ User not found"));
                throw new NotFoundException("User not found");
            }
    
            const otp = crypto.randomInt(1000, 9999).toString();
            const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry
    
            // Update OTP for the user
            await this.prisma.user.update({
                where: { email: dto.email },
                data: {
                    otp,
                    otp_expires_at: otpExpiresAt,
                },
            });
    
            // Send OTP by email
            await sendOTPByEmail(dto.email, otp);
            console.log(colors.magenta(`OTP code: ${otp} sent to user: ${dto.email}`));
    
            return {
                success: true,
                message: `OTP successfully sent to: ${dto.email}`,
            };
        } catch (error) {
            console.error("Error in requestEmailOTP:", error);
            throw new InternalServerErrorException(
                `Failed to process OTP request: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    async verifyEmailOTP(dto: VerifyEmailOTPDto) {
        console.log(colors.cyan(`Verifying email: ${dto.email} with OTP: ${dto.otp}`));
    
        try {
            // Find user with matching email and OTP
            const user = await this.prisma.user.findFirst({
                where: { email: dto.email, otp: dto.otp },
            });
    
            // Check if user exists and OTP is valid
            if (!user || !user.otp_expires_at || new Date() > new Date(user.otp_expires_at)) {
                console.log(colors.red("Invalid or expired OTP provided"));
                throw new BadRequestException("Invalid or expired OTP provided");
            }
    
            // Update `is_email_verified` and clear OTP
            await this.prisma.user.update({
                where: { email: dto.email },
                data: {
                    is_email_verified: true,
                },
            });
    
            console.log(colors.magenta("Email address successfully verified"));
    
            return new ApiResponseDto(true, "Email verified successfully");
        } catch (error) {
            console.error("Error verifying email:", error);
    
            if (error instanceof HttpException) {
                throw error; // Re-throw known exceptions
            }
    
            throw new InternalServerErrorException("Email verification failed");
        }
    }

    async signup(dto: AuthDto): Promise<{ 
        success: boolean; 
        message: string; 
        data?: { user: any } 
    }> {
        console.log("Sign up endpoint hit...");
    
        try {
            // Check if user exists
            const existingUser = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
    
            if (existingUser) {
                console.log(colors.red(`⚠️ User already exists with email: ${dto.email}`));
                return {
                    success: false,
                    message: `User already exists with email: ${dto.email}`,
                };
            }
    
            // Create new user
            const newUser = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    first_name: dto.first_name,
                    last_name: dto.last_name,
                },
            });
    
            // Send OTP
            await this.requestEmailOTP({ email: dto.email }, 'signup');
            console.log(colors.blue("✅ OTP sent to email. Please verify your email."));
    
            // Create wallet
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
            } catch (error) {
                console.error(colors.red("Error creating wallet"), error);
                return {
                    success: false,
                    message: "Failed to create wallet",
                };
            }
    
            // Hash password
            const hash = await argon.hash(dto.password);
    
            // Update user with password
            const updatedUser = await this.prisma.user.update({
                where: { email: dto.email },
                data: {
                    password: hash,
                    hash: hash,
                },
            });
    
            // Remove sensitive data
            const { password, hash: _, ...safeUser } = updatedUser;
    
            return {
                success: true,
                message: "Enter Received Otp to verify your email",
                data: {
                    user: {
                        id: safeUser.id,
                        email: safeUser.email,
                        name: `${safeUser.first_name} ${safeUser.last_name}`,
                    },
                },
            };
        } catch (error) {
            console.error("Signup error:", error);
    
            if (error.code === "P2002") {
                throw new ConflictException("Email already exists");
            }
    
            throw new InternalServerErrorException("Registration failed. Please try again.");
        }
    }

    async signToken(
        userId: string,
        email: string,
    ): Promise<string> {
        const payload = {
            sub: userId,
            email
        }

        const secret = this.config.get('JWT_SECRET')
        const expiration_time = this.config.get('JWT_EXPIRES_IN') || '7d'

        return this.jwt.signAsync(payload, {
            expiresIn: expiration_time,
            secret: secret
        })
    }

    async signin(dto: SignInDto) {
        console.log(colors.cyan("Signing in user..."));
    
        try {
            // 1. Find user
            const user = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
    
            if (!user) {
                throw new UnauthorizedException('Invalid credentials');
            }
    
            // 2. Check email verification
            if (!user.is_email_verified) {
                throw new ForbiddenException('Please verify your email first');
            }
    
            // 3. Verify password
            const isPasswordValid = user.password && await argon.verify(user.password, dto.password);
            if (!isPasswordValid) {
                throw new UnauthorizedException('Invalid credentials');
            }
    
            // 4. Generate access token
            const access_token = await this.signToken(user.id, user.email);
    
            // 5. Format user data for response
            const formattedUser = {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
            };
    
            // 6. Prepare response data
            const responseData = {
                access_token: access_token,
                refresh_token: null, // Placeholder for refresh token if implemented
                user: formattedUser,
            };
    
            console.log(colors.magenta("User signed in successfully"));
            return new ApiResponseDto(true, "Welcome back", responseData);
        } catch (error) {
            console.error(colors.red("Error during sign-in:"), error);
    
            if (error instanceof HttpException) {
                throw error; // Re-throw known exceptions
            }
    
            throw new InternalServerErrorException("Sign-in failed. Please try again.");
        }
    }

    async resetPassword(dto: ResetPasswordDto): Promise<ApiResponseDto<null>> {
        console.log(colors.cyan("Resetting password for user..."));
    
        try {
            // 1. Find user
            const user = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
    
            if (!user) {
                console.log(colors.red("❌ User not found"));
                throw new NotFoundException("User not found");
            }
    
            // 2. Verify OTP (optional but recommended for security)
            if (dto.otp) {
                await this.verifyEmailOTP({ email: dto.email, otp: dto.otp });
            }
    
            // 3. Hash new password with Argon2
            const hashedPassword = await argon.hash(dto.new_password);
    
            // 4. Update password and clear existing sessions
            await this.prisma.$transaction([
                this.prisma.user.update({
                    where: { email: dto.email },
                    data: {
                        password: hashedPassword,
                        hash: hashedPassword,
                    },
                }),
                this.prisma.refreshToken.deleteMany({
                    where: { userId: user.id },
                }),
            ]);
    
            console.log(colors.green("✅ Password reset successfully"));
    
            return new ApiResponseDto(true, "Password reset successfully");
        } catch (error) {
            console.error(colors.red("🔴 Password reset error:"), error);
    
            if (error instanceof HttpException) {
                throw error; // Re-throw known exceptions
            }
    
            throw new InternalServerErrorException("Password reset failed");
        }
    }
}


import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
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
import { formatDate } from "src/common/helper_functions/formatter";
import { generateSmipayTag } from "src/common/helper_functions/generators";

@Injectable()
export class AuthService {
 
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService, 
        private config: ConfigService,
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

    async signup(
        dto: AuthDto
    ): Promise<{
        success: boolean;
        message: string;
        data?: { user: any };
    }> {
        console.log(colors.cyan("Sign up endpoint hit..."));
        console.log(colors.yellow("Received data:"), JSON.stringify(dto, null, 2));

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

            // Hash password
            const hash = await argon.hash(dto.password);
            console.log(colors.green("Password hashed successfully"));

            const genderValue = dto.gender.toLowerCase();

            // Generate unique Smipay tag
            const smipayTag = await generateSmipayTag(this.prisma);
            console.log(colors.green(`Smipay tag generated: ${smipayTag}`));

            // Create new user
            const newUser = await this.prisma.user.create({
                data: {
                email: dto.email,
                smipay_tag: smipayTag,
                password: hash,       // Store hashed password
                hash: hash,           // Optional: if you're using this for token validation
            
                first_name: dto.firstName,
                last_name: dto.lastName,
                middle_name: dto.middleName || null,
            
                gender: genderValue as Gender,
                phone_number: dto.phone,
                referral_code: dto.referral || null,
                address: {
                    create: {
                        country: dto.country,
                    }
                },
            
                agree_to_terms: dto.agreeToTerms,
                updates_opt_in: dto.updatesOptIn ?? false,  // default to false if undefined
                },
            });
            console.log(colors.green("User created successfully"));

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
                console.log(colors.green("Wallet created successfully"));
            } catch (error) {
                console.error(colors.red("Error creating wallet"), error);
                return {
                    success: false,
                    message: "Failed to create wallet",
                };
            }

            return {
                success: true,
                message: "Enter Received Otp to verify your email",
                data: {
                    user: {
                        id: newUser.id,
                        email: newUser.email,
                        name: `${newUser.first_name} ${newUser.last_name}`,
                        first_name: newUser.first_name,
                        last_name: newUser.last_name,
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
                include: {
                    profile_image: true,
                    kyc_verification: true,
                }
            });
    
            if (!user) {
                throw new UnauthorizedException('Invalid credentials');
            }
    
            // 2. Check email verification
            // if (!user.is_email_verified) {
            //     throw new ForbiddenException('Please verify your email first');
            // }
    
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
                first_name: user.first_name,
                last_name: user.last_name,
                phone_number: user.phone_number || null,
                is_email_verified: user.is_email_verified,
                role: user.role || null,
                gender: user.gender || null,
                data_of_birth: user.date_of_birth || null,
                profile_image: user.profile_image?.secure_url || null,
                kyc_verified: user.kyc_verification?.is_verified || false,
                created_at: formatDate(user.createdAt),
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

    async getFourDigitPin(userPayload: any) {
        console.log(colors.cyan("Retrieving four-digit PIN..."));

        try {
            // Fetch the user's PIN from the database
            const user = await this.prisma.user.findUnique({
                where: { id: userPayload.sub },
            });

            if (!user || !user.fourDigitPin) {
                console.log(colors.red("Four-digit PIN not found"));
                throw new NotFoundException("Four-digit PIN not found for the user.");
            }

            console.log(colors.magenta("Four-digit PIN retrieved successfully."));
            return new ApiResponseDto(true, "Four-digit PIN retrieved successfully.", {
                pin: user.fourDigitPin,
            });
        } catch (error) {
            console.error(colors.red(`Error retrieving four-digit PIN: ${error.message}`));
            throw new HttpException(
                error.response?.data?.message || "Error retrieving four-digit PIN.",
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}


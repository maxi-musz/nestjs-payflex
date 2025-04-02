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

@Injectable()
export class AuthService {
 
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService, 
    ) {}

    async requestEmailOTP(dto: RequestEmailOTPDto) {
        console.log(colors.cyan("Requesting OTP to verify email..."));
    
        try {
            const user = await this.prisma.user.findUnique({ 
                where: { 
                    email: dto.email
                } 
            });
    
            // if (user && user.is_email_verified) {
            //     console.log(`User with email: ${dto.email} already verified`);
            //     throw new Error(`User with email: ${dto.email} already exists`);
            // }
    
            const otp = crypto.randomInt(1000, 9999).toString();
            const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry
    
            if (!user) {
                // Create new user with OTP
                await this.prisma.user.create({
                    data: {
                        email: dto.email,
                        otp,
                        otp_expires_at: otpExpiresAt,
                        is_email_verified: false
                    },
                });
            } else {
                // Update OTP for existing user
                await this.prisma.user.update({
                    where: { email: dto.email },
                    data: { otp, otp_expires_at: otpExpiresAt },
                });
            }
    
            // Send OTP by email
            await sendOTPByEmail(dto.email, otp);
            console.log(colors.magenta(`OTP code: ${otp} sent to user: ${dto.email}`));

            return {
                success: true,
                message: `OTP successfully sent to: ${dto.email}`
            }
    
        } catch (error) {
            console.error("Error in requestEmailOTP:", error);
            throw new Error(`Failed to process OTP request: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async verifyEmailOTP(dto: VerifyEmailOTPDto) {
        console.log(colors.cyan(`Verifying email: ${dto.email} with OTP: ${dto.otp}`))

        try {
            const user = await this.prisma.user.findFirst({ 
                where: { email:dto.email, otp: dto.otp } 
            });

            if (!user || !user.otp_expires_at || new Date() > new Date(user.otp_expires_at)) {
                console.log(colors.red("Invalid or expired OTP rovided"))
                return { success: false, message: "Invalid or expired code provided"};
            }

            // Update `is_email_verified` and clear OTP
            await this.prisma.user.update({
                where: { email: dto.email },
                data: { 
                is_email_verified: true, 
                otp: null, 
                }
            });

            console.log(colors.magenta("Email address successfully verified"));

            return { 
                success: true, 
                message: "Email verified successfully"
             };

        } catch (error) {
            console.error("Error verifying email:", error);
            throw new Error("Email verification failed.");
        }
    }

    async signup(dto: AuthDto): Promise<{ 
        success: boolean; 
        message: string; 
        data?: { user: any } 
    }> {
        console.log("Sign up endpoint hit...");
    
        try {
            // 1. Verify password match
            if (dto.password !== dto.confirm_password) {
                throw new BadRequestException('Passwords do not match');
            }
    
            // 2. Check if user exists and is verified
            const existingUser = await this.prisma.user.findUnique({ 
                where: { email: dto.email } 
            });
            
            if (!existingUser) {
                console.log(colors.red(`⚠️ Email not registered. Verify your email first.`));
                return { 
                    success: false, 
                    message: "Email not registered. Verify your email first." 
                };
            }
    
            if (!existingUser.is_email_verified) {
                console.log(colors.red(`⚠️ Email: ${dto.email} not verified`));
                return { 
                    success: false, 
                    message: "Email verification failed. Retry verification." 
                };
            }
    
            console.log(colors.blue("✅ Email verified. Proceeding with registration."));
    
            // 3. Generate password hash
            const hash = await argon.hash(dto.password);
    
            // 4. Update user with additional details
            const updatedUser = await this.prisma.user.update({
                where: { email: dto.email },
                data: {
                    password: hash,
                    hash: hash,
                    first_name: dto.first_name,
                    last_name: dto.last_name,
                    phone_number: dto.phone_number,
                    gender: dto.gender as Gender,
                    date_of_birth: new Date(dto.date_of_birth),
                    address: {
                        create: {
                            country: dto.address.country,
                            state: dto.address.state,
                            city: dto.address.city,
                            home_address: dto.address.home_address
                        }
                    }
                },
                include: {
                    address: true
                }
            });

            // const newAccount = await this.prisma.account.create({
            //     data: {
            //         user_id: updatedUser.id,
            //         account_number: this.generateAccountNumber(), // Implement this function
            //         accountType: 'ngn', // or whatever your default account type is
            //         bank_name: 'Virtual Bank',
            //         bank_code: '999', // Use appropriate bank code
            //         balance: 0,
            //         currency: 'ngn',
            //         isActive: true
            //     }
            // });
    
            // 5. Remove sensitive data before returning
            const { password, hash: _, ...safeUser } = updatedUser;
    
            return {
                success: true,
                message: "User registered successfully",
                data: {
                    user: {
                        id: safeUser.id,
                        email: safeUser.email,
                        name: `${safeUser.first_name} ${safeUser.last_name}`,
                        address: safeUser.address
                    }
                }
            };
    
        } catch (error) {
            console.error('Signup error:', error);
            
            if (error.code === 'P2002') {
                throw new ConflictException('Email already exists');
            }
            
            // Handle Prisma errors or other exceptions
            throw new InternalServerErrorException('Registration failed. Please try again.');
        }
    }

    async signin(
        dto: SignInDto
      ): Promise<{
        success: boolean;
        message: string;
        accessToken?: string;
        data?: any;
      }> {
        console.log(colors.cyan("Sign in endpoint hit..."));
      
        try {
          // 1. Find user with address
          const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { address: true, refreshToken: true },
          });
      
          if (!user) {
            console.log(colors.red(`⚠️ User not found: ${dto.email}`));
            throw new UnauthorizedException('Invalid credentials');
          }
      
          // 2. Check email verification
          if (!user.is_email_verified) {
            console.log(colors.yellow(`⚠️ Unverified email: ${dto.email}`));
            throw new ForbiddenException('Please verify your email first');
          }
      
          // 3. Validate password
          if (!user.password) {
            console.log(colors.red('⚠️ No password set for user'));
            throw new UnauthorizedException('Invalid credentials');
          }
      
          const passwordValid = await argon.verify(user.password, dto.password);
          if (!passwordValid) {
            console.log(colors.red('⚠️ Invalid password'));
            throw new UnauthorizedException('Invalid credentials');
          }
      
          // 4. Generate tokens using your custom function
          const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
      
          // 5. Refresh token management
          await this.prisma.$transaction([
            // Delete all existing refresh tokens
            this.prisma.refreshToken.deleteMany({
              where: { userId: user.id }
            }),
            // Create new refresh token
            this.prisma.refreshToken.create({
              data: {
                token: newRefreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 
                  (Number(process.env.USER_REFRESH_TOKEN_EXPIRATION_TIME) || 86400) * 1000)
              }
            })
          ]);
      
          console.log(colors.green('✅ Authentication tokens issued'));
      
          // 6. Prepare safe user data
          const { password, hash, refreshToken, ...safeUser } = user;
      
          // 7. Return response
          return {
            success: true,
            message: 'Login successful',
            accessToken, // Only return accessToken in response body
            data: {
              id: safeUser.id,
              email: safeUser.email,
              name: `${safeUser.first_name} ${safeUser.last_name}`,
              phone_number: safeUser.phone_number,
              address: safeUser.address,
              role: safeUser.role
            }
          };
      
        } catch (error) {
          console.error(colors.red('🔴 Signin error:'), error);
          
          if (error instanceof HttpException) {
            throw error;
          }
          throw new InternalServerErrorException('Authentication failed');
        }
    }

    async resetPassword(dto: ResetPasswordDto): Promise<{ 
        success: boolean; 
        message: string; 
    }> {
        console.log(colors.cyan("Resetting password for user..."));
    
        try {
            // 1. Find user
            const user = await this.prisma.user.findUnique({ 
                where: { email: dto.email } 
            });
    
            if (!user) {
                console.log(colors.red("❌ User not found"));
                throw new NotFoundException("User not found");
            }
    
            // 3. Hash new password with Argon2
            const hashedPassword = await argon.hash(dto.new_password);
    
            // 4. Update password and clear existing sessions
            await this.prisma.$transaction([
                this.prisma.user.update({
                    where: { email: dto.email },
                    data: { 
                        password: hashedPassword,
                        hash: hashedPassword 
                    },
                }),
                this.prisma.refreshToken.deleteMany({
                    where: { userId: user.id }
                })
            ]);
    
            console.log(colors.green("✅ Password reset successfully"));
            
            return {
                success: true, 
                message: "Password reset successfully"
            };
    
        } catch (error) {
            console.error(colors.red("🔴 Password reset error:"), error);
            
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException("Password reset failed");
        }
    }
}


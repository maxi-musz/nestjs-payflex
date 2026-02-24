import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NewAuthController } from './new-auth.controller';
import { NewAuthService } from './new-auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../common/mailer/email.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    ReferralModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NewAuthController],
  providers: [NewAuthService, JwtStrategy],
  exports: [NewAuthService, JwtModule],
})
export class NewAuthModule {}

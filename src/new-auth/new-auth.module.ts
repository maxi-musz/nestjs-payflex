import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NewAuthController } from './new-auth.controller';
import { NewAuthService } from './new-auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../common/mailer/email.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
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
  providers: [NewAuthService],
  exports: [NewAuthService],
})
export class NewAuthModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { SupportGateway } from './gateway/support.gateway';
import { EmailModule } from 'src/common/mailer/email.module';

@Module({
  imports: [
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SupportService, SupportGateway],
  controllers: [SupportController],
  exports: [SupportService, SupportGateway],
})
export class SupportModule {}

import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./strategy";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RegistrationService } from "./registration.service";
import { LoginService } from "./login.service";
import { RegistrationRateLimiter } from "./helpers/rate-limiter";
import { OtpService } from "./helpers/otp.service";
import { ReferralValidator } from "./helpers/referral.validator";
import { SecurityEventService } from "./helpers/security-event.service";
import { DeviceTrackerService } from "./helpers/device-tracker.service";
import { CommonModule } from "src/common/common.module";
import { EmailModule } from "src/common/mailer/email.module";
import { SmsProviderFactory } from "./helpers/sms-providers/sms-provider.factory";
import { TermiiProvider } from "./helpers/sms-providers/termii.provider";
import { BulkSmsProvider } from "./helpers/sms-providers/bulksms.provider";
import { KycService } from "./helpers/kyc.service";
import { KycProviderFactory } from "./helpers/kyc-providers/kyc-provider.factory";
import { NoneProvider } from "./helpers/kyc-providers/none.provider";
import { DojahProvider } from "./helpers/kyc-providers/dojah.provider";
import { SmileIdProvider } from "./helpers/kyc-providers/smileid.provider";

@Module({
    imports: [
        JwtModule.register({
            global: true
        }),
        CommonModule,
        EmailModule,
    ],
    providers: [
        AuthService, 
        JwtStrategy,
        RegistrationService,
        LoginService,
        RegistrationRateLimiter,
        OtpService,
        ReferralValidator,
        SecurityEventService,
        DeviceTrackerService,
        SmsProviderFactory,
        TermiiProvider,
        BulkSmsProvider,
        KycService,
        KycProviderFactory,
        NoneProvider,
        DojahProvider,
        SmileIdProvider,
    ],
    controllers: [AuthController],
    exports: [RegistrationService],
})
export class AuthModule {}
  
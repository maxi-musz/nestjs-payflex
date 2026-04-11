# Email Provider System

This email provider system allows you to easily switch between different email services (Gmail SMTP, SendGrid, etc.) just like the SMS provider system.

## 🎯 How It Works

The system uses a **factory pattern** similar to the SMS provider system:
- **EmailProviderFactory**: Creates the appropriate provider based on configuration
- **IEmailProvider**: Interface that all providers must implement
- **EmailService**: Service that uses the configured provider to send emails

## 📦 Available Providers

### 1. Gmail SMTP (Default)
- **Provider Name**: `gmail` or `gmail-smtp`
- **Status**: ✅ Fully implemented
- **Setup Required**:
  ```env
  EMAIL_PROVIDER=gmail
  EMAIL_USER=your-email@gmail.com
  EMAIL_PASSWORD=your-app-password
  GOOGLE_SMTP_HOST=smtp.gmail.com
  GOOGLE_SMTP_PORT=587
  ```

### 2. SendGrid
- **Provider Name**: `sendgrid`
- **Status**: ⚠️ Placeholder (ready for implementation)
- **Setup Required**:
  ```env
  EMAIL_PROVIDER=sendgrid
  SENDGRID_API_KEY=your-sendgrid-api-key
  SENDGRID_FROM_EMAIL=your-verified-email@domain.com
  SENDGRID_FROM_NAME=SmiPay
  ```
- **To Implement**: Install `@sendgrid/mail` and uncomment the implementation in `sendgrid.provider.ts`

### 3. Resend
- **Provider Name**: `resend`
- **Status**: ✅ Fully implemented
- **Setup Required**:
  ```env
  EMAIL_PROVIDER=resend
  RESEND_API_KEY=re_your_api_key
  RESEND_FROM_EMAIL=onboarding@resend.dev
  RESEND_FROM_NAME=SmiPay
  ```
- **Note**: Get your API key from [Resend Dashboard](https://resend.com/api-keys). For production, verify your domain and use an email from that domain (e.g. `noreply@yourdomain.com`). For testing you can use `onboarding@resend.dev`.

## 🔄 Switching Providers

To switch email providers, simply change the `EMAIL_PROVIDER` environment variable:

```env
# Use Gmail SMTP (default)
EMAIL_PROVIDER=gmail

# Use SendGrid
EMAIL_PROVIDER=sendgrid

# Use Resend
EMAIL_PROVIDER=resend
```

No code changes needed! The factory automatically selects the correct provider.

## 💻 Usage

### Inject EmailService

```typescript
import { EmailService } from 'src/common/mailer/email.service';

@Injectable()
export class YourService {
  constructor(private emailService: EmailService) {}

  async sendEmail() {
    // Send OTP email
    await this.emailService.sendOTPEmail('user@example.com', '123456');

    // Send deposit notification
    await this.emailService.sendDepositNotificationEmail(
      'user@example.com',
      'John Doe',
      5000,
      15000,
      'ref-123',
      '1234567890',
      'Access Bank',
      '2025-01-15',
    );

    // Send cable purchase success
    await this.emailService.sendCablePurchaseSuccessEmail(
      'user@example.com',
      'John Doe',
      'DSTV',
      '1234567890',
      5000,
      'ref-123',
      '2025-01-15',
      'Premium',
    );

    // Send custom email
    await this.emailService.sendEmail(
      'user@example.com',
      'Custom Subject',
      '<html>Custom HTML content</html>',
      'Custom Sender Name',
      'sender@example.com',
    );
  }
}
```

### Import EmailModule

Make sure to import `EmailModule` in your module:

```typescript
import { EmailModule } from 'src/common/mailer/email.module';

@Module({
  imports: [EmailModule],
  // ...
})
export class YourModule {}
```

## 🆕 Adding a New Provider

1. **Create Provider Class**:
   ```typescript
   // src/common/mailer/email-providers/your-provider.provider.ts
   import { Injectable } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import { IEmailProvider } from './email-provider.interface';

   @Injectable()
   export class YourProvider implements IEmailProvider {
     constructor(private configService: ConfigService) {}

     getProviderName(): string {
       return 'Your Provider';
     }

     async sendEmail(
       to: string,
       subject: string,
       htmlContent: string,
       fromName?: string,
       fromEmail?: string,
     ): Promise<void> {
       // Implement your email sending logic
     }
   }
   ```

2. **Register in Factory**:
   ```typescript
   // src/common/mailer/email-providers/email-provider.factory.ts
   import { YourProvider } from './your-provider.provider';

   getProvider(): IEmailProvider {
     // ...
     case 'your-provider':
       return new YourProvider(this.configService);
     // ...
   }
   ```

3. **Add to EmailModule**:
   ```typescript
   // src/common/mailer/email.module.ts
   import { YourProvider } from './email-providers/your-provider.provider';

   @Module({
     providers: [
       // ...
       YourProvider,
     ],
   })
   ```

## 📝 Environment Variables

### Gmail SMTP
```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
GOOGLE_SMTP_HOST=smtp.gmail.com
GOOGLE_SMTP_PORT=587
```

### SendGrid
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=your-verified-email@domain.com
SENDGRID_FROM_NAME=SmiPay
```

### Resend
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=SmiPay
```

## 🔍 Current Provider

Check which provider is currently active:

```typescript
const providerName = this.emailService.getCurrentProvider();
console.log(`Using email provider: ${providerName}`);
```

## 📚 Related Files

- `email.service.ts` - Main email service
- `email-provider.interface.ts` - Provider interface
- `email-provider.factory.ts` - Provider factory
- `gmail-smtp.provider.ts` - Gmail SMTP implementation
- `sendgrid.provider.ts` - SendGrid implementation (placeholder)
- `resend.provider.ts` - Resend implementation

## 🎨 Similar to SMS Provider System

This email provider system follows the same pattern as the SMS provider system:
- ✅ Factory pattern for easy switching
- ✅ Interface-based design
- ✅ Environment variable configuration
- ✅ No code changes needed to switch providers


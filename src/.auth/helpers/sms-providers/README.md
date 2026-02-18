# SMS Provider Configuration

This module supports multiple SMS providers with easy switching via environment variables.

## 🚀 Quick Setup

### 1. Choose Your Provider

Add to `.env`:
```env
# Choose provider: "termii" (recommended) or "bulksms"
SMS_PROVIDER=termii
```

### 2. Configure Provider Credentials

#### For Termii (Recommended - Fastest)
```env
SMS_PROVIDER=termii
TERMII_LIVE_API_KEY=your_api_key_here
TERMII_BASE_URL=https://v3.api.termii.com
TERMII_SENDER_ID=SmiPay
TERMII_CHANNEL=dnd  # Use "dnd" for OTP (bypasses DND, faster delivery)
```

**Why Termii?**
- ⚡ Fastest delivery (1-3 seconds)
- ✅ Reliable (99.9% uptime)
- ✅ DND route support (delivers to all numbers)
- ✅ Pre-approved templates
- ✅ Good documentation

#### For BulkSMS (Legacy)
```env
SMS_PROVIDER=bulksms
BULKSMSTOKEN=your_token_here
```

---

## 📋 Environment Variables

### Required for Termii:
- `TERMII_LIVE_API_KEY` - Your Termii API key
- `TERMII_SENDER_ID` - Your sender ID (e.g., "SmiPay")
- `TERMII_CHANNEL` - "dnd" (recommended) or "generic"

### Optional for Termii:
- `TERMII_BASE_URL` - Default: `https://v3.api.termii.com`

### Required for BulkSMS:
- `BULKSMSTOKEN` - Your BulkSMS API token

---

## 🔄 Switching Providers

### Method 1: Environment Variable (Recommended)
```env
SMS_PROVIDER=termii  # or "bulksms"
```

### Method 2: Programmatically (for testing)
```typescript
// In your service
this.otpService.switchProvider('termii');
```

---

## 📝 Adding a New Provider

1. **Create provider class:**
```typescript
// src/auth/helpers/sms-providers/newprovider.provider.ts
import { Injectable } from '@nestjs/common';
import { ISmsProvider } from './sms-provider.interface';

@Injectable()
export class NewProvider implements ISmsProvider {
  getProviderName(): string {
    return 'NewProvider';
  }

  async sendSms(phoneNumber: string, message: string, otp?: string): Promise<void> {
    // Your implementation
  }
}
```

2. **Add to factory:**
```typescript
// In sms-provider.factory.ts
case 'newprovider':
  return new NewProvider(this.configService);
```

3. **Register in module:**
```typescript
// In auth.module.ts
providers: [
  // ... other providers
  NewProvider,
]
```

---

## 🎯 Provider Comparison

| Provider | Speed | Reliability | DND Support | Cost/SMS |
|----------|-------|-------------|-------------|----------|
| **Termii** | ⚡⚡⚡⚡⚡ | 99.9% | ✅ Yes | ₦2-3 |
| **BulkSMS** | ⚡⚡ | 95% | ❌ No | ₦2-3 |

---

## 🔍 Testing

### Check Current Provider
```typescript
const provider = this.otpService.getCurrentProvider();
console.log(`Using provider: ${provider}`);
```

### Test OTP Sending
```typescript
await this.otpService.sendOTP('+2348012345678', '123456');
```

---

## 📚 Provider Documentation

- **Termii:** https://developer.termii.com/
- **BulkSMS:** https://www.bulksmsnigeria.com/docs/

---

## ⚠️ Important Notes

### Termii Channel Selection:
- **`dnd`** - Recommended for OTP
  - ✅ Bypasses DND restrictions
  - ✅ Delivers 24/7 (no time restrictions)
  - ✅ Faster delivery
  - ⚠️ Requires DND route activation (contact Termii support)

- **`generic`** - Alternative
  - ❌ Won't deliver to DND numbers
  - ❌ Time restrictions for MTN (8PM-8AM)
  - ✅ No activation needed

**Recommendation:** Use `dnd` channel and activate DND route with Termii support.

---

## 🐛 Troubleshooting

### Provider Not Found
- Check `SMS_PROVIDER` env variable is set correctly
- Defaults to "termii" if not set

### API Key Errors
- Verify API key is correct in `.env`
- Check API key has sufficient balance
- Ensure API key has SMS sending permissions

### Delivery Issues
- Check phone number format (must be E.164: +234XXXXXXXXXX)
- Verify sender ID is approved
- Check provider logs for detailed errors


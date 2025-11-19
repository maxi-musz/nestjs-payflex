# KYC Provider Configuration

This module supports multiple KYC verification providers with easy switching via environment variables.

## 🚀 Quick Setup

### 1. Choose Your Provider

Add to `.env`:
```env
# Choose provider: "none" (testing), "dojah" (recommended), or "smileid" (coming soon)
KYC_PROVIDER=none
```

### 2. Configure Provider Credentials

#### For None Provider (Testing/Development)
```env
KYC_PROVIDER=none
```
- Returns fake verification data
- Special test case: NIN/BVN `1111111111` (10 ones) returns `verified: true`
- All other NINs/BVNs return `verified: false` (pending status)
- Use for development/testing without real API calls

#### For Dojah (Recommended)
```env
KYC_PROVIDER=dojah
DOJAH_APP_ID=your_app_id_here
DOJAH_SECRET_KEY=your_secret_key_here
DOJAH_BASE_URL=https://api.dojah.io  # Optional, defaults to this
```

**Dojah Features:**
- ✅ NIN verification
- ✅ BVN verification
- ✅ Fast and reliable
- ✅ Good documentation

**Test Credentials (Sandbox):**
- Test NIN: `70123456789`

#### For SmileID (Coming Soon)
```env
KYC_PROVIDER=smileid
SMILEID_API_KEY=your_api_key_here
SMILEID_PARTNER_ID=your_partner_id_here
SMILEID_BASE_URL=https://api.smileidentity.com  # Optional
```

**Note:** SmileID provider is not yet implemented. It's a placeholder for future integration.

---

## 📋 Environment Variables

### Required for Dojah:
- `DOJAH_APP_ID` - Your Dojah App ID (from dashboard)
- `DOJAH_SECRET_KEY` - Your Dojah Secret Key (for Authorization header)

### Optional for Dojah:
- `DOJAH_BASE_URL` - Default: `https://api.dojah.io`

### Required for SmileID (when implemented):
- `SMILEID_API_KEY` - Your SmileID API key
- `SMILEID_PARTNER_ID` - Your SmileID Partner ID

### Optional for SmileID:
- `SMILEID_BASE_URL` - Default: `https://api.smileidentity.com`

---

## 🔄 Switching Providers

### Method 1: Environment Variable (Recommended)
```env
KYC_PROVIDER=dojah  # or "none" or "smileid"
```

### Method 2: The provider is automatically selected based on `KYC_PROVIDER` env variable

---

## 📝 Usage in Registration Service

The KYC service is automatically injected into `RegistrationService`:

```typescript
// In submitIdInformation method
if (idType === 'NIN') {
  verificationResult = await this.kycService.verifyNIN(formattedIdNumber);
} else if (idType === 'BVN') {
  verificationResult = await this.kycService.verifyBVN(formattedIdNumber);
}
```

---

## 🔍 Verification Result Structure

```typescript
interface KycVerificationResult {
  success: boolean;        // Whether the API call succeeded
  verified: boolean;       // Whether the ID was verified
  data?: {                // Extracted user data
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    date_of_birth?: string;
    gender?: string;
    phone_number?: string;
    email?: string;
    photo?: string;
    // ... additional fields
  };
  error?: string;          // Error message if verification failed
  provider_response?: any; // Raw response from provider
}
```

---

## 📝 Adding a New Provider

1. **Create provider class:**
```typescript
// src/auth/helpers/kyc-providers/newprovider.provider.ts
import { Injectable } from '@nestjs/common';
import { IKycProvider, KycVerificationResult } from './kyc-provider.interface';

@Injectable()
export class NewProvider implements IKycProvider {
  getProviderName(): string {
    return 'NewProvider';
  }

  async verifyNIN(nin: string): Promise<KycVerificationResult> {
    // Your implementation
  }

  async verifyBVN(bvn: string): Promise<KycVerificationResult> {
    // Your implementation
  }
}
```

2. **Add to factory:**
```typescript
// In kyc-provider.factory.ts
import { NewProvider } from './newprovider.provider';

case 'newprovider':
  return new NewProvider(this.configService);
```

3. **Register in auth.module.ts:**
```typescript
import { NewProvider } from "./helpers/kyc-providers/newprovider.provider";

providers: [
  // ... other providers
  NewProvider,
],
```

---

## 🧪 Testing

### Using None Provider (Recommended for Development)
```env
KYC_PROVIDER=none
```

This will:
- Return fake verification data
- Return `verified: true` if NIN/BVN is `1111111111` (10 ones)
- Return `verified: false` (pending status) for all other values
- Allow you to test both verified and pending flows without API calls

### Using Dojah Sandbox
```env
KYC_PROVIDER=dojah
DOJAH_APP_ID=your_sandbox_app_id
DOJAH_SECRET_KEY=your_sandbox_secret_key
```

Use test NIN: `70123456789`

---

## 📚 API Documentation

### Dojah
- [Dojah API Documentation](https://dojah.io/docs)
- NIN Lookup: `GET /api/v1/kyc/nin?nin={nin}`
- NIN Advance: `GET /api/v1/kyc/nin/advance?nin={nin}`

### SmileID
- [SmileID Documentation](https://docs.smileidentity.com)
- Coming soon...

---

## ⚠️ Important Notes

1. **None Provider**: Always returns `verified: false` for testing. In production, use a real provider.

2. **Error Handling**: All providers handle errors gracefully and return structured error responses.

3. **Data Privacy**: Sensitive data (NIN, BVN) is masked in logs (e.g., `123***789`).

4. **Verification Status**: 
   - `verified`: ID was successfully verified
   - `pending`: Verification in progress (e.g., "none" provider)
   - `failed`: Verification failed (invalid ID, API error, etc.)


# DVA (Dedicated Virtual Account) Providers

This module provides a provider pattern for assigning Dedicated Virtual Accounts (DVAs) to users. It supports multiple providers and can be easily extended.

## Available Providers

### 1. Paystack (Recommended - Fully Implemented)
- **Provider Name:** `paystack`
- **Status:** ✅ Fully implemented
- **Features:**
  - Automatic customer creation/retrieval
  - DVA assignment via Paystack API
  - Support for multiple banks (wema-bank, paystack-titan)
  - Automatic account storage in database

### 2. Wema Bank (Placeholder)
- **Provider Name:** `wema`
- **Status:** ⚠️ Not yet implemented
- **Features:** To be implemented based on Wema Bank API documentation

## Configuration

### Environment Variables

Set `DVA_PROVIDER` in your `.env` file:

```env
# Use Paystack (default)
DVA_PROVIDER=paystack

# Or use Wema (when implemented)
DVA_PROVIDER=wema
```

### Paystack Configuration

For Paystack provider, you need:

```env
# Development
PAYSTACK_TEST_SECRET_KEY=sk_test_xxxxx

# Production
PAYSTACK_LIVE_SECRET_KEY=sk_live_xxxxx
```

### Wema Configuration (When Implemented)

```env
WEMA_API_KEY=your_wema_api_key
WEMA_API_URL=https://api.wemabank.com
```

## Usage

### Auto-Assignment (Recommended)

The DVA is automatically assigned when a user fetches their homepage data if they don't already have one:

```typescript
// In UserService.fetchUserWalletAndLatestTransaction()
// Automatically checks and assigns DVA if missing
```

### Manual Assignment

You can also manually assign a DVA using the provider:

```typescript
import { DvaProviderFactory } from 'src/banking/dva-providers/dva-provider.factory';

// Get the configured provider
const dvaProvider = dvaProviderFactory.getProvider();

// Assign DVA
const result = await dvaProvider.assignDva(
  userId,
  userEmail,
  {
    phone_number: '+2341234567890',
    preferred_bank: 'wema-bank', // Optional
    country: 'NG', // Optional
  }
);
```

## Provider Interface

All DVA providers must implement the `IDvaProvider` interface:

```typescript
interface IDvaProvider {
  assignDva(
    userId: string,
    userEmail: string,
    options?: DvaAssignmentOptions,
  ): Promise<DvaAssignmentResult>;

  getProviderName(): string;
}
```

## Adding a New Provider

1. Create a new provider class implementing `IDvaProvider`:

```typescript
@Injectable()
export class NewBankDvaProvider implements IDvaProvider {
  getProviderName(): string {
    return 'NewBank';
  }

  async assignDva(
    userId: string,
    userEmail: string,
    options?: DvaAssignmentOptions,
  ): Promise<DvaAssignmentResult> {
    // Implementation
  }
}
```

2. Add it to the factory:

```typescript
// In dva-provider.factory.ts
case 'newbank':
  return new NewBankDvaProvider(this.configService, this.prisma);
```

3. Update the available providers list:

```typescript
getAvailableProviders(): string[] {
  return ['paystack', 'wema', 'newbank'];
}
```

## Response Format

All providers return a `DvaAssignmentResult`:

```typescript
{
  success: boolean;
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_slug?: string;
  currency: string;
  provider_response?: any;
  error?: string;
}
```

## Error Handling

Providers should handle errors gracefully and throw appropriate `HttpException` instances:

- `BadRequestException` - For invalid requests
- `NotFoundException` - For missing resources
- `HttpException` - For API errors with appropriate status codes

## Notes

- The DVA is stored in the `Account` table with `meta_data.provider` indicating the provider used
- If a user already has an active DVA, the provider will return the existing account details
- Auto-assignment happens silently - if it fails, the request continues without the DVA
- The provider is determined at runtime based on `DVA_PROVIDER` environment variable


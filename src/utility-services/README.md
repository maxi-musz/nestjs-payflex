# Utility Services Module

This module provides utility services (Airtime, Data, Cable, Electricity) with a provider pattern that allows switching between different providers via environment variables.

## Structure

```
utility-services/
├── vtpass-service/          # VTpass provider implementation
├── sagecloud/               # Sagecloud provider implementation (to be implemented)
├── providers/               # Provider interfaces and factory
│   ├── utility-provider.interface.ts
│   └── utility-provider.factory.ts
└── utility-services.module.ts
```

## Provider Pattern

The module uses a factory pattern to switch between providers based on environment variables:

### Environment Variables

```env
# Airtime provider (default: vtpass)
AIRTIME_PROVIDER=vtpass|sagecloud|giftbill

# Data provider (default: vtpass)
DATA_PROVIDER=vtpass|sagecloud|giftbill

# Cable/TV provider (default: vtpass)
CABLE_PROVIDER=vtpass|sagecloud|giftbill

# Electricity provider (default: vtpass)
ELECTRICITY_PROVIDER=vtpass|sagecloud|giftbill
```

### Usage Example

```typescript
// In your service
constructor(private utilityFactory: UtilityProviderFactory) {}

async purchaseAirtime(params: PurchaseAirtimeParams) {
  const provider = this.utilityFactory.getAirtimeProvider();
  return await provider.purchaseAirtime(params);
}
```

## Adding a New Provider

1. Create a new folder under `utility-services/` (e.g., `sagecloud/`)
2. Implement the `IUtilityProvider` interface
3. Register the provider in the factory during module initialization
4. Update environment variables to use the new provider

## Current Providers

- **vtpass-service**: VTpass provider (moved from `src/vtpass`)
- **sagecloud**: Sagecloud provider (to be implemented)


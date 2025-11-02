# Logging Guide

## Overview

This project uses NestJS's built-in `Logger` class for consistent logging across all services. The Logger provides structured logging with context awareness and different log levels.

## Usage

### In Services/Controllers

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class YourService {
  private readonly logger = new Logger(YourService.name);

  someMethod() {
    this.logger.log('Info message');
    this.logger.error('Error message', error.stack);
    this.logger.warn('Warning message');
    this.logger.debug('Debug message');
    this.logger.verbose('Verbose message');
  }
}
```

## Log Levels

1. **`log()`** - General information (replaces `console.log`)
2. **`error()`** - Error messages with stack traces
3. **`warn()`** - Warning messages
4. **`debug()`** - Debug information (usually disabled in production)
5. **`verbose()`** - Verbose logging (usually disabled in production)

## Benefits Over console.log

- ✅ Context-aware: Shows which service/class logged the message
- ✅ Timestamp: Automatically includes timestamps
- ✅ Log levels: Different severity levels for filtering
- ✅ Production-ready: Can be configured for production environments
- ✅ Stack traces: Error logging includes stack traces

## Example Output

```
[Nest] 12345  - 01/01/2024, 10:00:00 AM     LOG [PaystackService] Creating/Getting Paystack customer for user: [email protected]
[Nest] 12345  - 01/01/2024, 10:00:01 AM   ERROR [PaystackService] Error creating Paystack customer: Network timeout
```

## Migration from console.log

**Before:**
```typescript
console.log(colors.cyan("Processing..."));
console.error(colors.red("Error occurred"));
```

**After:**
```typescript
this.logger.log("Processing...");
this.logger.error("Error occurred", error.stack);
```

## Current Status

✅ **Updated Services:**
- `PaystackService` - Now uses Logger
- `FlutterwaveService` - Already using Logger
- `BridgeCardService` - Already using Logger

🔄 **Services Still Using console.log:**
- Other services can be migrated following the same pattern

## Best Practices

1. **Always include context**: The logger automatically includes the service name
2. **Use appropriate log levels**: 
   - `log()` for normal operations
   - `error()` for errors with stack traces
   - `warn()` for warnings
3. **Include stack traces**: Always pass `error.stack` to `error()` calls
4. **Avoid sensitive data**: Don't log passwords, tokens, or personal information

## Custom Logger (Optional)

A custom logger service has been created at `src/common/logger/logger.service.ts` that uses colors. This is optional and can be used if you want colored output in development while keeping structured logging.


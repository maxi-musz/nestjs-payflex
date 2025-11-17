# Security Guards Usage Guide

## 🛡️ Available Guards

### 1. **SecurityHeadersGuard**
Validates required security headers for protected endpoints.

**Required Headers:**
- `X-Timestamp` - Request timestamp (must be within 5 minutes)
- `X-Nonce` - Unique request identifier (min 10 chars)
- `X-Signature` - HMAC signature (min 32 chars)
- `X-Request-ID` - Request tracking ID
- `X-Device-ID` - Device identifier
- `X-Device-Fingerprint` - Device fingerprint

### 2. **RateLimitGuard**
Applies rate limiting based on phone number, IP address, and device ID.

**Configuration:**
- Uses `@RateLimit()` decorator for per-endpoint configuration
- Defaults: 3/hour (phone), 10/hour (IP), 5/hour (device)

---

## 📝 Usage Examples

### **Basic Usage - Security Headers Only**

```typescript
@Post('register/verify-otp')
@UseGuards(SecurityHeadersGuard)
async verifyOTP(@Body() dto: VerifyOtpDto) {
  // Security headers validated automatically
  return this.service.verifyOTP(dto);
}
```

### **Security Headers + Rate Limiting**

```typescript
@Post('register/start')
@UseGuards(SecurityHeadersGuard, RateLimitGuard)
@RateLimit({ phoneLimit: 3, ipLimit: 10, deviceLimit: 5 })
async startRegistration(@Body() dto: StartRegistrationDto) {
  // Both guards applied automatically
  return this.service.register(dto);
}
```

### **Rate Limiting Only (No Security Headers)**

```typescript
@Post('signin')
@UseGuards(RateLimitGuard)
@RateLimit({ ipLimit: 20, deviceLimit: 10 })
async signin(@Body() dto: SignInDto) {
  // Only rate limiting applied
  return this.service.signin(dto);
}
```

### **Custom Rate Limits Per Endpoint**

```typescript
// Strict limits for registration
@Post('register/start')
@UseGuards(SecurityHeadersGuard, RateLimitGuard)
@RateLimit({ phoneLimit: 3, ipLimit: 10, deviceLimit: 5 })
async startRegistration() { }

// More lenient for resend
@Post('register/resend-otp')
@UseGuards(SecurityHeadersGuard, RateLimitGuard)
@RateLimit({ phoneLimit: 5, ipLimit: 15, deviceLimit: 8 })
async resendOTP() { }

// No phone limit for login (only IP/device)
@Post('signin')
@UseGuards(RateLimitGuard)
@RateLimit({ ipLimit: 20, deviceLimit: 10 })
async signin() { }
```

---

## 🎯 Current Implementation

### **Endpoints Using Guards:**

✅ **Registration Endpoints:**
- `POST /auth/register/start` - SecurityHeadersGuard + RateLimitGuard
- `POST /auth/register/resend-otp` - SecurityHeadersGuard + RateLimitGuard
- `POST /auth/register/verify-otp` - SecurityHeadersGuard only

❌ **Other Endpoints (Not Using Guards Yet):**
- `POST /auth/signin` - No guards
- `POST /auth/signup` - No guards
- `POST /auth/reset-password` - No guards

---

## 🔧 How Guards Work

### **Execution Order:**
1. **RateLimitGuard** runs first (if applied)
   - Checks phone, IP, and device rate limits
   - Throws `429 Too Many Requests` if exceeded
   - Logs to SecurityEvent table

2. **SecurityHeadersGuard** runs next (if applied)
   - Validates all required headers
   - Throws `400 Bad Request` if invalid
   - Prevents replay attacks

3. **Controller method** executes (if guards pass)

### **Benefits:**
- ✅ Reusable across all endpoints
- ✅ Declarative (use decorators)
- ✅ Consistent security
- ✅ Easy to apply/remove
- ✅ Centralized logic

---

## 📋 Migration Checklist

To add guards to existing endpoints:

1. **Import guards:**
```typescript
import { SecurityHeadersGuard } from 'src/common/guards/security-headers.guard';
import { RateLimitGuard, RateLimit } from 'src/common/guards/rate-limit.guard';
```

2. **Add decorators:**
```typescript
@UseGuards(SecurityHeadersGuard, RateLimitGuard)
@RateLimit({ phoneLimit: 3, ipLimit: 10, deviceLimit: 5 })
@Post('endpoint')
```

3. **Remove manual validation from service:**
   - Remove `validateSecurityHeaders()` calls
   - Remove `checkRateLimits()` calls
   - Guards handle it automatically

---

## ⚙️ Configuration

### **Rate Limit Configuration:**

The `@RateLimit()` decorator accepts:
```typescript
{
  phoneLimit?: number;   // Max requests per hour for phone number
  ipLimit?: number;      // Max requests per hour for IP address
  deviceLimit?: number;  // Max requests per hour for device
  windowMs?: number;     // Time window in milliseconds (default: 1 hour)
}
```

### **Default Limits (if decorator not used):**
- Phone: 3 requests/hour
- IP: 10 requests/hour
- Device: 5 requests/hour

---

## 🚀 Next Steps

1. **Add guards to signin/signup endpoints**
2. **Add guards to password reset endpoints**
3. **Consider adding to authenticated endpoints** (with JWT + rate limiting)
4. **Implement HMAC signature verification** (currently only format validation)

---

## 📚 References

- `src/common/guards/security-headers.guard.ts` - Security headers validation
- `src/common/guards/rate-limit.guard.ts` - Rate limiting logic
- `src/common/common.module.ts` - Global module exporting guards


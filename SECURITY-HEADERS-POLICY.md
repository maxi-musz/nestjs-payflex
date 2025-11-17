# Security Headers & Rate Limiting Policy

## 📋 Current Implementation Status

### ✅ Endpoints WITH Security Headers & Rate Limiting

**Registration Endpoints (Public - Pre-Authentication):**
- `POST /auth/register/start` - ✅ Security headers + Rate limiting
- `POST /auth/register/resend-otp` - ✅ Security headers + Rate limiting  
- `POST /auth/register/verify-otp` - ✅ Security headers (NO rate limiting)

### ❌ Endpoints WITHOUT Security Headers & Rate Limiting

**Authentication Endpoints:**
- `POST /auth/signup` - ❌ No security headers, No rate limiting
- `POST /auth/signin` - ❌ No security headers, No rate limiting
- `POST /auth/request-email-otp` - ❌ No security headers, No rate limiting
- `POST /auth/verify-email-otp` - ❌ No security headers, No rate limiting
- `POST /auth/reset-password` - ❌ No security headers, No rate limiting

**Other Endpoints:**
- `GET /auth/health` - ❌ No security headers, No rate limiting (public health check)

---

## 🎯 Recommended Security Strategy

### **Option 1: Tiered Security (Recommended)**

Apply security measures based on endpoint sensitivity:

#### **Tier 1: Critical Public Endpoints (Registration, Login)**
**Requires:** Security Headers + Rate Limiting
- Registration endpoints
- Login/Signin
- Password reset
- OTP requests

**Why:** These are public-facing and vulnerable to abuse

#### **Tier 2: Authenticated Endpoints**
**Requires:** JWT Authentication + Optional Rate Limiting
- User profile endpoints
- Transaction endpoints
- Settings endpoints

**Why:** Already protected by JWT, but rate limiting prevents abuse

#### **Tier 3: Public/Health Endpoints**
**Requires:** None (or basic IP rate limiting)
- Health checks
- Public information endpoints

**Why:** Low risk, high availability needed

---

## 🔧 Implementation Options

### **Option A: Global Guard/Middleware (Apply to All)**

Create a global guard that applies security headers to ALL endpoints:

```typescript
// src/common/guards/security-headers.guard.ts
@Injectable()
export class SecurityHeadersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;
    
    // Skip for health checks
    if (request.url.includes('/health')) {
      return true;
    }
    
    SecurityHeadersValidator.validateAllHeaders({
      'x-timestamp': headers['x-timestamp'],
      'x-nonce': headers['x-nonce'],
      // ... etc
    });
    
    return true;
  }
}
```

**Pros:** Consistent security across all endpoints
**Cons:** May be too strict for some endpoints (health checks, webhooks)

### **Option B: Selective Application (Current Approach - Recommended)**

Apply security headers only where needed using decorators:

```typescript
// Create a decorator
export const RequireSecurityHeaders = () => SetMetadata('requireSecurityHeaders', true);

// Use in controller
@Post('signin')
@RequireSecurityHeaders()
async signin(...) { }
```

**Pros:** Flexible, can choose per endpoint
**Cons:** Need to remember to add to new endpoints

### **Option C: Environment-Based**

Apply security headers based on environment:

```typescript
if (process.env.NODE_ENV === 'production') {
  // Require security headers for all endpoints
} else {
  // Optional in development
}
```

---

## 📊 Rate Limiting Strategy

### **Current Implementation:**
- **Registration endpoints:** 3 requests/hour per phone, 10/hour per IP, 5/hour per device
- **Other endpoints:** No rate limiting

### **Recommended:**
1. **Registration/Login:** Strict rate limiting (current)
2. **Authenticated endpoints:** Per-user rate limiting (e.g., 100 requests/minute)
3. **Public endpoints:** IP-based rate limiting (e.g., 1000 requests/hour)

---

## 🚀 Recommended Next Steps

### **Immediate Actions:**

1. **Add Security Headers to Critical Endpoints:**
   - ✅ `POST /auth/signin` - Add security headers + rate limiting
   - ✅ `POST /auth/signup` - Add security headers + rate limiting
   - ✅ `POST /auth/reset-password` - Add security headers + rate limiting

2. **Create Reusable Guards:**
   ```typescript
   // src/common/guards/security-headers.guard.ts
   // src/common/guards/rate-limit.guard.ts
   ```

3. **Document Which Endpoints Require What:**
   - Update API documentation
   - Add to OpenAPI/Swagger specs

### **Future Enhancements:**

1. **HMAC Signature Verification:**
   - Currently only validates signature format
   - Should verify signature against client secret

2. **Nonce Replay Protection:**
   - Store used nonces in Redis
   - Prevent replay attacks

3. **Device Registration:**
   - Register devices on first use
   - Generate device-specific secrets
   - Use for HMAC signature verification

---

## 📝 Decision Matrix

| Endpoint Type | Security Headers | Rate Limiting | JWT Auth |
|--------------|------------------|---------------|----------|
| Registration | ✅ Required | ✅ Required | ❌ No |
| Login/Signin | ✅ Recommended | ✅ Recommended | ❌ No |
| Password Reset | ✅ Recommended | ✅ Recommended | ❌ No |
| Authenticated | ⚠️ Optional | ✅ Recommended | ✅ Required |
| Health Check | ❌ No | ⚠️ Basic IP | ❌ No |
| Webhooks | ⚠️ Custom | ⚠️ Custom | ❌ No |

---

## 💡 Best Practices

1. **Security Headers:**
   - Always required for public endpoints (registration, login)
   - Optional for authenticated endpoints (JWT already provides security)
   - Not needed for health checks

2. **Rate Limiting:**
   - Always required for public endpoints
   - Recommended for authenticated endpoints (prevent abuse)
   - Different limits for different endpoint types

3. **Implementation:**
   - Use guards for reusable logic
   - Make it easy to opt-in/opt-out
   - Log all security events
   - Monitor rate limit violations

---

## 🔐 Current Security Headers Explained

- **X-Timestamp**: Prevents replay attacks (must be within 5 minutes)
- **X-Nonce**: Unique request identifier (prevents duplicate requests)
- **X-Signature**: HMAC signature (validates request integrity) - *Currently only format validation*
- **X-Request-ID**: Request tracking ID
- **X-Device-ID**: Device identifier
- **X-Device-Fingerprint**: Device fingerprint for fraud detection

---

## ❓ Questions to Answer

1. **Should ALL endpoints require security headers?**
   - **Answer:** No, only public/critical endpoints
   - **Recommendation:** Registration, Login, Password Reset

2. **Should ALL endpoints be rate limited?**
   - **Answer:** Yes, but with different limits
   - **Recommendation:** 
     - Public endpoints: Strict (3-10/hour)
     - Authenticated endpoints: Moderate (100/minute)
     - Health checks: Lenient (1000/hour)

3. **How to handle webhooks?**
   - **Answer:** Custom validation (e.g., Paystack signature)
   - **Recommendation:** Separate webhook validation logic


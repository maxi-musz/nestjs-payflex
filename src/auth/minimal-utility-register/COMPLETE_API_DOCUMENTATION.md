# Complete Minimal Registration & Login API Documentation

Complete documentation for frontend integration including all endpoints, headers, payloads, and response structures.

## Base URL
All endpoints are under: `/api/v1/auth/minimal-register`

---

## Required Security Headers

**All endpoints require these security headers** (enforced by `SecurityHeadersGuard`):

| Header Name | Required | Description | Example |
|------------|----------|-------------|---------|
| `x-timestamp` | ✅ Yes | Request timestamp (Unix timestamp in milliseconds) | `1705324800000` |
| `x-nonce` | ✅ Yes | Unique request identifier (UUID recommended) | `550e8400-e29b-41d4-a716-446655440000` |
| `x-signature` | ✅ Yes | Request signature (HMAC-SHA256 of request body) | `abc123...` |
| `x-request-id` | ✅ Yes | Unique request ID for tracking | `req-1234567890` |
| `x-device-id` | ✅ Yes | Device identifier (unique per device) | `device-abc123` |
| `x-device-fingerprint` | ✅ Yes | Device fingerprint for security | `fp-xyz789` |

**Note:** In development, you can set `BYPASS_SECURITY_HEADERS=true` to bypass these headers.

---

## Registration Flow

### Step 1: Request Email OTP

**Endpoint:** `POST /api/v1/auth/minimal-register/request-email-otp`

**Guards:** `SecurityHeadersGuard`, `RateLimitGuard`

**Request Headers:**
```
x-timestamp: 1705324800000
x-nonce: 550e8400-e29b-41d4-a716-446655440000
x-signature: abc123...
x-request-id: req-1234567890
x-device-id: device-abc123
x-device-fingerprint: fp-xyz789
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Field Validation:**
- `email`: Required, valid email format, automatically trimmed and lowercased

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP successfully sent to: user@example.com. Please check your email.",
  "data": {
    "email": "user@example.com",
    "otp_expires_in": 300,
    "message": "OTP will expire in 5 minutes."
  }
}
```

**Success Response - Email Already Verified (200 OK):**
When email is already verified/registered, returns success (not error):
```json
{
  "success": true,
  "message": "Email is already verified. Please login to continue.",
  "data": {
    "email": "user@example.com",
    "email_already_verified": true,
    "is_registered": true,
    "can_login": true,
    "message": "This email is already registered. Please login instead."
  }
}
```

**Error Responses:**

**400 Bad Request - Invalid Email:**
```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

**503 Service Unavailable - Email Sending Failed:**
```json
{
  "statusCode": 503,
  "message": "Failed to send OTP email. Please check your email address and try again, or contact support if the issue persists."
}
```

**429 Too Many Requests - Rate Limit Exceeded:**
```json
{
  "success": false,
  "message": "Too many requests from this IP address. Please try again in 2 minutes.",
  "data": {
    "error": "RATE_LIMIT_EXCEEDED",
    "retry_after": 120,
    "retry_after_formatted": "2 minutes"
  }
}
```

---

### Step 2: Verify Email OTP

**Endpoint:** `POST /api/v1/auth/minimal-register/verify-email-otp`

**Guards:** `SecurityHeadersGuard`, `RateLimitGuard`

**Request Headers:**
Same as Step 1

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "1234"
}
```

**Field Validation:**
- `email`: Required, valid email format, automatically trimmed and lowercased
- `otp`: Required, 4-digit numeric string

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now proceed to complete your registration.",
  "data": {
    "email": "user@example.com",
    "email_verified": true,
    "can_proceed": true,
    "next_step": "REGISTRATION"
  }
}
```

**Success Response - Email Already Verified (200 OK):**
```json
{
  "success": true,
  "message": "Email already verified",
  "data": {
    "email": "user@example.com",
    "email_already_verified": true,
    "is_registered": true,
    "can_login": true,
    "message": "This email is already registered. Please login instead."
  }
}
```

**Error Responses:**

**400 Bad Request - No Registration Found:**
```json
{
  "statusCode": 400,
  "message": "No active registration found. Please request an OTP first."
}
```

**400 Bad Request - No OTP Found:**
```json
{
  "statusCode": 400,
  "message": "No OTP found. Please request a new OTP."
}
```

**400 Bad Request - OTP Expired:**
```json
{
  "statusCode": 400,
  "message": "OTP has expired. Please request a new OTP."
}
```

**400 Bad Request - Invalid OTP:**
```json
{
  "statusCode": 400,
  "message": "Invalid OTP. Please check and try again."
}
```

---

### Step 3: Complete Registration

**Endpoint:** `POST /api/v1/auth/minimal-register/register`

**Guards:** `SecurityHeadersGuard`, `RateLimitGuard`

**Request Headers:**
Same as Step 1

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "user@example.com",
  "phone_number": "2348012345678",
  "password": "SecurePass123",
  "referral_code": "SMILE123"
}
```

**Field Validation:**
- `first_name`: Required, 2-50 characters, automatically trimmed and capitalized
- `last_name`: Required, 2-50 characters, automatically trimmed and capitalized
- `email`: Required, valid email format, must match verified email from Step 1
- `phone_number`: Required, format: `234XXXXXXXXXX` or `+234XXXXXXXXXX` (automatically normalized)
- `password`: Required, 8-64 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- `referral_code`: Optional, 3-20 alphanumeric characters, automatically uppercased

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration completed successfully! You can now use utility services.",
  "data": {
    "registration_completed": true,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone_number": "2348012345678",
      "smipay_tag": "smileA1B2C",
      "first_name": "John",
      "last_name": "Doe",
      "referral_code": "SMILE123",
      "is_email_verified": true,
      "is_phone_verified": false,
      "account_status": "active"
    },
    "referral_applied": true,
    "can_login": true,
    "message": "Registration completed successfully. You can now login and use utility services."
  }
}
```

**Error Responses:**

**400 Bad Request - Email Not Verified:**
```json
{
  "statusCode": 400,
  "message": "Email verification required. Please verify your email first."
}
```

**400 Bad Request - No Registration Session:**
```json
{
  "statusCode": 400,
  "message": "No registration session found. Please verify your email first."
}
```

**409 Conflict - Email Already Registered:**
```json
{
  "statusCode": 409,
  "message": "This email is already registered. Please login instead."
}
```

**409 Conflict - Phone Already Registered:**
```json
{
  "statusCode": 409,
  "message": "This phone number is already registered. Please login instead."
}
```

**400 Bad Request - Validation Error:**
```json
{
  "statusCode": 400,
  "message": [
    "first_name must be longer than or equal to 2 characters",
    "password must contain at least one uppercase letter"
  ],
  "error": "Bad Request"
}
```

---

## Login Flow

### Login Endpoint

**Endpoint:** `POST /api/v1/auth/minimal-register/login`

**Guards:** `SecurityHeadersGuard`, `RateLimitGuard`

**Request Headers:**
Same as Registration endpoints

**Request Body:**

**Option 1: Login with Email**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Option 2: Login with Phone Number**
```json
{
  "phone_number": "2348012345678",
  "password": "SecurePass123"
}
```

**Field Validation:**
- `email`: Optional, valid email format (required if `phone_number` not provided)
- `phone_number`: Optional, format: `234XXXXXXXXXX` or `+234XXXXXXXXXX` (required if `email` not provided)
- `password`: Required, 8-64 characters
- **Note:** You must provide either `email` OR `phone_number` (not both, at least one required)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJwaG9uZV9udW1iZXIiOiIyMzQ4MDEyMzQ1Njc4IiwiaWF0IjoxNzA1MzI0ODAwLCJleHAiOjE3MDU5Mjk2MDB9.abc123...",
    "token_type": "Bearer",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone_number": "2348012345678",
      "smipay_tag": "smileA1B2C",
      "first_name": "John",
      "last_name": "Doe",
      "is_email_verified": true,
      "is_phone_verified": false,
      "account_status": "active",
      "wallet": {
        "current_balance": 0,
        "isActive": true
      }
    }
  }
}
```

**Error Responses:**

**400 Bad Request - Missing Credentials:**
```json
{
  "statusCode": 400,
  "message": "Either email or phone number is required"
}
```

**401 Unauthorized - Invalid Credentials:**
```json
{
  "statusCode": 401,
  "message": "Invalid email/phone number or password"
}
```

**401 Unauthorized - Account Not Set Up:**
```json
{
  "statusCode": 401,
  "message": "Account not fully set up. Please complete registration first."
}
```

**401 Unauthorized - Account Suspended:**
```json
{
  "statusCode": 401,
  "message": "Your account has been suspended. Please contact support."
}
```

---

## Device Details

**Note:** Currently, device details are **NOT required** for minimal registration/login endpoints. The backend extracts IP address automatically from the request.

However, if you want to send device metadata (optional), you can include it in the request body or headers:

**Optional Device Headers:**
- `x-device-name`: Device name (e.g., "iPhone 14 Pro")
- `x-device-model`: Device model (e.g., "iPhone15,2")
- `platform`: Platform type (e.g., "ios", "android")
- `x-os-name`: OS name (e.g., "iOS", "Android")
- `x-os-version`: OS version (e.g., "17.0")
- `x-app-version`: App version (e.g., "1.0.0")

**Note:** These are optional and not currently used by the minimal registration/login services, but may be used in the future for security tracking.

---

## Authentication Token Usage

After successful login, use the `access_token` in subsequent API requests:

**Authorization Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiry:**
- Default: 7 days (configurable via `JWT_EXPIRES_IN` environment variable)
- Token format: JWT (JSON Web Token)

**Token Payload:**
```json
{
  "sub": "user-id-uuid",
  "email": "user@example.com",
  "phone_number": "2348012345678",
  "iat": 1705324800,
  "exp": 1705929600
}
```

---

## Complete Registration Flow Example

```
1. User enters email
   ↓
   POST /api/v1/auth/minimal-register/request-email-otp
   Headers: [Security Headers]
   Body: { "email": "user@example.com" }
   ↓
   Response: { "success": true, "data": { "otp_expires_in": 300 } }
   
2. User receives OTP via email and enters it
   ↓
   POST /api/v1/auth/minimal-register/verify-email-otp
   Headers: [Security Headers]
   Body: { "email": "user@example.com", "otp": "1234" }
   ↓
   Response: { "success": true, "data": { "email_verified": true, "next_step": "REGISTRATION" } }
   
3. User completes registration form
   ↓
   POST /api/v1/auth/minimal-register/register
   Headers: [Security Headers]
   Body: {
     "first_name": "John",
     "last_name": "Doe",
     "email": "user@example.com",
     "phone_number": "2348012345678",
     "password": "SecurePass123",
     "referral_code": "SMILE123"
   }
   ↓
   Response: { "success": true, "data": { "registration_completed": true, "user": {...}, "can_login": true } }
   
4. User can now login
   ↓
   POST /api/v1/auth/minimal-register/login
   Headers: [Security Headers]
   Body: { "email": "user@example.com", "password": "SecurePass123" }
   ↓
   Response: { "success": true, "data": { "access_token": "...", "user": {...} } }
```

---

## Complete Login Flow Example

```
1. User enters email/phone + password
   ↓
   POST /api/v1/auth/minimal-register/login
   Headers: [Security Headers]
   Body: { "email": "user@example.com", "password": "SecurePass123" }
   ↓
   Response: { "success": true, "data": { "access_token": "...", "user": {...} } }
   
2. Store access_token and use in subsequent requests
   ↓
   Authorization: Bearer <access_token>
```

---

## Rate Limiting

All endpoints are rate-limited. If exceeded:

**Response (429 Too Many Requests):**
```json
{
  "success": false,
  "message": "Too many requests from this IP address. Please try again in 2 minutes.",
  "data": {
    "error": "RATE_LIMIT_EXCEEDED",
    "retry_after": 120,
    "retry_after_formatted": "2 minutes"
  }
}
```

---

## OTP Expiry

- OTP expires after **5 minutes** (300 seconds)
- If expired, request a new OTP using Step 1 endpoint
- OTP is automatically cleared after successful verification

---

## Notes

- All string inputs are automatically trimmed
- Email is converted to lowercase
- Phone numbers are normalized to `234XXXXXXXXXX` format (E.164)
- Referral codes are converted to uppercase
- Invalid referral codes are ignored (registration continues)
- Password is hashed using Argon2
- Wallet is automatically created during registration
- IP address is automatically extracted from request (no need to send)

---

## Error Handling Best Practices

1. **Check `success` field** in response to determine if operation was successful
2. **Handle `email_already_verified`** flag - redirect to login if `is_registered: true`
3. **Check `can_login`** flag - indicates if user can proceed to login
4. **Validate response structure** before accessing nested fields
5. **Handle rate limiting** - show retry message with `retry_after` seconds
6. **Store access_token securely** - use secure storage (Keychain/Keystore)
7. **Handle token expiry** - redirect to login when token expires (401 Unauthorized)

---

## Security Best Practices

1. **Always send security headers** - Required for all endpoints
2. **Use HTTPS** - All API calls should be over HTTPS
3. **Store tokens securely** - Use secure storage mechanisms
4. **Validate responses** - Don't trust client-side validation alone
5. **Handle errors gracefully** - Show user-friendly error messages
6. **Implement retry logic** - For network errors, not for validation errors
7. **Log security events** - Track failed login attempts

---

## Support

For issues or questions, contact the backend team or refer to the main API documentation.


# Minimal Utility Registration API

Brief documentation for frontend integration.

## Base URL
All endpoints are under: `/auth/minimal-register`

---

## Endpoint 1: Request Email OTP

**POST** `/auth/minimal-register/request-email-otp`

### Request Headers
- `x-timestamp`: Request timestamp
- `x-nonce`: Unique request identifier
- `x-signature`: Request signature
- `x-request-id`: Unique request ID
- `x-device-id`: Device identifier
- `x-device-fingerprint`: Device fingerprint

### Request Body
```json
{
  "email": "user@example.com"
}
```

### Response (Success)
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

### Response (Email Already Verified - Success Response)
When email is already verified, this returns a **success response** (not an error) so the app can handle it appropriately:

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

**Note:** The `is_registered` field indicates if the user has completed registration (has password). The app should:
- If `is_registered: true` → Redirect to login page
- If `is_registered: false` → User can complete registration or login

---

## Endpoint 2: Verify Email OTP

**POST** `/auth/minimal-register/verify-email-otp`

### Request Headers
Same as Endpoint 1

### Request Body
```json
{
  "email": "user@example.com",
  "otp": "1234"
}
```

### Response (Success)
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

### Response (Error - Invalid/Expired OTP)
```json
{
  "statusCode": 400,
  "message": "Invalid OTP. Please check and try again."
}
```

### Response (Error - OTP Expired)
```json
{
  "statusCode": 400,
  "message": "OTP has expired. Please request a new OTP."
}
```

---

## Endpoint 3: Complete Registration

**POST** `/auth/minimal-register/register`

### Request Headers
Same as Endpoint 1

### Request Body
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "user@example.com",
  "phone_number": "2348012345678",
  "password": "SecurePass123",
  "referral_code": "SMILE123" // Optional
}
```

### Field Validation
- `first_name`: Required, 2-50 characters
- `last_name`: Required, 2-50 characters
- `email`: Required, valid email format (must match verified email)
- `phone_number`: Required, format: `234XXXXXXXXXX` or `+234XXXXXXXXXX`
- `password`: Required, 8-64 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- `referral_code`: Optional, 3-20 alphanumeric characters

### Response (Success)
```json
{
  "success": true,
  "message": "Registration completed successfully! You can now use utility services.",
  "data": {
    "registration_completed": true,
    "user_id": "uuid-here",
    "user": {
      "id": "uuid-here",
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

### Response (Error - Email Not Verified)
```json
{
  "statusCode": 400,
  "message": "Email verification required. Please verify your email first."
}
```

### Response (Error - Email Already Registered)
```json
{
  "statusCode": 409,
  "message": "This email is already registered. Please login instead."
}
```

### Response (Error - Phone Already Registered)
```json
{
  "statusCode": 409,
  "message": "This phone number is already registered. Please login instead."
}
```

### Response (Error - Validation)
```json
{
  "statusCode": 400,
  "message": ["Validation error messages"],
  "error": "Bad Request"
}
```

---

## Endpoint 4: Login

**POST** `/auth/minimal-register/login`

### Request Headers
Same as Endpoint 1

### Request Body
```json
{
  "email": "user@example.com",  // OR
  "phone_number": "2348012345678",  // Either email or phone_number is required
  "password": "SecurePass123"
}
```

**Note:** You must provide either `email` OR `phone_number` (not both). At least one is required.

### Field Validation
- `email`: Optional, valid email format (required if phone_number not provided)
- `phone_number`: Optional, format: `234XXXXXXXXXX` or `+234XXXXXXXXXX` (required if email not provided)
- `password`: Required, 8-64 characters

### Response (Success)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "user": {
      "id": "uuid-here",
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

### Response (Error - Invalid Credentials)
```json
{
  "statusCode": 401,
  "message": "Invalid email/phone number or password"
}
```

### Response (Error - Account Not Set Up)
```json
{
  "statusCode": 401,
  "message": "Account not fully set up. Please complete registration first."
}
```

### Response (Error - Account Suspended)
```json
{
  "statusCode": 401,
  "message": "Your account has been suspended. Please contact support."
}
```

### Response (Error - Missing Credentials)
```json
{
  "statusCode": 400,
  "message": "Either email or phone number is required"
}
```

---

## Flow Summary

### Registration Flow
1. **Request OTP** → User provides email, receives OTP via email
2. **Verify OTP** → User enters OTP, email is verified
3. **Register** → User completes registration with personal details

**Note:** Steps must be completed in order. Email must be verified before registration.

### Login Flow
1. **Login** → User provides email OR phone number + password, receives access token

---

## Rate Limiting

All endpoints are rate-limited. If exceeded, you'll receive:
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

- OTP expires after **5 minutes**
- If expired, request a new OTP using Endpoint 1

---

## Notes

- All string inputs are automatically trimmed
- Email is converted to lowercase
- Phone numbers are normalized to `234XXXXXXXXXX` format
- Referral codes are converted to uppercase
- Invalid referral codes are ignored (registration continues)


# Login Endpoints Documentation

This document describes the login flow endpoints, their payloads, and all possible response structures.

---

## 1. Check Login Status

**Endpoint:** `POST /auth/check-login-status`

**Description:** Checks the registration/login status of a user by phone number. Returns information to help the app determine which screen to show.

**Guards:** `SecurityHeadersGuard` (required security headers)

---

### Request Payload

```json
{
  "phone_number": "+2341234567890"
}
```

**Validation Rules:**
- `phone_number`: Required, must match E.164 format `^\+234[0-9]{10}$`
  - Example: `+2341234567890`

---

### Response Structures

All responses follow the `ApiResponseDto` format:
```typescript
{
  success: boolean;
  message: string;
  data: any;
}
```

---

#### Response 1: No Registration Found

**Status Code:** `200 OK`

**When:** Phone number has no registration progress record

```json
{
  "success": true,
  "message": "No registration found. Please start registration.",
  "data": {
    "registration_completed": false,
    "has_registration_progress": false,
    "current_step": 0,
    "next_step": "START_REGISTRATION",
    "can_login": false,
    "message": "Please start registration to create an account."
  }
}
```

**App Action:** Show registration start screen

---

#### Response 2: Registration In Progress (is_complete = false)

**Status Code:** `200 OK`

**When:** Registration exists but `is_complete` is `false`

```json
{
  "success": true,
  "message": "Registration in progress",
  "data": {
    "registration_completed": false,
    "has_registration_progress": true,
    "session_id": "uuid-string",
    "current_step": 1,
    "next_step": "OTP_VERIFICATION",
    "can_login": false,
    "can_proceed": true,
    "steps": {
      "step_1": {
        "completed": true,
        "name": "Phone Number",
        "description": "Phone number entered"
      },
      "step_2": {
        "completed": false,
        "name": "OTP Verification",
        "description": "Verify phone number with OTP"
      },
      // ... other steps
    },
    "registration_data": {
      "phone_number": "+2341234567890",
      "referral_code": "ABC123",
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    },
    "message": "Please verify your phone number with OTP to continue."
  }
}
```

**App Action:** Show the appropriate registration step screen based on `current_step` and `next_step`

---

#### Response 3: Registration Complete (is_complete = true)

**Status Code:** `200 OK`

**When:** Registration is complete (`is_complete = true`), user should enter password

```json
{
  "success": true,
  "message": "Registration completed. Please enter your password.",
  "data": {
    "registration_completed": true,
    "can_login": true,
    "requires_password": true,
    "user_id": "uuid-string",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "message": "Please enter your password to continue."
  }
}
```

**App Action:** Show password entry screen

---

#### Response 4: Error - Invalid Phone Number

**Status Code:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Phone number must be in E.164 format (+234XXXXXXXXXX)",
  "error": "Bad Request"
}
```

---

#### Response 5: Error - Registration Status Inconsistent

**Status Code:** `500 Internal Server Error`

**When:** `is_complete = true` but user not found in User table

```json
{
  "statusCode": 500,
  "message": "Registration status inconsistent. Please contact support.",
  "error": "Internal Server Error"
}
```

---

## 2. Verify Password

**Endpoint:** `POST /auth/verify-password`

**Description:** Verifies user password and returns access token. Called after `check-login-status` returns `requires_password: true`.

**Guards:** `SecurityHeadersGuard` (required security headers)

---

### Request Payload

```json
{
  "phone_number": "+2341234567890",
  "password": "userpassword123",
  "device_metadata": {
    "device_id": "unique-device-id",
    "device_name": "John's iPhone",
    "device_model": "iPhone 14 Pro",
    "platform": "ios",
    "os_name": "iOS",
    "os_version": "17.2",
    "app_version": "1.0.0"
  }
}
```

**Validation Rules:**
- `phone_number`: Required, must match E.164 format `^\+234[0-9]{10}$`
- `password`: Required, minimum 6 characters
- `device_metadata`: Optional, but recommended for device tracking
  - `device_id`: Required if `device_metadata` is provided
  - `platform`: Required if `device_metadata` is provided (should be "ios" or "android")
  - Other fields are optional

**Note:** Device metadata can also be sent via headers:
- `x-device-id`
- `x-device-fingerprint`
- `x-device-name`
- `x-device-model`
- `platform`
- `x-os-name`
- `x-os-version`
- `x-app-version`

---

### Response Structures

---

#### Response 1: Success - Password Verified

**Status Code:** `200 OK`

**When:** Password is correct

```json
{
  "success": true,
  "message": "Welcome back",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": null,
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "phone_number": "+2341234567890",
      "is_email_verified": true,
      "role": "user",
      "gender": "male",
      "date_of_birth": "1990-01-15T00:00:00.000Z",
      "profile_image": "https://example.com/profile.jpg",
      "kyc_verified": true,
      "isTransactionPinSetup": true,
      "created_at": "2025-01-15"
    }
  }
}
```

**App Action:** 
- Store `access_token` for authenticated requests
- Navigate to dashboard/home screen
- Use `access_token` in `Authorization: Bearer <token>` header for subsequent requests

---

#### Response 2: Error - Invalid Phone Number

**Status Code:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Phone number must be in E.164 format (+234XXXXXXXXXX)",
  "error": "Bad Request"
}
```

---

#### Response 3: Error - User Not Found

**Status Code:** `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

---

#### Response 4: Error - Password Not Set

**Status Code:** `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "Password not set. Please reset your password.",
  "error": "Unauthorized"
}
```

---

#### Response 5: Error - Invalid Password

**Status Code:** `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**Note:** Same message as "User Not Found" for security (don't reveal if user exists)

---

## Login Flow Diagram

```
User enters phone number
         ↓
POST /auth/check-login-status
         ↓
    ┌────┴────┐
    │         │
    ↓         ↓
No reg    Reg found
found     ┌───┴───┐
    │     │       │
    ↓     ↓       ↓
Start  Incomplete Complete
Reg    (is_complete=false) (is_complete=true)
    │     │       │
    ↓     ↓       ↓
Show   Show      Show
Reg    Reg       Password
Screen Step     Entry Screen
         │       │
         └───┬───┘
             ↓
    POST /auth/verify-password
             ↓
        ┌────┴────┐
        │         │
        ↓         ↓
    Success    Error
        │         │
        ↓         ↓
    Get Token  Show Error
        │
        ↓
    Navigate to Dashboard
```

---

## Security Headers Required

Both endpoints require the following security headers (enforced by `SecurityHeadersGuard`):

- `x-request-id`: Unique request identifier
- `x-timestamp`: Request timestamp
- `x-signature`: Request signature (if applicable)

---

## Notes

1. **Phone Number Format:** All phone numbers must be in E.164 format: `+234XXXXXXXXXX` (13 characters total)

2. **Access Token:** The access token from `verify-password` should be included in subsequent authenticated requests:
   ```
   Authorization: Bearer <access_token>
   ```

3. **Token Expiration:** Token expiration is configured via `JWT_EXPIRES_IN` environment variable (default: `7d`)

4. **Device Tracking:** Device metadata is automatically tracked when provided. This helps with security and device management.

5. **Error Messages:** For security reasons, authentication errors return generic "Invalid credentials" messages to prevent user enumeration.

---

## Example cURL Requests

### Check Login Status

```bash
curl -X POST http://localhost:3000/auth/check-login-status \
  -H "Content-Type: application/json" \
  -H "x-request-id: unique-request-id" \
  -H "x-timestamp: 1234567890" \
  -d '{
    "phone_number": "+2341234567890"
  }'
```

### Verify Password

```bash
curl -X POST http://localhost:3000/auth/verify-password \
  -H "Content-Type: application/json" \
  -H "x-request-id: unique-request-id" \
  -H "x-timestamp: 1234567890" \
  -H "x-device-id: device-123" \
  -H "platform: ios" \
  -d '{
    "phone_number": "+2341234567890",
    "password": "userpassword123",
    "device_metadata": {
      "device_id": "device-123",
      "platform": "ios",
      "device_name": "John iPhone",
      "os_version": "17.2"
    }
  }'
```

---

## Response Status Codes Summary

| Status Code | Meaning | Endpoint |
|------------|---------|----------|
| 200 | Success | Both |
| 400 | Bad Request (validation error) | Both |
| 401 | Unauthorized (invalid credentials) | verify-password |
| 500 | Internal Server Error | check-login-status |


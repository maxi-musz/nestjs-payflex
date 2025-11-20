# Login Endpoints Documentation

This document describes the login flow endpoints, their payloads, and all possible response structures.

---

## 1. Check Login Status

**Endpoint:** `POST /auth/check-login-status`

**Description:** Checks the registration/login status of a user by email or phone number. Returns information to help the app determine which screen to show.

**Guards:** `SecurityHeadersGuard` (required security headers)

---

### Request Payload

**Option 1: Using Email**
```json
{
  "email": "user@example.com"
}
```

**Option 2: Using Phone Number**
```json
{
  "phone_number": "+2341234567890"
}
```

**Validation Rules:**
- Either `email` OR `phone_number` must be provided (at least one required)
- `email`: Optional, must be a valid email format
  - Example: `user@example.com`
- `phone_number`: Optional, must match E.164 format `^\+234[0-9]{10}$`
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

#### Response 1: No Registration/Account Found

**Status Code:** `200 OK`

**When:** 
- Email: No user found with that email
- Phone: Phone number has no registration progress record

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
    "current_step": 3,
    "next_step": "ID_INFORMATION",
    "can_login": false,
    "can_proceed": false,
    "is_step_1_pending": false,
    "is_step_2_pending": false,
    "is_step_3_pending": true,
    "is_step_4_pending": false,
    "is_step_5_pending": false,
    "is_step_6_pending": false,
    "is_step_7_pending": false,
    "is_step_8_pending": false,
    "is_step_9_pending": false,
    "step_2_verification_status": "verified",
    "step_3_verification_status": "pending",
    "step_4_verification_status": null,
    "steps": {
      "step_1": {
        "completed": true,
        "verified": true,
        "name": "Phone Registration"
      },
      "step_2": {
        "completed": true,
        "verified": true,
        "name": "OTP Verification",
        "is_phone_verified": true
      },
      "step_3": {
        "completed": true,
        "verified": false,
        "name": "ID Information",
        "id_type": "NIN",
        "id_number": "123***890",
        "verification_status": "pending",
        "verification_provider": "dojah"
      },
      "step_4": {
        "completed": false,
        "verified": false,
        "name": "Face Verification",
        "verification_status": null
      }
      // ... other steps
    },
    "registration_data": {
      "phone_number": "+2341234567890",
      "referral_code": "ABC123",
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    },
    "message": "ID verification is pending. Please wait for verification to complete."
  }
}
```

**Key Fields for App Decision Making:**
- `is_step_X_pending`: Boolean flag for each step (1-9) indicating if that step is pending verification
- `step_X_verification_status`: Verification status for steps that require verification (2, 3, 4)
- `can_proceed`: Whether user can proceed to next step
- `current_step`: Current step number
- `next_step`: Next step key

**App Logic:**
```typescript
// Check if current step is pending
if (response.data[`is_step_${response.data.current_step}_pending`]) {
  // Show verification pending screen for current step
  showVerificationPendingScreen(response.data.current_step);
} else if (!response.data.can_proceed) {
  // Show entry form for current step
  showStepEntryForm(response.data.current_step);
} else {
  // Can proceed to next step
  showStepEntryForm(response.data.next_step);
}
```

**App Action:** Show the appropriate registration step screen based on `current_step` and `next_step`

---

#### Response 3: Registration/Account Complete - Password Required

**Status Code:** `200 OK`

**When:** 
- Email: User account exists and is active, user should enter password
- Phone: Registration is complete (`is_complete = true`), user should enter password

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

#### Response 4: Error - Missing Identifier

**Status Code:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Either email or phone_number must be provided",
  "error": "Bad Request"
}
```

---

#### Response 5: Error - Invalid Phone Number Format

**Status Code:** `400 Bad Request`

**When:** Phone number provided but doesn't match E.164 format

```json
{
  "statusCode": 400,
  "message": "Phone number must be in E.164 format (+234XXXXXXXXXX)",
  "error": "Bad Request"
}
```

---

#### Response 6: Error - Invalid Email Format

**Status Code:** `400 Bad Request`

**When:** Email provided but is not a valid email format

```json
{
  "statusCode": 400,
  "message": "email must be an email",
  "error": "Bad Request"
}
```

---

#### Response 7: Error - Registration Status Inconsistent

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

**Option 1: Using Email**
```json
{
  "email": "user@example.com",
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

**Option 2: Using Phone Number**
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
- Either `email` OR `phone_number` must be provided (at least one required)
- `email`: Optional, must be a valid email format
- `phone_number`: Optional, must match E.164 format `^\+234[0-9]{10}$`
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

#### Response 2: Error - Missing Identifier

**Status Code:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Either email or phone_number must be provided",
  "error": "Bad Request"
}
```

---

#### Response 2b: Error - Invalid Phone Number Format

**Status Code:** `400 Bad Request`

**When:** Phone number provided but doesn't match E.164 format

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

**Status Code:** `200 OK` (using ApiResponseDto format)

```json
{
  "success": false,
  "message": "password not set. Please reset your password.",
  "data": {
    "attempts_remaining": 3
  }
}
```

---

#### Response 5: Error - Invalid Password (With Attempt Count)

**Status Code:** `200 OK` (using ApiResponseDto format)

**When:** Password is incorrect but account is not suspended

```json
{
  "success": false,
  "message": "invalid credentials",
  "data": {
    "attempts_remaining": 2,
    "max_attempts": 3,
    "message": "Invalid password. 2 attempts remaining before account suspension."
  }
}
```

**App Action:** 
- Display attempt count to user
- Show warning message
- Update UI to show remaining attempts

**Note:** 
- Returns attempt count so app can display to user
- If attempts reach `max_attempts`, account will be suspended
- Attempts reset after successful login or after the attempt window expires (default: 15 minutes)

---

#### Response 6: Error - Account Suspended (Max Attempts Reached)

**Status Code:** `200 OK` (using ApiResponseDto format)

**When:** User has reached max password attempts and account is suspended

```json
{
  "success": false,
  "message": "Your account has been suspended due to 3 failed login attempts. Please contact support for assistance.",
  "data": {
    "account_suspended": true,
    "attempts_remaining": 0,
    "max_attempts": 3
  }
}
```

**App Action:** 
- Show message that account is suspended
- Direct user to contact support
- Disable password entry field

---

#### Response 7: Error - Account Already Suspended

**Status Code:** `200 OK` (using ApiResponseDto format)

**When:** User tries to login but account is already suspended

```json
{
  "success": false,
  "message": "Your account has been suspended due to multiple failed login attempts. Please contact support for assistance.",
  "data": {
    "account_suspended": true,
    "attempts_remaining": 0
  }
}
```

---

## Login Flow Diagram

```
User enters email OR phone number
         ↓
POST /auth/check-login-status
         ↓
    ┌────┴────┐
    │         │
    ↓         ↓
  Email    Phone
    │         │
    ↓         ↓
Check    Check
User     RegistrationProgress
Table    ┌───┴───┐
    │     │       │
    ↓     ↓       ↓
Found  No reg  Reg found
    │   found   ┌───┴───┐
    │     │     │       │
    ↓     ↓     ↓       ↓
Show   Start  Incomplete Complete
Password Reg  (is_complete=false) (is_complete=true)
Screen Screen  │       │
    │     │     ↓       ↓
    │     │   Show    Show
    │     │   Reg     Password
    │     │   Step    Entry Screen
    │     │     │       │
    │     └─────┴───┬───┘
    │               │
    └───────────┬───┘
                ↓
    POST /auth/verify-password
    (with email OR phone_number)
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

1. **Login Identifiers:** Users can login using either:
   - **Email:** Must be a valid email format (e.g., `user@example.com`)
   - **Phone Number:** Must be in E.164 format: `+234XXXXXXXXXX` (13 characters total)
   - At least one identifier must be provided in each request

2. **Access Token:** The access token from `verify-password` should be included in subsequent authenticated requests:
   ```
   Authorization: Bearer <access_token>
   ```

3. **Token Expiration:** Token expiration is configured via `JWT_EXPIRES_IN` environment variable (default: `7d`)

4. **Device Tracking:** Device metadata is automatically tracked when provided. This helps with security and device management.

5. **Password Attempt Tracking:**
   - Failed password attempts are tracked per user
   - Default max attempts: `3` (configurable via `MAX_PASSWORD_TRIAL` env var)
   - Attempt window: `15 minutes` (configurable via `PASSWORD_ATTEMPT_WINDOW_MINUTES` env var)
   - After max attempts, account is automatically suspended
   - Attempts are cleared on successful login
   - Attempts reset after the attempt window expires
   - Suspended accounts must contact support to be reactivated

6. **Account Suspension:**
   - Accounts are suspended when max password attempts are reached
   - Suspended accounts cannot login
   - User must contact support to reactivate account
   - Support can change `account_status` from `suspended` to `active` in the database

---

## Example cURL Requests

### Check Login Status (Using Email)

```bash
curl -X POST http://localhost:3000/auth/check-login-status \
  -H "Content-Type: application/json" \
  -H "x-request-id: unique-request-id" \
  -H "x-timestamp: 1234567890" \
  -d '{
    "email": "user@example.com"
  }'
```

### Check Login Status (Using Phone Number)

```bash
curl -X POST http://localhost:3000/auth/check-login-status \
  -H "Content-Type: application/json" \
  -H "x-request-id: unique-request-id" \
  -H "x-timestamp: 1234567890" \
  -d '{
    "phone_number": "+2341234567890"
  }'
```

### Verify Password (Using Email)

```bash
curl -X POST http://localhost:3000/auth/verify-password \
  -H "Content-Type: application/json" \
  -H "x-request-id: unique-request-id" \
  -H "x-timestamp: 1234567890" \
  -H "x-device-id: device-123" \
  -H "platform: ios" \
  -d '{
    "email": "user@example.com",
    "password": "userpassword123",
    "device_metadata": {
      "device_id": "device-123",
      "platform": "ios",
      "device_name": "John iPhone",
      "os_version": "17.2"
    }
  }'
```

### Verify Password (Using Phone Number)

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


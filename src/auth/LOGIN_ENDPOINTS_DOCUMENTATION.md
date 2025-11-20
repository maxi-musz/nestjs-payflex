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
        "status": "completed",
        "completed": true,
        "verified": true,
        "name": "Phone Registration"
      },
      "step_2": {
        "status": "completed",
        "completed": true,
        "verified": true,
        "name": "OTP Verification",
        "is_phone_verified": true
      },
      "step_3": {
        "status": "pending",
        "completed": true,
        "verified": false,
        "name": "ID Information",
        "id_type": "NIN",
        "id_number": "123***890",
        "verification_status": "pending",
        "verification_provider": "dojah"
      },
      "step_4": {
        "status": "not_started",
        "completed": false,
        "verified": false,
        "name": "Face Verification",
        "verification_status": null
      },
      "step_5": {
        "status": "not_started",
        "completed": false,
        "verified": false,
        "name": "Residential Address"
      }
      // ... other steps follow same pattern
    },
    "registration_data": {
      "phone_number": "+2341234567890",
      "referral_code": "ABC123",
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    },
    "message": "ID verification is pending. Please wait for verification to complete.",
    // OTP fields (only present when current_step === 2)
    "otp_sent": true,
    "otp_expires_in": 300
  }
}
```

**Note:** When `current_step === 2` (OTP Verification), the backend automatically sends an OTP if:
- No OTP exists, OR
- Existing OTP has expired

The response will include `otp_sent: true` and `otp_expires_in` (seconds remaining) so the app can display the countdown timer immediately.
```

**Key Fields for App Decision Making:**
- `has_registration_progress`: **CRITICAL** - If `true`, user has existing registration - DO NOT redirect to step 1
- `current_step`: Current step number (1-9) - Use this to determine which screen to show
- `next_step`: Next step key - Where user should navigate after completing current step
- `can_proceed`: Whether user can proceed to next step
- `is_step_X_pending`: Boolean flag for each step (1-9) indicating if that step is pending verification
- `step_X_verification_status`: Verification status for steps that require verification (2, 3, 4) - Values: `"verified"`, `"pending"`, `"failed"`, or `null`
- `registration_completed`: If `false`, registration is still in progress - DO NOT treat as "no registration"

**Step Status Values (NEW):**
Each step in the `steps` object now includes a `status` field with one of three values:
- `"not_started"`: Step has not been started yet (default state)
- `"pending"`: Step has been submitted but is waiting for verification (e.g., ID verification pending)
- `"completed"`: Step has been completed and verified (if verification is required)

**Step Status Logic:**
- Use `status` field to determine the visual state of each step in the UI
- `status: "pending"` means show a "pending verification" screen
- `status: "completed"` means step is done, user can proceed
- `status: "not_started"` means step hasn't been started yet

**⚠️ IMPORTANT App Logic:**
```typescript
// CRITICAL: Check has_registration_progress FIRST
if (response.data.has_registration_progress && !response.data.registration_completed) {
  // User has existing registration in progress
  const currentStep = response.data.current_step;
  const stepData = response.data.steps[`step_${currentStep}`];
  const stepStatus = stepData?.status; // 'not_started', 'pending', or 'completed'
  const isPending = response.data[`is_step_${currentStep}_pending`];
  
  // Use step status to determine what to show
  if (stepStatus === 'pending' || isPending) {
    // Show verification pending screen for current step
    showVerificationPendingScreen(currentStep);
  } else if (stepStatus === 'not_started' || !response.data.can_proceed) {
    // Show entry form for current step
    showStepEntryForm(currentStep);
  } else if (stepStatus === 'completed' && response.data.can_proceed) {
    // Step completed, can proceed to next step
    navigateToStep(response.data.next_step);
  } else {
    // Fallback: show entry form for current step
    showStepEntryForm(currentStep);
  }
} else if (!response.data.has_registration_progress) {
  // No registration found - start from step 1
  navigateToStep('START_REGISTRATION');
} else {
  // Registration completed - show password screen
  showPasswordScreen();
}
```

**Step Status Decision Tree:**
```
Check step status:
├─ "not_started" → Show entry form for this step
├─ "pending" → Show verification pending screen
└─ "completed" → 
    ├─ can_proceed: true → Navigate to next_step
    └─ can_proceed: false → Show entry form (shouldn't happen, but handle gracefully)
```

**Common App Mistakes to Avoid:**
1. ❌ **DON'T** redirect to step 1 just because `registration_completed: false`
2. ❌ **DON'T** ignore `has_registration_progress: true`
3. ❌ **DON'T** use only `completed` boolean - use `status` field instead
4. ✅ **DO** check `has_registration_progress` first
5. ✅ **DO** use `current_step` to determine which screen to show
6. ✅ **DO** check `status` field in `steps.step_X` object for step state
7. ✅ **DO** check `is_step_X_pending` as a fallback for pending detection
8. ✅ **DO** use `status: "pending"` to show verification pending screens
9. ✅ **DO** use `status: "completed"` + `can_proceed` to navigate to next step

**App Action:** Show the appropriate registration step screen based on `current_step` and `next_step`

**Auto-OTP Feature:**
When `current_step === 2` (OTP Verification), the backend automatically:
- Checks if OTP exists and is valid
- If no OTP or expired, automatically generates and sends a new OTP
- Returns `otp_sent: true` and `otp_expires_in` in the response

**App should:**
- Display the OTP countdown timer immediately using `otp_expires_in`
- No need to call "resend OTP" endpoint - OTP is already sent
- User can still manually resend if needed (respects rate limiting)

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

## Step Status System

### Understanding Step Status

Each registration step now has a `status` field that indicates its current state:

| Status | Meaning | App Action |
|--------|---------|------------|
| `"not_started"` | Step hasn't been started yet | Show entry form for this step |
| `"pending"` | Step submitted, waiting for verification | Show "verification pending" screen |
| `"completed"` | Step completed and verified (if required) | User can proceed to next step |

### Step Status Examples

**Example 1: Step 3 (ID Information) - Pending Verification**
```json
{
  "step_3": {
    "status": "pending",
    "completed": true,
    "verified": false,
    "name": "ID Information",
    "verification_status": "pending"
  }
}
```
**App should:** Show "ID verification pending" screen with message to wait

**Example 2: Step 3 (ID Information) - Completed**
```json
{
  "step_3": {
    "status": "completed",
    "completed": true,
    "verified": true,
    "name": "ID Information",
    "verification_status": "verified"
  }
}
```
**App should:** Allow user to proceed to step 4 (Face Verification)

**Example 3: Step 4 (Face Verification) - Not Started**
```json
{
  "step_4": {
    "status": "not_started",
    "completed": false,
    "verified": false,
    "name": "Face Verification"
  }
}
```
**App should:** Show face verification entry form

### Migration from Old System

If you were using the old boolean `completed` field:
- ✅ **Use `status` field instead** - it's more descriptive
- ✅ **Keep `completed` boolean for backward compatibility** - but prefer `status`
- ✅ **Use `status: "pending"`** instead of checking `completed: true && verified: false`

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


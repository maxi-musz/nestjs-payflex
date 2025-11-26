# Email OTP Endpoints Documentation

## 1. Request Email OTP

**Endpoint:** `POST /auth/request-email-otp`  
**Description:** Requests a 4-digit OTP code to be sent to the user's email address. The OTP expires after 5 minutes.

### Request Payload

```json
{
  "email": "user@example.com"
}
```

**Validation Rules:**
- `email`: Required, must be a valid email address format

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "OTP successfully sent to: user@example.com"
}
```

### Error Responses

**Status Code:** `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Status Code:** `500 Internal Server Error`

```json
{
  "statusCode": 500,
  "message": "Failed to process OTP request: [error details]",
  "error": "Internal Server Error"
}
```

### Notes

- The OTP is a 4-digit code (1000-9999)
- OTP expires 5 minutes after generation
- OTP is stored in the database and sent via email
- User must exist in the database before requesting OTP

---

## 2. Verify Email OTP

**Endpoint:** `POST /auth/verify-email-otp`  
**Description:** Verifies the OTP code sent to the user's email. Upon successful verification, the user's email is marked as verified (`is_email_verified = true`).

### Request Payload

```json
{
  "email": "user@example.com",
  "otp": "1234"
}
```

**Validation Rules:**
- `email`: Required, must be a valid email address format
- `otp`: Required, must be exactly 4 characters (digits only)

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Error Responses

**Status Code:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Invalid or expired OTP provided",
  "error": "Bad Request"
}
```

**Status Code:** `500 Internal Server Error`

```json
{
  "statusCode": 500,
  "message": "Email verification failed",
  "error": "Internal Server Error"
}
```

### Notes

- OTP must match the one stored in the database for the user
- OTP must not be expired (checked against `otp_expires_at`)
- Upon successful verification:
  - `is_email_verified` is set to `true`
  - OTP is cleared from the database
- If OTP is invalid or expired, a `400 Bad Request` error is returned

---

## Example Usage Flow

### Step 1: Request OTP

```bash
POST /auth/request-email-otp
Content-Type: application/json

{
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP successfully sent to: john.doe@example.com"
}
```

### Step 2: Verify OTP

```bash
POST /auth/verify-email-otp
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "otp": "5678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

## Related Endpoints

These endpoints are also used for password reset:

- `POST /auth/request-password-reset-email` - Uses the same `requestEmailOTP` service method
- `POST /auth/verify-password-reset-email` - Uses the same `verifyEmailOTP` service method

The implementation is identical; they use the same underlying service methods with different context (`signup` vs `resetPassword`).


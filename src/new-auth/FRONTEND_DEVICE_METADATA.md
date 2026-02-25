# SmiPay API — Device Metadata & New Auth Reference

**Base URL:** `https://<your-host>/api/v1`  
**Content-Type:** `application/json`

All API requests must include the device metadata headers described in **Section 1**. **Section 2** documents the standard response envelope. **Section 3** documents the New Auth endpoints, including the **three-step registration flow** (request email verification → verify email with OTP → register with full payload).

---

## 1. Device metadata (required on every request)

Device metadata is captured from **HTTP headers only**. Send these headers on **every** request to `/api/v1/*` (auth, banking, transactions, profile, etc.).

### 1.1 Request headers

| Header | Required | Type | Description |
|--------|----------|------|-------------|
| `x-device-id` | **Yes** | string | Unique device identifier. Generate once per install and persist (e.g. Keychain, EncryptedSharedPreferences). Reuse for the app lifetime. |
| `x-device-fingerprint` | No | string | Device fingerprint from SDK, or same as `x-device-id`. |
| `x-device-name` | No | string | User-facing device name (e.g. `John's iPhone`). |
| `x-device-model` | No | string | Device model (e.g. `iPhone 14 Pro`). |
| `platform` | No | string | `ios` \| `android`. |
| `x-os-name` | No | string | OS name (e.g. `iOS`). |
| `x-os-version` | No | string | OS version (e.g. `17.2`). |
| `x-app-version` | No | string | App version (e.g. `1.2.0`). |
| `x-latitude` | **Recommended** | string | Device GPS latitude (e.g. `6.5244`). |
| `x-longitude` | **Recommended** | string | Device GPS longitude (e.g. `3.3792`). |

**Notes:**

- IP address is derived server-side. Do **not** send it from the client.
- If `x-device-id` is omitted, the request is still processed but no device metadata is stored.
- If `x-latitude` / `x-longitude` are omitted, the backend falls back to **IP-based geolocation** (less accurate, city-level). For best results, send GPS coordinates from the device.

### 1.2 Obtaining GPS coordinates (mobile)

**React Native (Expo):**

```javascript
import * as Location from 'expo-location';

async function getLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}
```

**React Native (react-native-geolocation-service):**

```javascript
import Geolocation from 'react-native-geolocation-service';

Geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // store and send as headers
  },
  (error) => console.log(error),
  { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
);
```

**Flutter:**

```dart
import 'package:geolocator/geolocator.dart';

final position = await Geolocator.getCurrentPosition(
  desiredAccuracy: LocationAccuracy.medium,
);
// position.latitude, position.longitude → send as headers
```

### 1.3 Example: attaching all headers (Axios)

```javascript
import DeviceInfo from 'react-native-device-info';
import * as Location from 'expo-location';

let cachedLocation = null;

async function refreshLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      cachedLocation = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    }
  } catch {}
}

// Refresh location on app start and periodically
refreshLocation();

const api = axios.create({
  baseURL: 'https://your-api.com/api/v1',
});

api.interceptors.request.use((config) => {
  config.headers['Content-Type'] = 'application/json';
  config.headers['x-device-id'] = getStoredDeviceId();
  config.headers['x-device-fingerprint'] = getStoredDeviceId();
  config.headers['x-device-name'] = DeviceInfo.getDeviceNameSync();
  config.headers['x-device-model'] = DeviceInfo.getModel();
  config.headers['platform'] = Platform.OS;               // 'ios' | 'android'
  config.headers['x-os-name'] = Platform.OS;
  config.headers['x-os-version'] = Platform.Version.toString();
  config.headers['x-app-version'] = DeviceInfo.getVersion();

  if (cachedLocation) {
    config.headers['x-latitude'] = cachedLocation.lat.toString();
    config.headers['x-longitude'] = cachedLocation.lng.toString();
  }

  return config;
});
```

**Do not** send device metadata in the request body; it is read only from headers.

---

## 2. Standard response envelope

All endpoints return a consistent envelope (except HTTP error responses):

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the operation succeeded. |
| `message` | string | Human-readable message. |
| `data` | object \| null | Present when the endpoint returns a payload; omitted or null otherwise. |

HTTP errors (4xx/5xx) use the NestJS format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

---

## 3. New Auth endpoints

All paths are relative to the base URL. Include the device metadata headers from **Section 1** on every request.

---

### 3.0 Registration flow (UI sequence)

Registration is a **three-step** flow. The backend requires the email to be verified **before** calling register.

| Step | UI action | Endpoint | Purpose |
|------|-----------|----------|---------|
| 1 | User enters email and clicks **Verify email** | `POST /new-auth/request-email-verification` | Check email is new, send OTP to email |
| 2 | User enters OTP received by email | `POST /new-auth/verify-email-for-registration` | Confirm OTP and mark email as verified |
| 3 | User submits full form (name, phone, password, etc.) | `POST /new-auth/register` | Create account **and auto-sign-in** (returns `access_token`) |

Email verification expires after **30 minutes**. If the user delays, they must run steps 1 and 2 again.

> **After step 3 succeeds, the user is signed in.** The register response includes `access_token` and `user` — same shape as the sign-in response. Navigate the user directly to the dashboard. **Do not** redirect to sign-in.

---

### 3.1 Request email verification

**Endpoint:** `POST /new-auth/request-email-verification`

Call this when the user clicks **Verify email** (e.g. next to the email field). The backend checks that the email is not already registered and sends an OTP to the address.

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email. |

**Example request:**

```json
{
  "email": "user@example.com"
}
```

**Success response (200):**

```json
{
  "success": true,
  "message": "OTP sent to user@example.com. Enter it to verify your email."
}
```

**Error responses:**

| statusCode | message |
|------------|---------|
| 409 | `This email is already registered. Please sign in.` |
| 400 | `Failed to send verification email. Please try again.` (e.g. mail send failed) |

OTP is valid for **5 minutes**. If the user does not receive it, call this endpoint again to get a new OTP.

---

### 3.2 Verify email for registration

**Endpoint:** `POST /new-auth/verify-email-for-registration`

Call this after the user enters the OTP they received. On success, the email is marked as verified and the user can submit the full registration form (step 3).

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Same email used in request-email-verification. |
| `otp` | string | Yes | Exactly 4 characters. |

**Example request:**

```json
{
  "email": "user@example.com",
  "otp": "1234"
}
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Email verified. You can now complete registration."
}
```

**Error responses:**

| statusCode | message |
|------------|---------|
| 400 | `Invalid or expired OTP. Request a new verification code.` |
| 400 | `Invalid or expired OTP provided` |

---

### 3.3 Register

**Endpoint:** `POST /new-auth/register`

**Prerequisite:** The email **must** have been verified first (steps 3.1 and 3.2). Otherwise the backend returns 400.

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email (must be already verified). |
| `password` | string | Yes | Min 6, max 64. |
| `first_name` | string | Yes | |
| `last_name` | string | Yes | |
| `phone_number` | string | Yes | |
| `agree_to_terms` | boolean | Yes | |
| `middle_name` | string | No | |
| `gender` | string | No | `male` \| `female`. |
| `referral_code` | string | No | |
| `country` | string | No | Creates address if provided. |
| `updates_opt_in` | boolean | No | Default `false`. |

**Example request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "Jane",
  "last_name": "Doe",
  "phone_number": "2348012345678",
  "agree_to_terms": true,
  "country": "Nigeria"
}
```

**Success response (200):** Account created and **user is automatically signed in**. The response has the **same shape as the sign-in endpoint** — it includes `access_token` and the full user object. **Do NOT redirect the user to the sign-in page.** Navigate them straight to the dashboard / home screen.

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": null,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "first_name": "Jane",
      "last_name": "Doe",
      "phone_number": "2348012345678",
      "is_email_verified": true,
      "role": "user",
      "gender": null,
      "date_of_birth": null,
      "profile_image": null,
      "kyc_verified": false,
      "isTransactionPinSetup": false,
      "has_completed_onboarding": false,
      "created_at": "Feb 25, 2026, 10:30 AM"
    }
  }
}
```

> **NOTE:** `has_completed_onboarding` will always be `false` for a freshly registered user. This is when you show the onboarding walkthrough (see Section 3.10).

> **IMPORTANT — Frontend behavior change:** The register endpoint now returns `access_token` and `user` (identical to sign-in). After a successful register call:
> 1. Store the `access_token` exactly as you would after sign-in.
> 2. Store the `user` object in your auth state / context.
> 3. Navigate the user directly to the **dashboard / home screen** — **NOT** the sign-in page.
> 4. The user is fully authenticated and ready to use the app.

**Error responses:**

| statusCode | message |
|------------|---------|
| 409 | `User already exists with this email` |
| 400 | `Please verify your email first using the code we sent you.` |
| 400 | `Email verification expired. Please verify your email again.` |

---

### 3.4 Verify email OTP (legacy / other flows)

**Endpoint:** `POST /new-auth/verify-email-otp`

Used in flows where a **user already exists** and has an OTP stored (e.g. legacy post-registration verification). For the main registration flow, use **3.2 Verify email for registration** instead.

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Same as used at register. |
| `otp` | string | Yes | Exactly 4 characters. |

**Success response (200):**

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Error response:** `400` — `Invalid or expired OTP provided`

---

### 3.5 Sign in

**Endpoint:** `POST /new-auth/signin`

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email. |
| `password` | string | Yes | Min 8, max 32. |

**Example request:**

```json
{
  "email": "user@example.com",
  "password": "myPassword123"
}
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Welcome back",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": null,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "first_name": "Jane",
      "last_name": "Doe",
      "phone_number": "2348012345678",
      "is_email_verified": true,
      "role": "user",
      "gender": null,
      "date_of_birth": null,
      "profile_image": null,
      "kyc_verified": false,
      "isTransactionPinSetup": false,
      "has_completed_onboarding": false,
      "created_at": "Feb 17, 2026, 10:30 AM"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `has_completed_onboarding` | boolean | `false` = show the onboarding walkthrough. `true` = user has already seen it, skip it. |

**Error response:**

| statusCode | message |
|------------|---------|
| 401 | `Invalid credentials` |

Use `access_token` in the `Authorization` header for protected endpoints:  
`Authorization: Bearer <access_token>`.

---

### 3.6 Forgot password (request OTP)

**Endpoint:** `POST /new-auth/forgot-password`

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |

**Example request:**

```json
{
  "email": "user@example.com"
}
```

**Success response (200):**

```json
{
  "success": true,
  "message": "OTP successfully sent to: user@example.com"
}
```

**Error response:**

| statusCode | message |
|------------|---------|
| 404 | `User not found` |

OTP expires in 5 minutes. On email delivery failure the backend may return `success: false` with an appropriate message.

---

### 3.7 Verify password reset OTP

**Endpoint:** `POST /new-auth/verify-password-reset-otp`

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | |
| `otp` | string | Yes | Exactly 4 characters. |

**Example request:**

```json
{
  "email": "user@example.com",
  "otp": "1234"
}
```

**Success response (200):**

```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Error response:**

| statusCode | message |
|------------|---------|
| 400 | `Invalid or expired OTP provided` |

---

### 3.8 Reset password

**Endpoint:** `POST /new-auth/reset-password`

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | |
| `otp` | string | Yes | Exactly 4 characters (from forgot-password flow). |
| `new_password` | string | Yes | Min 4, max 32. |

**Example request:**

```json
{
  "email": "user@example.com",
  "otp": "1234",
  "new_password": "newSecurePassword123"
}
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error response:**

| statusCode | message |
|------------|---------|
| 404 | `User not found` |
| 400 | `Invalid or expired OTP provided` |

On success, all existing sessions (refresh tokens) for the user are invalidated; the user must sign in again with the new password.

---

### 3.9 Complete Onboarding

**Endpoint:** `POST /new-auth/complete-onboarding`

**Auth:** `Authorization: Bearer <access_token>` (required)

Call this **once** after the user finishes the onboarding walkthrough (all steps dismissed). This ensures the onboarding is never shown again, even if the user signs in on a different device.

**Request body:** None.

**Example request:**

```bash
POST /api/v1/new-auth/complete-onboarding
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Onboarding completed",
  "data": {
    "has_completed_onboarding": true
  }
}
```

If already completed (idempotent):

```json
{
  "success": true,
  "message": "Onboarding already completed",
  "data": {
    "has_completed_onboarding": true
  }
}
```

#### Frontend onboarding flow

1. **On sign-in or register response:** check `user.has_completed_onboarding`.
2. **If `false`:** show the onboarding walkthrough on the dashboard:
   - **Step 1 — Welcome banner:** Professional welcome bar at the top with a close button.
   - **Step 2 — Wallet card tooltip:** Highlight the wallet balance area → "This is your account balance. Tap **Add Money** to fund your wallet."
   - **Step 3 — Quick links tooltip:** Shift highlight to Quick Links → "Buy airtime, data, and more from here."
   - **Step 4 — Support icon tooltip:** Shift highlight to the support icon → "Need help? Contact our support team here."
   - **On dismiss / final step:** Call `POST /new-auth/complete-onboarding`.
3. **If `true`:** Skip all of the above. Show the dashboard normally.

> The flag is stored server-side, so it persists across devices and reinstalls. Call the endpoint once when the user completes (or skips) the walkthrough.

---

### 3.10 Logout

**Endpoint:** `POST /new-auth/logout`

**Auth:** `Authorization: Bearer <access_token>` (required)

**Request body:** None.

**Example request:**

```bash
POST /api/v1/new-auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error response:**

| statusCode | message |
|------------|---------|
| 401 | `Unauthorized` (missing or invalid token) |

On success, all refresh tokens for the user are invalidated server-side. The frontend should also discard the stored `access_token` and `refresh_token` locally.

---

## 4. Geolocation — how it works

The backend captures the user's location through a **two-layer approach**:

| Layer | Source | Accuracy | When used |
|-------|--------|----------|-----------|
| **Primary** | Frontend GPS via `x-latitude` / `x-longitude` headers | High (street-level) | Whenever the frontend sends coordinates |
| **Fallback** | Server-side IP geolocation (`geoip-lite`) | Low (city-level) | When frontend headers are absent |

**What gets stored per audit log entry:**

| Field | Type | Example |
|-------|------|---------|
| `latitude` | float | `6.5244` |
| `longitude` | float | `3.3792` |
| `geo_location` | string | `Lagos, LA, NG` |
| `ip_address` | string | `105.112.45.67` |

**Frontend responsibility:**
- Request location permission on app start / first login.
- Cache the coordinates and send them as `x-latitude` / `x-longitude` on every request.
- If the user denies permission, omit the headers — the backend will fall back to IP geolocation.
- Refresh coordinates periodically (e.g. every 5 minutes or on app foreground).

---

## 5. Summary

| Item | Requirement |
|------|-------------|
| **Registration** | 1) Request email verification → 2) Verify email for registration (OTP) → 3) Register with full payload → **user is auto-signed-in** (response includes `access_token`). Navigate to dashboard, not sign-in. |
| **Onboarding** | After sign-in or register, check `user.has_completed_onboarding`. If `false`, show the walkthrough. When user finishes, call `POST /new-auth/complete-onboarding`. |
| **Device headers** | Send `x-device-id` (and optional headers from Section 1.1) on **every** request. |
| **Geolocation** | Send `x-latitude` / `x-longitude` headers for precise location tracking. If omitted, the backend falls back to IP-based city-level geolocation. |
| **Body** | Do not send device metadata in the request body. |
| **Auth** | After sign in, send `Authorization: Bearer <access_token>` on protected requests. |
| **Response** | Use the envelope `success`, `message`, and optional `data` for all success responses; use `statusCode` and `message` for errors. |

---

**Document version:** 1.6  
**Last updated:** 2026-02-25

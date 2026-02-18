# SmiPay API — Device Metadata & New Auth Reference

**Base URL:** `https://<your-host>/api/v1`  
**Content-Type:** `application/json`

All API requests must include the device metadata headers described in **Section 1**. The **Section 2** section documents the standard response envelope. **Section 3** documents the New Auth endpoints with full request payload and response structures as implemented.

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

### 3.1 Register

**Endpoint:** `POST /new-auth/register`

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email. |
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

**Success response (201):** Account created and OTP sent.

```json
{
  "success": true,
  "message": "Enter the OTP sent to your email to verify",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "Jane",
      "last_name": "Doe"
    }
  }
}
```

**Success response when email send fails:** Account still created; user should use forgot password or support.

```json
{
  "success": false,
  "message": "Account created but failed to send verification email. Please use forgot password or contact support.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "Jane",
      "last_name": "Doe"
    }
  }
}
```

**Error response:**

| statusCode | message |
|------------|---------|
| 409 | `User already exists with this email` |

---

### 3.2 Verify email OTP

**Endpoint:** `POST /new-auth/verify-email-otp`

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Same as used at register. |
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
  "message": "Email verified successfully"
}
```

**Error response:**

| statusCode | message |
|------------|---------|
| 400 | `Invalid or expired OTP provided` |

---

### 3.3 Sign in

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
      "created_at": "Feb 17, 2026, 10:30 AM"
    }
  }
}
```

**Error response:**

| statusCode | message |
|------------|---------|
| 401 | `Invalid credentials` |

Use `access_token` in the `Authorization` header for protected endpoints:  
`Authorization: Bearer <access_token>`.

---

### 3.4 Forgot password (request OTP)

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

### 3.5 Verify password reset OTP

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

### 3.6 Reset password

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

### 3.7 Logout

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
| **Device headers** | Send `x-device-id` (and optional headers from Section 1.1) on **every** request. |
| **Geolocation** | Send `x-latitude` / `x-longitude` headers for precise location tracking. If omitted, the backend falls back to IP-based city-level geolocation. |
| **Body** | Do not send device metadata in the request body. |
| **Auth** | After sign in, send `Authorization: Bearer <access_token>` on protected requests. |
| **Response** | Use the envelope `success`, `message`, and optional `data` for all success responses; use `statusCode` and `message` for errors. |

---

**Document version:** 1.3  
**Last updated:** 2026-02

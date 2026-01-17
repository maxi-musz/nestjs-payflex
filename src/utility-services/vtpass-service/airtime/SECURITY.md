# Security Best Practices for Fintech Applications

## Overview
This document outlines security best practices for protecting sensitive financial operations in PayFlex, following industry standards used by major fintech companies (Stripe, PayPal, Square, etc.).

**Structure**: Each security measure includes:
- **Why**: The benefit and purpose
- **What it does**: How it protects your application
- **Frontend (Mobile App)**: What to implement in React Native
- **Backend**: What to implement on your server
- **Data Flow**: What data is sent between frontend and backend

---

## 🔐 1. Authentication & Authorization

### Current Implementation
- ✅ JWT tokens stored in SecureStore
- ✅ App PIN for device access
- ✅ Token expiration handling

---

### 1.1 Transaction PIN Verification

#### Why (Benefit)
- **Prevents unauthorized transactions** even if someone gains access to the device
- **Adds an extra layer of security** beyond app PIN (which only unlocks the app)
- **Industry standard** - All major fintech apps require transaction PIN for money operations
- **Compliance requirement** - Many financial regulations require additional authentication for transactions

#### What It Does
- Requires user to enter a separate PIN (different from app unlock PIN) before executing any financial transaction
- Backend verifies PIN matches user's stored hashed PIN before processing transaction
- Locks account after multiple failed attempts to prevent brute force attacks
- Creates audit trail of all PIN verification attempts

#### Frontend (Mobile App) Implementation

**Step 1: Collect Transaction PIN from User**
```typescript
// When user initiates a transaction (transfer, airtime purchase, etc.)
// Show PIN input modal BEFORE making API call

import { useState } from 'react';
import { Modal, TextInput, Alert } from 'react-native';

const [showPinModal, setShowPinModal] = useState(false);
const [transactionPin, setTransactionPin] = useState('');

// In your transfer handler:
const handleTransfer = async () => {
  // Validate inputs first
  if (!amount || !accountNumber) {
    Alert.alert('Error', 'Please fill all fields');
    return;
  }
  
  // Show PIN modal instead of directly calling API
  setShowPinModal(true);
};

// PIN confirmation handler
const handleConfirmWithPin = async (pin: string) => {
  setShowPinModal(false);
  
  try {
    // Include PIN in request
    const response = await fetch(`${API_URL}/banking/send-ngn-money`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Transaction-PIN': pin, // Send PIN in header
      },
      body: JSON.stringify({
        amount: parseFloat(amount),
        account_number: accountNumber,
        bank_code: selectedBank.code,
        narration: remark
      })
    });
    
    const data = await response.json();
    // Handle response
  } catch (error) {
    Alert.alert('Error', 'Transaction failed');
  }
};
```

**Step 2: Store Transaction PIN Setup**
```typescript
// When user sets up transaction PIN (separate from app PIN)
import * as SecureStore from 'expo-secure-store';

const setupTransactionPin = async (pin: string) => {
  // Send to backend to hash and store
  const response = await fetch(`${API_URL}/user/setup-transaction-pin`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin })
  });
  
  // Backend will hash the PIN before storing
  // Never store PIN in plaintext on device
};
```

**What Frontend Sends to Backend:**
```
POST /banking/send-ngn-money
Headers:
  Authorization: Bearer <jwt_token>
  X-Transaction-PIN: "1234"  // Plain PIN (will be hashed on backend)
  Content-Type: application/json
Body:
  {
    "amount": 50000,
    "account_number": "1234567890",
    "bank_code": "058",
    "narration": "Payment"
  }
```

#### Backend Implementation

**Step 1: Store Transaction PIN (Hashed)**
```javascript
// When user sets up transaction PIN
const bcrypt = require('bcrypt');

app.post('/user/setup-transaction-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;
  const userId = req.user.id;
  
  // Hash PIN before storing (NEVER store plaintext)
  const saltRounds = 10;
  const hashedPin = await bcrypt.hash(pin, saltRounds);
  
  // Store in database
  await User.update(
    { transactionPinHash: hashedPin },
    { where: { id: userId } }
  );
  
  res.json({ success: true, message: 'Transaction PIN set successfully' });
});
```

**Step 2: Verify Transaction PIN on Every Sensitive Operation**
```javascript
// Middleware to verify transaction PIN
async function verifyTransactionPin(req, res, next) {
  const transactionPin = req.headers['x-transaction-pin'];
  const userId = req.user.id;
  
  if (!transactionPin) {
    return res.status(401).json({ 
      success: false, 
      message: 'Transaction PIN is required' 
    });
  }
  
  // Get user's stored PIN hash
  const user = await User.findById(userId);
  if (!user.transactionPinHash) {
    return res.status(403).json({ 
      success: false, 
      message: 'Transaction PIN not set. Please set up your transaction PIN.' 
    });
  }
  
  // Verify PIN
  const isValid = await bcrypt.compare(transactionPin, user.transactionPinHash);
  
  if (!isValid) {
    // Track failed attempts
    await incrementFailedPinAttempts(userId);
    const attempts = await getFailedPinAttempts(userId);
    
    // Lock account after 5 failed attempts
    if (attempts >= 5) {
      await lockUserAccount(userId);
      return res.status(403).json({ 
        success: false, 
        message: 'Account locked due to multiple failed PIN attempts. Please contact support.' 
      });
    }
    
    // Log security event
    await logSecurityEvent({
      userId,
      event: 'failed_pin_attempt',
      ipAddress: req.ip,
      timestamp: new Date()
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid transaction PIN',
      remainingAttempts: 5 - attempts
    });
  }
  
  // PIN is valid - reset failed attempts counter
  await resetFailedPinAttempts(userId);
  
  // Log successful verification
  await logSecurityEvent({
    userId,
    event: 'pin_verified',
    ipAddress: req.ip,
    timestamp: new Date()
  });
  
  next(); // Proceed to transaction handler
}

// Apply to sensitive endpoints
app.post('/banking/send-ngn-money', authenticateToken, verifyTransactionPin, async (req, res) => {
  // Transaction PIN already verified by middleware
  const { amount, account_number, bank_code, narration } = req.body;
  
  // Process transaction...
});
```

**What Backend Returns:**
```json
// Success:
{
  "success": true,
  "data": {
    "transaction_id": "txn_123456",
    "status": "completed",
    "amount": 50000
  }
}

// Failed PIN:
{
  "success": false,
  "message": "Invalid transaction PIN",
  "remainingAttempts": 3
}

// Account Locked:
{
  "success": false,
  "message": "Account locked due to multiple failed PIN attempts"
}
```

**Backend Requirements:**
- Hash PIN using bcrypt (salt rounds: 10-12)
- Store only hashed PIN, never plaintext
- Track failed PIN attempts per user
- Lock account after 5 failed attempts
- Log all PIN verification attempts (success and failure)
- Reset failed attempts counter on successful verification
- Implement account unlock mechanism (admin or OTP-based)

---

### 1.2 Request Signing (HMAC Signature)

#### Why (Benefit)
- **Prevents request tampering** - If someone intercepts and modifies the request, signature won't match
- **Prevents replay attacks** - Even if someone captures a valid request, they can't replay it later
- **Ensures request integrity** - Verifies the request hasn't been altered in transit
- **Industry standard** - Used by Stripe, PayPal, and all major payment processors

#### What It Does
- Creates a cryptographic signature (HMAC) of the entire request using a secret key
- Backend recalculates the signature and compares - if they don't match, request is rejected
- Includes timestamp and nonce to prevent replay attacks
- Ensures only requests from your legitimate app are accepted

#### Frontend (Mobile App) Implementation

**Step 1: Generate Request Signature**
```typescript
// src/utils/security.ts
import CryptoJS from 'crypto-js';

export async function generateRequestSignature(
  method: string,
  endpoint: string,
  body: any,
  timestamp: number,
  nonce: string
): Promise<string> {
  // Get client secret (stored securely on device)
  const clientSecret = await SecureStore.getItemAsync('client_secret');
  if (!clientSecret) {
    // Generate and store on first use
    const newSecret = generateRandomString(32);
    await SecureStore.setItemAsync('client_secret', newSecret);
    // Also send to backend to register this device
    await registerDeviceSecret(newSecret);
  }
  
  // Create message to sign
  const bodyString = body ? JSON.stringify(body) : '';
  const message = `${method}${endpoint}${timestamp}${nonce}${bodyString}`;
  
  // Generate HMAC-SHA256 signature
  const signature = CryptoJS.HmacSHA256(message, clientSecret).toString();
  
  return signature;
}

// Generate nonce (one-time random string)
export function generateNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
```

**Step 2: Include Signature in All Sensitive Requests**
```typescript
// src/services/secureApi.ts
import { generateRequestSignature, generateNonce } from '@/utils/security';

export async function secureApiFetch(
  endpoint: string,
  method: string = 'POST',
  body: any
): Promise<Response> {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const signature = await generateRequestSignature(method, endpoint, body, timestamp, nonce);
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Timestamp': timestamp.toString(),
      'X-Nonce': nonce,
      'X-Signature': signature,
      'X-Request-ID': generateRequestId(), // For idempotency
    },
    body: JSON.stringify(body)
  });
  
  return response;
}
```

**What Frontend Sends to Backend:**
```
POST /banking/send-ngn-money
Headers:
  Authorization: Bearer <jwt_token>
  X-Transaction-PIN: "1234"
  X-Timestamp: "1705312800000"        // Current timestamp in milliseconds
  X-Nonce: "1705312800000-abc123xyz"  // Unique one-time string
  X-Signature: "a1b2c3d4e5f6..."      // HMAC-SHA256 signature
  X-Request-ID: "req_123456"          // For idempotency
  Content-Type: application/json
Body:
  {
    "amount": 50000,
    "account_number": "1234567890",
    "bank_code": "058"
  }
```

#### Backend Implementation

**Step 1: Verify Request Signature**
```javascript
// Middleware to verify request signature
const crypto = require('crypto');

async function verifyRequestSignature(req, res, next) {
  const timestamp = parseInt(req.headers['x-timestamp']);
  const nonce = req.headers['x-nonce'];
  const signature = req.headers['x-signature'];
  const userId = req.user.id;
  const deviceId = req.headers['x-device-id'] || 'unknown';
  
  // 1. Validate timestamp (not older than 5 minutes)
  const now = Date.now();
  const timeDiff = Math.abs(now - timestamp);
  if (timeDiff > 5 * 60 * 1000) { // 5 minutes
    return res.status(401).json({ 
      success: false, 
      message: 'Request expired' 
    });
  }
  
  // 2. Check nonce hasn't been used (prevent replay)
  const nonceKey = `nonce:${userId}:${nonce}`;
  const nonceUsed = await redis.get(nonceKey);
  if (nonceUsed) {
    return res.status(401).json({ 
      success: false, 
      message: 'Replay attack detected' 
    });
  }
  // Store nonce for 10 minutes
  await redis.setex(nonceKey, 600, '1');
  
  // 3. Get client secret for this device
  const device = await Device.findOne({ userId, deviceId });
  if (!device || !device.clientSecret) {
    return res.status(401).json({ 
      success: false, 
      message: 'Device not registered' 
    });
  }
  
  // 4. Recalculate signature
  const bodyString = JSON.stringify(req.body);
  const message = `${req.method}${req.path}${timestamp}${nonce}${bodyString}`;
  const expectedSignature = crypto
    .createHmac('sha256', device.clientSecret)
    .update(message)
    .digest('hex');
  
  // 5. Compare signatures (use constant-time comparison to prevent timing attacks)
  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    // Log security event
    await logSecurityEvent({
      userId,
      event: 'invalid_signature',
      ipAddress: req.ip,
      deviceId,
      timestamp: new Date()
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid request signature' 
    });
  }
  
  // Signature is valid
  next();
}

// Apply to sensitive endpoints
app.post('/banking/send-ngn-money', 
  authenticateToken, 
  verifyRequestSignature, 
  verifyTransactionPin, 
  async (req, res) => {
    // Process transaction...
  }
);
```

**Step 2: Register Device Secret**
```javascript
// When app first generates client secret, register it with backend
app.post('/device/register', authenticateToken, async (req, res) => {
  const { clientSecret, deviceId, deviceFingerprint } = req.body;
  const userId = req.user.id;
  
  // Store device and its secret
  await Device.upsert({
    userId,
    deviceId,
    clientSecret, // Store securely (encrypted in database)
    deviceFingerprint,
    registeredAt: new Date(),
    lastSeenAt: new Date()
  });
  
  res.json({ success: true });
});
```

**What Backend Returns:**
```json
// Success (no special response, just normal transaction response):
{
  "success": true,
  "data": { "transaction_id": "txn_123" }
}

// Invalid Signature:
{
  "success": false,
  "message": "Invalid request signature"
}

// Replay Attack:
{
  "success": false,
  "message": "Replay attack detected"
}

// Expired Request:
{
  "success": false,
  "message": "Request expired"
}
```

**Backend Requirements:**
- Store client secret per device (encrypted in database)
- Verify timestamp is within 5-minute window
- Store nonces in Redis/cache (expire after 10 minutes)
- Use constant-time comparison for signatures (prevent timing attacks)
- Log all signature verification failures
- Support device registration endpoint

---

### 2.2 Idempotency Keys

#### Why (Benefit)
- **Prevents duplicate transactions** - If network fails and user retries, same transaction won't be processed twice
- **Handles retries safely** - User can safely retry failed requests without creating duplicates
- **Critical for financial operations** - Prevents double-charging or double-payments
- **Industry standard** - Used by Stripe, PayPal, and all payment processors

#### What It Does
- Each transaction request gets a unique idempotency key
- Backend stores the key with the transaction result
- If same key is used again, backend returns the same result (doesn't process again)
- Keys expire after 24-48 hours

#### Frontend (Mobile App) Implementation

**Step 1: Generate Idempotency Key**
```typescript
// src/utils/security.ts
export function generateIdempotencyKey(
  userId: string,
  operation: string,
  data: any
): string {
  const timestamp = Date.now();
  const dataHash = simpleHash(JSON.stringify(data));
  return `${userId}-${operation}-${timestamp}-${dataHash}`;
}

// Usage in transfer:
const idempotencyKey = generateIdempotencyKey(
  userId,
  'transfer',
  { amount, account_number, bank_code }
);
```

**Step 2: Include in All Transaction Requests**
```typescript
// src/services/secureApi.ts
export async function secureTransfer(data: any) {
  const idempotencyKey = generateIdempotencyKey(
    userId,
    'transfer',
    data
  );
  
  const response = await fetch(`${API_URL}/banking/send-ngn-money`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Transaction-PIN': data.transactionPin,
      'Idempotency-Key': idempotencyKey, // Include idempotency key
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  return response;
}
```

**What Frontend Sends to Backend:**
```
POST /banking/send-ngn-money
Headers:
  Authorization: Bearer <jwt_token>
  X-Transaction-PIN: "1234"
  Idempotency-Key: "user123-transfer-1705312800000-abc123"  // Unique per transaction
  Content-Type: application/json
Body:
  {
    "amount": 50000,
    "account_number": "1234567890",
    "bank_code": "058"
  }
```

#### Backend Implementation

**Step 1: Check and Store Idempotency Key**
```javascript
// Middleware to handle idempotency
const redis = require('redis'); // Or use database

async function handleIdempotency(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    // For sensitive operations, require idempotency key
    return res.status(400).json({ 
      success: false, 
      message: 'Idempotency-Key header is required' 
    });
  }
  
  // Check if we've seen this key before
  const cachedResponse = await redis.get(`idempotency:${idempotencyKey}`);
  
  if (cachedResponse) {
    // Return cached response (same transaction was already processed)
    const response = JSON.parse(cachedResponse);
    return res.status(response.statusCode).json(response.body);
  }
  
  // Store idempotency key in request for later use
  req.idempotencyKey = idempotencyKey;
  next();
}

// After processing transaction, store response
app.post('/banking/send-ngn-money', 
  authenticateToken, 
  verifyRequestSignature, 
  verifyTransactionPin,
  handleIdempotency, // Add idempotency middleware
  async (req, res) => {
    try {
      // Process transaction
      const transaction = await processTransfer(req.body);
      
      // Store response with idempotency key (expires in 48 hours)
      const responseData = {
        statusCode: 200,
        body: {
          success: true,
          data: transaction
        }
      };
      
      await redis.setex(
        `idempotency:${req.idempotencyKey}`, 
        48 * 60 * 60, // 48 hours
        JSON.stringify(responseData)
      );
      
      res.json(responseData.body);
    } catch (error) {
      // Also cache error responses
      const errorResponse = {
        statusCode: error.statusCode || 500,
        body: {
          success: false,
          message: error.message
        }
      };
      
      await redis.setex(
        `idempotency:${req.idempotencyKey}`, 
        48 * 60 * 60,
        JSON.stringify(errorResponse)
      );
      
      res.status(errorResponse.statusCode).json(errorResponse.body);
    }
  }
);
```

**What Backend Returns:**
```json
// First request (processes transaction):
{
  "success": true,
  "data": {
    "transaction_id": "txn_123456",
    "status": "completed"
  }
}

// Duplicate request with same idempotency key (returns cached response):
{
  "success": true,
  "data": {
    "transaction_id": "txn_123456",  // Same transaction ID
    "status": "completed"
  }
}
```

**Backend Requirements:**
- Store idempotency keys in Redis or database
- Cache both success and error responses
- Expire keys after 24-48 hours
- Return exact same response for duplicate keys
- Use idempotency key as part of transaction identifier

---

### 2.3 Device Fingerprinting

#### Why (Benefit)
- **Detects compromised devices** - If device is jailbroken/rooted, can require additional verification
- **Prevents account takeover** - New device login triggers security checks
- **Fraud detection** - Unusual device patterns indicate potential fraud
- **Compliance** - Many regulations require device tracking for financial apps

#### What It Does
- Collects device information (model, OS, screen size, etc.)
- Creates a unique fingerprint hash for each device
- Backend stores fingerprints and alerts on new/unknown devices
- Can block or require additional verification for suspicious devices

#### Frontend (Mobile App) Implementation

**Step 1: Collect Device Information**
```typescript
// src/utils/security.ts
import * as Device from 'expo-device';
import { Platform, Dimensions } from 'react-native';
import Constants from 'expo-constants';

export async function getDeviceFingerprint(): Promise<{
  deviceId: string;
  platform: string;
  appVersion: string;
  deviceModel: string;
  osVersion: string;
  screenResolution: string;
  timezone: string;
  locale: string;
}> {
  const deviceId = await getDeviceId(); // From previous implementation
  const { width, height } = Dimensions.get('window');
  
  return {
    deviceId,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version || '1.0.0',
    deviceModel: Device.modelName || Device.modelId || 'unknown',
    osVersion: Device.osVersion || 'unknown',
    screenResolution: `${width}x${height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
  };
}

// Hash the fingerprint
export async function getDeviceFingerprintHash(): Promise<string> {
  const fingerprint = await getDeviceFingerprint();
  const fingerprintString = JSON.stringify(fingerprint);
  return simpleHash(fingerprintString); // Use crypto hash in production
}
```

**Step 2: Send Device Fingerprint with Requests**
```typescript
// src/services/secureApi.ts
export async function secureApiFetch(endpoint: string, data: any) {
  const deviceId = await getDeviceId();
  const deviceFingerprint = await getDeviceFingerprintHash();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Device-ID': deviceId,
      'X-Device-Fingerprint': deviceFingerprint,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  return response;
}
```

**What Frontend Sends to Backend:**
```
POST /banking/send-ngn-money
Headers:
  Authorization: Bearer <jwt_token>
  X-Device-ID: "ios-iphone13-1705312800000-abc123"
  X-Device-Fingerprint: "a1b2c3d4e5f6..."  // Hash of device info
  Content-Type: application/json
Body:
  {
    "amount": 50000,
    "account_number": "1234567890"
  }
```

#### Backend Implementation

**Step 1: Store and Validate Device Fingerprints**
```javascript
// Middleware to validate device
async function validateDevice(req, res, next) {
  const deviceId = req.headers['x-device-id'];
  const deviceFingerprint = req.headers['x-device-fingerprint'];
  const userId = req.user.id;
  
  if (!deviceId || !deviceFingerprint) {
    return res.status(400).json({ 
      success: false, 
      message: 'Device information is required' 
    });
  }
  
  // Check if device is known
  const device = await Device.findOne({ 
    where: { userId, deviceId } 
  });
  
  if (!device) {
    // New device - log security event
    await logSecurityEvent({
      userId,
      event: 'new_device_detected',
      deviceId,
      deviceFingerprint,
      ipAddress: req.ip,
      timestamp: new Date()
    });
    
    // Option 1: Require additional verification (OTP)
    // Option 2: Allow but send alert to user
    // Option 3: Block and require admin approval
    
    // For now, allow but log
    await Device.create({
      userId,
      deviceId,
      deviceFingerprint,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      isTrusted: false // Require verification
    });
    
    // Send email/SMS alert to user
    await sendDeviceAlert(userId, deviceId);
  } else {
    // Known device - verify fingerprint matches
    if (device.deviceFingerprint !== deviceFingerprint) {
      // Fingerprint changed - device may be compromised
      await logSecurityEvent({
        userId,
        event: 'device_fingerprint_mismatch',
        deviceId,
        oldFingerprint: device.deviceFingerprint,
        newFingerprint: deviceFingerprint,
        ipAddress: req.ip
      });
      
      // Require additional verification or block
      return res.status(403).json({ 
        success: false, 
        message: 'Device verification failed. Please verify your device.',
        requiresVerification: true
      });
    }
    
    // Update last seen
    device.lastSeenAt = new Date();
    await device.save();
  }
  
  next();
}

// Apply to sensitive endpoints
app.post('/banking/send-ngn-money', 
  authenticateToken, 
  validateDevice,  // Add device validation
  verifyRequestSignature, 
  verifyTransactionPin, 
  async (req, res) => {
    // Process transaction...
  }
);
```

**What Backend Returns:**
```json
// Success:
{
  "success": true,
  "data": { "transaction_id": "txn_123" }
}

// New Device Detected:
{
  "success": false,
  "message": "New device detected. Please verify via OTP.",
  "requiresOTP": true,
  "otpSent": true
}

// Device Fingerprint Mismatch:
{
  "success": false,
  "message": "Device verification failed. Please verify your device.",
  "requiresVerification": true
}
```

**Backend Requirements:**
- Store device fingerprints in database
- Track first seen and last seen timestamps
- Alert on new device detection
- Verify fingerprint matches on each request
- Support device trust/verification flow
- Log all device-related security events

---

## 🛡️ 2. Request Security (Summary)

All sensitive endpoints should include these security headers:
```
POST /banking/send-ngn-money
Headers:
  Authorization: Bearer <jwt_token>           // User authentication
  X-Transaction-PIN: "1234"                  // Transaction authorization
  X-Timestamp: "1705312800000"                // Request timestamp
  X-Nonce: "1705312800000-abc123"             // One-time nonce
  X-Signature: "a1b2c3d4e5f6..."              // HMAC signature
  Idempotency-Key: "user123-transfer-..."     // Prevent duplicates
  X-Device-ID: "ios-iphone13-..."             // Device identification
  X-Device-Fingerprint: "hash..."             // Device fingerprint
  Content-Type: application/json
Body:
  {
    "amount": 50000,
    "account_number": "1234567890",
    "bank_code": "058"
  }
```

---

## 🔒 3. Transaction Security

### 3.1 Transaction Limits

#### Why (Benefit)
- **Prevents large losses** - Limits how much can be stolen if account is compromised
- **Fraud protection** - Stops automated attacks from draining accounts quickly
- **Regulatory compliance** - Many financial regulations require transaction limits
- **Risk management** - Controls exposure to financial risk

#### What It Does
- Enforces maximum amounts per transaction, per day, and per month
- Different limits based on user verification status (KYC)
- Blocks transactions that exceed limits
- Tracks usage and resets daily/monthly counters

#### Frontend (Mobile App) Implementation

**Step 1: Validate Limits Before Sending Request**
```typescript
// src/utils/validation.ts
export function validateTransactionLimits(
  amount: number,
  transactionType: 'transfer' | 'airtime' | 'data',
  userLimits: {
    singleTransactionLimit: number;
    dailyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    monthlyUsed: number;
  }
): { valid: boolean; error?: string } {
  // Check single transaction limit
  if (amount > userLimits.singleTransactionLimit) {
    return {
      valid: false,
      error: `Amount exceeds single transaction limit of ₦${userLimits.singleTransactionLimit.toLocaleString()}`
    };
  }
  
  // Check daily limit
  if (userLimits.dailyUsed + amount > userLimits.dailyLimit) {
    const remaining = userLimits.dailyLimit - userLimits.dailyUsed;
    return {
      valid: false,
      error: `Amount exceeds daily limit. Remaining: ₦${remaining.toLocaleString()}`
    };
  }
  
  // Check monthly limit
  if (userLimits.monthlyUsed + amount > userLimits.monthlyLimit) {
    const remaining = userLimits.monthlyLimit - userLimits.monthlyUsed;
    return {
      valid: false,
      error: `Amount exceeds monthly limit. Remaining: ₦${remaining.toLocaleString()}`
    };
  }
  
  return { valid: true };
}

// Usage before transfer:
const limits = await api.user.getTransactionLimits();
const validation = validateTransactionLimits(amount, 'transfer', limits);

if (!validation.valid) {
  Alert.alert('Limit Exceeded', validation.error);
  return;
}
```

**What Frontend Sends to Backend:**
```
POST /banking/send-ngn-money
Headers:
  Authorization: Bearer <jwt_token>
  X-Transaction-PIN: "1234"
  Content-Type: application/json
Body:
  {
    "amount": 50000,
    "account_number": "1234567890",
    "bank_code": "058"
  }
```

#### Backend Implementation

**Step 1: Define Transaction Limits**
```javascript
// config/transactionLimits.js
const TRANSACTION_LIMITS = {
  UNVERIFIED: {
    singleTransaction: 50000,    // ₦50,000
    daily: 200000,                // ₦200,000
    monthly: 1000000,              // ₦1,000,000
    airtimeDaily: 20000           // ₦20,000
  },
  VERIFIED: {
    singleTransaction: 100000,    // ₦100,000
    daily: 500000,                // ₦500,000
    monthly: 5000000,              // ₦5,000,000
    airtimeDaily: 50000           // ₦50,000
  },
  PREMIUM: {
    singleTransaction: 500000,    // ₦500,000
    daily: 2000000,               // ₦2,000,000
    monthly: 10000000,            // ₦10,000,000
    airtimeDaily: 100000          // ₦100,000
  }
};
```

**Step 2: Enforce Limits in Transaction Handler**
```javascript
// Middleware to check transaction limits
async function checkTransactionLimits(req, res, next) {
  const { amount, transactionType } = req.body;
  const userId = req.user.id;
  
  // Get user's KYC status and limits
  const user = await User.findById(userId);
  const limits = TRANSACTION_LIMITS[user.kycStatus] || TRANSACTION_LIMITS.UNVERIFIED;
  
  // Get today's usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyUsage = await Transaction.sum('amount', {
    where: {
      userId,
      createdAt: { [Op.gte]: today },
      status: 'completed'
    }
  });
  
  // Get this month's usage
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyUsage = await Transaction.sum('amount', {
    where: {
      userId,
      createdAt: { [Op.gte]: monthStart },
      status: 'completed'
    }
  });
  
  // Check single transaction limit
  if (amount > limits.singleTransaction) {
    return res.status(403).json({
      success: false,
      message: `Amount exceeds single transaction limit of ₦${limits.singleTransaction.toLocaleString()}`,
      limit: limits.singleTransaction,
      currentAmount: amount
    });
  }
  
  // Check daily limit
  if (dailyUsage + amount > limits.daily) {
    const remaining = limits.daily - dailyUsage;
    return res.status(403).json({
      success: false,
      message: `Daily limit exceeded. Remaining: ₦${remaining.toLocaleString()}`,
      dailyLimit: limits.daily,
      dailyUsed: dailyUsage,
      remaining
    });
  }
  
  // Check monthly limit
  if (monthlyUsage + amount > limits.monthly) {
    const remaining = limits.monthly - monthlyUsage;
    return res.status(403).json({
      success: false,
      message: `Monthly limit exceeded. Remaining: ₦${remaining.toLocaleString()}`,
      monthlyLimit: limits.monthly,
      monthlyUsed: monthlyUsage,
      remaining
    });
  }
  
  // Limits passed - proceed
  next();
}

// Apply to transaction endpoints
app.post('/banking/send-ngn-money', 
  authenticateToken, 
  validateDevice,
  verifyRequestSignature, 
  verifyTransactionPin,
  checkTransactionLimits, // Add limit checking
  async (req, res) => {
    // Process transaction...
  }
);
```

**What Backend Returns:**
```json
// Success:
{
  "success": true,
  "data": {
    "transaction_id": "txn_123",
    "amount": 50000
  }
}

// Limit Exceeded:
{
  "success": false,
  "message": "Amount exceeds single transaction limit of ₦100,000",
  "limit": 100000,
  "currentAmount": 150000
}

// Daily Limit Exceeded:
{
  "success": false,
  "message": "Daily limit exceeded. Remaining: ₦50,000",
  "dailyLimit": 500000,
  "dailyUsed": 450000,
  "remaining": 50000
}
```

**Backend Requirements:**
- Store limits per user tier (unverified, verified, premium)
- Track daily and monthly usage per user
- Reset daily counters at midnight
- Reset monthly counters at start of month
- Return clear error messages with remaining limits
- Log all limit violations

---

### 3.2 Rate Limiting

#### Why (Benefit)
- **Prevents brute force attacks** - Stops attackers from trying many PINs or passwords
- **Prevents DDoS attacks** - Limits requests per IP/device to prevent overload
- **Protects against automated attacks** - Stops bots from making rapid transactions
- **Resource protection** - Prevents server overload from too many requests

#### What It Does
- Tracks number of requests per user/IP/device within a time window
- Blocks requests that exceed the limit
- Returns 429 (Too Many Requests) status when limit exceeded
- Automatically resets after time window expires

#### Frontend (Mobile App) Implementation

**Step 1: Client-Side Rate Limiting (Prevent Unnecessary Requests)**
```typescript
// src/utils/rateLimit.ts
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export function checkClientRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore[key];
  
  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + windowMs
    };
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }
  
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetTime };
  }
  
  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetTime
  };
}

// Usage before making request:
const rateCheck = checkClientRateLimit('transfer', 10, 60 * 60 * 1000); // 10 per hour

if (!rateCheck.allowed) {
  const resetTime = new Date(rateCheck.resetAt);
  Alert.alert(
    'Rate Limit Exceeded',
    `Too many requests. Please try again after ${resetTime.toLocaleTimeString()}`
  );
  return;
}
```

**What Frontend Sends to Backend:**
```
POST /banking/send-ngn-money
Headers:
  Authorization: Bearer <jwt_token>
  X-Transaction-PIN: "1234"
  Content-Type: application/json
Body:
  {
    "amount": 50000,
    "account_number": "1234567890"
  }
```

#### Backend Implementation

**Step 1: Implement Rate Limiting Middleware**
```javascript
// Using express-rate-limit
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient();

// Per-user rate limiting for transfers
const transferLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:transfer:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  keyGenerator: (req) => {
    return req.user.id; // Limit per user
  },
  message: 'Too many transfer requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-IP rate limiting for login
const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:login:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  keyGenerator: (req) => {
    return req.ip; // Limit per IP
  },
  message: 'Too many login attempts. Please try again later.',
  skipSuccessfulRequests: true, // Don't count successful logins
});

// PIN verification rate limiting
const pinLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:pin:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  keyGenerator: (req) => {
    return req.user.id; // Limit per user
  },
  message: 'Too many PIN attempts. Account will be locked.',
  skipSuccessfulRequests: true,
});

// Apply to endpoints
app.post('/auth/login', loginLimiter, loginHandler);
app.post('/banking/send-ngn-money', 
  authenticateToken,
  transferLimiter, // Add rate limiting
  verifyRequestSignature,
  verifyTransactionPin,
  checkTransactionLimits,
  transferHandler
);
```

**Step 2: Custom Rate Limiting (More Control)**
```javascript
// Custom rate limiting with more control
async function customRateLimit(req, res, next) {
  const userId = req.user.id;
  const endpoint = req.path;
  const key = `rate_limit:${userId}:${endpoint}`;
  
  // Get current count
  const count = await redis.incr(key);
  
  // Set expiration on first request
  if (count === 1) {
    await redis.expire(key, 3600); // 1 hour
  }
  
  // Define limits per endpoint
  const limits = {
    '/banking/send-ngn-money': { max: 10, window: 3600 }, // 10 per hour
    '/vtu/airtime/purchase': { max: 20, window: 3600 },   // 20 per hour
    '/vtu/data/purchase': { max: 20, window: 3600 },      // 20 per hour
  };
  
  const limit = limits[endpoint] || { max: 10, window: 3600 };
  
  if (count > limit.max) {
    const ttl = await redis.ttl(key);
    return res.status(429).json({
      success: false,
      message: `Rate limit exceeded. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
      retryAfter: ttl,
      limit: limit.max,
      window: limit.window
    });
  }
  
  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': limit.max,
    'X-RateLimit-Remaining': limit.max - count,
    'X-RateLimit-Reset': Date.now() + (limit.window * 1000)
  });
  
  next();
}
```

**What Backend Returns:**
```json
// Success (with rate limit headers):
Headers:
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 5
  X-RateLimit-Reset: 1705316400000
Body:
{
  "success": true,
  "data": { "transaction_id": "txn_123" }
}

// Rate Limit Exceeded:
{
  "success": false,
  "message": "Rate limit exceeded. Please try again in 45 minutes.",
  "retryAfter": 2700,
  "limit": 10,
  "window": 3600
}
```

**Backend Requirements:**
- Use Redis or in-memory store for rate limiting
- Different limits for different endpoints
- Per-user and per-IP rate limiting
- Return rate limit headers in responses
- Clear error messages with retry time
- Log rate limit violations

---

### 3.3 Input Validation

#### Why (Benefit)
- **Prevents invalid data** - Stops malformed requests from reaching business logic
- **Security** - Prevents injection attacks and data manipulation
- **Data integrity** - Ensures all transactions have valid data
- **User experience** - Catches errors early with clear messages

#### What It Does
- Validates data format, type, and range before processing
- Checks business rules (sufficient balance, valid account, etc.)
- Returns clear error messages for invalid input
- Prevents processing of invalid transactions

#### Frontend (Mobile App) Implementation

**Step 1: Client-Side Validation**
```typescript
// src/utils/validation.ts
export function validateAmount(amount: number): { valid: boolean; error?: string } {
  if (isNaN(amount) || !isFinite(amount)) {
    return { valid: false, error: 'Invalid amount' };
  }
  
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  if (amount < 1) {
    return { valid: false, error: 'Minimum amount is ₦1' };
  }
  
  // Check decimal places (max 2 for currency)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { valid: false, error: 'Amount can have maximum 2 decimal places' };
  }
  
  return { valid: true };
}

export function validateAccountNumber(accountNumber: string): { valid: boolean; error?: string } {
  if (!accountNumber) {
    return { valid: false, error: 'Account number is required' };
  }
  
  // Remove spaces and dashes
  const cleaned = accountNumber.replace(/[\s-]/g, '');
  
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'Account number must contain only digits' };
  }
  
  if (cleaned.length !== 10) {
    return { valid: false, error: 'Account number must be 10 digits' };
  }
  
  return { valid: true };
}

// Usage:
const amountValidation = validateAmount(parseFloat(amount));
if (!amountValidation.valid) {
  Alert.alert('Invalid Amount', amountValidation.error);
  return;
}
```

#### Backend Implementation

**Step 1: Server-Side Validation (Never Trust Client)**
```javascript
// Using express-validator or similar
const { body, validationResult } = require('express-validator');

// Validation rules
const transferValidation = [
  body('amount')
    .isFloat({ min: 1, max: 10000000 })
    .withMessage('Amount must be between ₦1 and ₦10,000,000')
    .custom((value) => {
      // Check decimal places
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        throw new Error('Amount can have maximum 2 decimal places');
      }
      return true;
    }),
  body('account_number')
    .trim()
    .isLength({ min: 10, max: 10 })
    .withMessage('Account number must be 10 digits')
    .isNumeric()
    .withMessage('Account number must contain only digits'),
  body('bank_code')
    .notEmpty()
    .withMessage('Bank code is required')
    .isLength({ min: 3, max: 3 })
    .withMessage('Bank code must be 3 digits'),
];

// Apply validation
app.post('/banking/send-ngn-money', 
  authenticateToken,
  transferValidation, // Add validation
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  },
  verifyRequestSignature,
  verifyTransactionPin,
  checkTransactionLimits,
  async (req, res) => {
    // Process transaction...
  }
);
```

**What Backend Returns:**
```json
// Validation Error:
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be between ₦1 and ₦10,000,000"
    },
    {
      "field": "account_number",
      "message": "Account number must be 10 digits"
    }
  ]
}
```

---

## 📱 4. Device & Client Security

### 4.1 Device Fingerprinting
**Why**: Detect compromised devices, prevent account takeover

**Implementation**:
```typescript
// Collect device information
const deviceFingerprint = {
  deviceId: await getDeviceId(),
  platform: Platform.OS,
  appVersion: appVersion,
  deviceModel: Device.modelName,
  osVersion: Device.osVersion,
  isJailbroken: await checkJailbreak(), // iOS
  isRooted: await checkRoot(), // Android
  screenResolution: `${width}x${height}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale: Intl.DateTimeFormat().resolvedOptions().locale
};

// Send with sensitive requests
headers: {
  'X-Device-ID': deviceFingerprint.deviceId,
  'X-Device-Fingerprint': hash(deviceFingerprint)
}
```

**Backend**: 
- Store device fingerprints
- Alert on new device login
- Block suspicious devices
- Require additional verification for new devices

### 4.2 Root/Jailbreak Detection
- **iOS**: Detect jailbroken devices, block or require additional verification
- **Android**: Detect rooted devices, warn or block
- Use libraries: `react-native-device-info`, `jail-monkey`

### 4.3 Certificate Pinning
**Why**: Prevent MITM attacks

**Implementation**:
```typescript
// Pin backend SSL certificates
// Use libraries: react-native-cert-pinner
```

---

## 🚦 5. Rate Limiting

### 5.1 Client-Side Rate Limiting
```typescript
// Implement request throttling
- Max 1 transfer per 30 seconds
- Max 5 transfers per hour
- Max 10 airtime purchases per hour
- Exponential backoff on failures
```

### 5.2 Backend Rate Limiting
- **Per-endpoint limits**: Different limits for different operations
- **Per-user limits**: Based on user tier/verification status
- **IP-based limits**: Prevent DDoS and brute force
- **Device-based limits**: Track per device

**Recommended Limits**:
```
- Login: 5 attempts per 15 minutes
- Transfer: 10 per hour, 50 per day
- Airtime: 20 per hour, 100 per day
- PIN verification: 5 attempts per 15 minutes
```

---

## 🔍 6. Input Validation & Sanitization

### 6.1 Client-Side Validation
```typescript
// Amount validation
- Positive numbers only
- Max decimal places (2 for currency)
- Min/max amount checks
- Format: /^\d+(\.\d{1,2})?$/

// Account number validation
- Numeric only
- Length validation (10 digits for NGN)
- Format: /^\d{10}$/

// Phone number validation
- Country-specific formats
- Remove spaces/special chars
- Validate length

// Tag validation
- Alphanumeric only
- Length limits
- Case-insensitive
```

### 6.2 Backend Validation
- **Never trust client input**: Re-validate all data
- **Type checking**: Ensure correct data types
- **Range validation**: Amount, length limits
- **Format validation**: Regex patterns
- **Business logic validation**: Sufficient balance, active account, etc.

---

## 📊 7. Logging & Monitoring

### 7.1 Security Event Logging
**Log all sensitive operations**:
```typescript
// Events to log:
- Login attempts (success/failure)
- PIN verification attempts
- All financial transactions
- Account changes (PIN, password, etc.)
- Device changes
- Suspicious activity patterns
```

**Log Format**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event": "transfer_initiated",
  "userId": "user_123",
  "deviceId": "device_456",
  "ipAddress": "192.168.1.1",
  "amount": 50000,
  "recipient": "account_789",
  "status": "pending",
  "metadata": {}
}
```

### 7.2 Anomaly Detection
- **Unusual transaction patterns**: Large amounts, new recipients, unusual times
- **Multiple failed PIN attempts**: Potential brute force
- **Rapid successive transactions**: Potential automated attack
- **Geographic anomalies**: Login from new location
- **Device changes**: New device with high-value transaction

### 7.3 Alerting
- Real-time alerts for:
  - Failed PIN attempts > 3
  - Transactions > daily limit
  - New device login
  - Suspicious transaction patterns
  - Multiple rapid transactions

---

## 🔐 8. Data Protection

### 8.1 Encryption
- **In Transit**: HTTPS/TLS 1.3 (enforced)
- **At Rest**: Encrypt sensitive data in database
- **Sensitive Fields**: Encrypt PINs, account numbers, PII
- **Key Management**: Use secure key management service (AWS KMS, HashiCorp Vault)

### 8.2 Data Minimization
- Don't store sensitive data longer than necessary
- Mask sensitive data in logs (last 4 digits only)
- Don't log full account numbers, PINs, or tokens

### 8.3 Secure Storage
```typescript
// Use SecureStore for:
- Access tokens
- Transaction PINs (hashed)
- Biometric keys
- Device IDs

// Never store in AsyncStorage:
- Passwords
- PINs (plaintext)
- Tokens
- Account numbers
```

---

## 🛡️ 9. API Security

### 9.1 Endpoint Protection
**Sensitive endpoints must require**:
1. Valid JWT token
2. Transaction PIN verification
3. Request signature
4. Idempotency key
5. Device fingerprint
6. Timestamp validation

**Example Protected Endpoint**:
```typescript
POST /api/v1/banking/send-ngn-money
Headers:
  Authorization: Bearer <token>
  X-Transaction-PIN: <hashed_pin>
  X-Timestamp: <timestamp>
  X-Nonce: <nonce>
  X-Signature: <signature>
  X-Request-ID: <idempotency_key>
  X-Device-ID: <device_id>
Body:
  {
    "amount": 50000,
    "account_number": "1234567890",
    "bank_code": "058",
    "narration": "Payment"
  }
```

### 9.2 Error Handling
- **Never expose sensitive information** in error messages
- **Generic errors for security failures**: "Invalid credentials" not "PIN incorrect"
- **Detailed errors only in server logs**
- **Rate limit error responses**: Don't reveal limit details

### 9.3 CORS & Headers
```typescript
// Security headers
- Strict-Transport-Security: max-age=31536000
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Content-Security-Policy: strict
- X-XSS-Protection: 1; mode=block
```

---

## 🔄 10. Transaction Flow Security

### 10.1 Two-Phase Commit Pattern
```typescript
// Phase 1: Validate & Reserve
1. Validate transaction (amount, recipient, balance)
2. Reserve funds (deduct from available balance)
3. Create pending transaction record
4. Return transaction ID

// Phase 2: Execute
1. Verify transaction PIN
2. Execute transfer with payment provider
3. Update transaction status
4. Release or commit reserved funds
```

### 10.2 Transaction States
```typescript
enum TransactionStatus {
  PENDING = 'pending',      // Validated, funds reserved
  PROCESSING = 'processing', // Executing with provider
  COMPLETED = 'completed',   // Successfully executed
  FAILED = 'failed',         // Failed, funds released
  CANCELLED = 'cancelled'    // User cancelled
}
```

### 10.3 Reconciliation
- Daily reconciliation with payment providers
- Automatic retry for failed transactions
- Manual review queue for discrepancies
- Transaction audit trail

---

## 🚨 11. Fraud Prevention

### 11.1 Risk Scoring
```typescript
// Factors to consider:
- Transaction amount (higher = more risk)
- New recipient (higher risk)
- Unusual time (higher risk)
- Device change (higher risk)
- Recent failed PIN attempts (higher risk)
- Geographic location (new location = higher risk)
- Transaction velocity (rapid transactions = higher risk)

// Actions based on risk score:
- Low (0-30): Auto-approve
- Medium (31-70): Require additional verification (OTP)
- High (71-100): Manual review or block
```

### 11.2 Blacklist Management
- Block known fraudulent accounts
- Block suspicious IP addresses
- Block compromised devices
- Temporary blocks for suspicious activity

### 11.3 Transaction Monitoring
- Real-time monitoring dashboard
- Automated alerts for suspicious patterns
- Manual review queue
- Machine learning for fraud detection

---

## 📋 12. Compliance & Regulations

### 12.1 PCI DSS (Payment Card Industry)
- If handling card data, must comply with PCI DSS
- Use tokenization for card numbers
- Never store full card numbers
- Use PCI-compliant payment processors

### 12.2 KYC/AML (Know Your Customer / Anti-Money Laundering)
- Verify user identity (BVN, ID documents)
- Monitor for suspicious transactions
- Report large transactions to authorities
- Maintain transaction records (5-7 years)

### 12.3 Data Privacy
- GDPR compliance (if serving EU users)
- User consent for data processing
- Right to access/delete data
- Data breach notification procedures

---

## 🔧 13. Implementation Priority

### Phase 1: Critical (Implement Immediately)
1. ✅ Transaction PIN verification for all sensitive operations
2. ✅ Request signing and timestamp validation
3. ✅ Idempotency keys
4. ✅ Device fingerprinting
5. ✅ Rate limiting (client and server)
6. ✅ Enhanced logging

### Phase 2: High Priority (Within 1-2 weeks)
1. Transaction limits enforcement
2. Anomaly detection
3. Root/jailbreak detection
4. Certificate pinning
5. Enhanced error handling

### Phase 3: Important (Within 1 month)
1. Risk scoring system
2. Two-phase commit pattern
3. Reconciliation system
4. Fraud monitoring dashboard
5. Compliance documentation

---

## 📚 14. Additional Resources

### Security Libraries
- **Request Signing**: `crypto-js`, `node-forge`
- **Device Info**: `react-native-device-info`
- **Root Detection**: `jail-monkey`, `react-native-root-detection`
- **Certificate Pinning**: `react-native-cert-pinner`
- **Encryption**: `react-native-encrypted-storage`

### Industry Standards
- OWASP Mobile Top 10
- PCI DSS Requirements
- ISO 27001
- NIST Cybersecurity Framework

### Testing
- Penetration testing (quarterly)
- Security code reviews
- Automated security scanning
- Bug bounty program (optional)

---

## 🎯 Summary

**Key Principles**:
1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimum access required
3. **Fail Secure**: Default to deny/block
4. **Never Trust Client**: Validate everything server-side
5. **Monitor Everything**: Log and alert on suspicious activity
6. **Update Regularly**: Keep dependencies and security patches current

**Remember**: Security is an ongoing process, not a one-time implementation. Regular audits, updates, and monitoring are essential.


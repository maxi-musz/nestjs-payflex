# Registration Flow Implementation Guide

## 📋 Overview

This document outlines the professional multi-step registration flow implementation, following industry best practices used by major fintech companies (Paystack, Kuda Bank, Opay, Flutterwave).

## 🎯 Registration Flow Steps

### Current Registration Steps (9 Steps)

1. **Phone Number Entry** - User enters phone number and optional referral code
2. **OTP Verification** - User verifies phone number with OTP
3. **ID Information Entry** - User selects ID type (BVN/NIN) and enters number
4. **Face Verification** - User completes biometric face verification
5. **Residential Address** - User enters residential address details
6. **PEP Declaration** - User declares if they are a Politically Exposed Person
7. **Income Declaration** - User declares their income range
8. **Password Setup** - User sets 6-digit login password
9. **Account Tier Information** - Display account tier level information

**Note:** Step 9 (Congratulatory page) is informational only and doesn't require backend interaction.

---

## 🏗️ Architecture: Dynamic & Extensible Design

### Core Principles

1. **Step-Based System** - Each step is independent and can be validated separately
2. **Progress Tracking** - Backend tracks completion status of each step
3. **Verification Gates** - Critical steps (phone, ID) must be verified before proceeding
4. **Extensible** - New steps can be added without breaking existing flow
5. **State Persistence** - Progress survives app closure/reinstall

---

## 🗄️ Database Schema

### RegistrationProgress Model

```prisma
model RegistrationProgress {
  id                    String   @id @default(uuid())
  phone_number          String   @unique  // Primary identifier for resume
  current_step          Int      @default(1)  // Current step (1-9)
  total_steps           Int      @default(9)
  
  // Step completion flags (for easy querying)
  step_1_completed      Boolean  @default(false)  // Phone entry
  step_2_completed      Boolean  @default(false)  // OTP verified
  step_3_completed      Boolean  @default(false)  // ID info entered
  step_3_verified       Boolean  @default(false)  // ID verified (BVN/NIN)
  step_4_completed      Boolean  @default(false)  // Face verification
  step_5_completed      Boolean  @default(false)  // Address
  step_6_completed      Boolean  @default(false)  // PEP declaration
  step_7_completed      Boolean  @default(false)  // Income declaration
  step_8_completed      Boolean  @default(false)  // Password setup
  step_9_completed      Boolean  @default(false)  // Tier info viewed
  
  // Registration data (JSON for flexibility)
  registration_data     Json     @default("{}")
  
  // Referral code (stored separately for easy querying)
  referral_code         String?  // Optional referral code from step 1
  
  // Verification statuses
  is_phone_verified     Boolean  @default(false)
  id_verification_status String?  // "pending" | "verified" | "failed" | null
  face_verification_status String?  // "pending" | "verified" | "failed" | null
  
  // Metadata
  is_complete           Boolean  @default(false)
  expires_at            DateTime?  // Expire incomplete registrations after 30 days
  verification_attempts Int      @default(0)  // Track failed verification attempts
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([phone_number])
  @@index([is_complete])
  @@index([is_phone_verified])
}
```

### Registration Data JSON Structure

```typescript
interface RegistrationData {
  // Step 1: Phone Number & Referral
  phone_number?: string;
  referral_code?: string;  // Optional referral code
  
  // Step 2: OTP (not stored, only verified)
  
  // Step 3: ID Information
  id_type?: "BVN" | "NIN" | "PASSPORT" | "DRIVERS_LICENSE" | "PVC";
  id_number?: string;
  id_verification_reference?: string;  // Reference from verification provider
  
  // Step 4: Face Verification
  face_verification_reference?: string;
  face_image_url?: string;
  
  // Step 5: Residential Address
  address?: {
    street_address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    lga?: string;
  };
  
  // Step 6: PEP Declaration
  is_pep?: boolean;
  pep_details?: string;  // If yes, additional details
  
  // Step 7: Income Declaration
  income_range?: "below_100k" | "100k_500k" | "500k_1m" | "1m_5m" | "above_5m";
  
  // Step 8: Password (hashed, stored only on completion)
  password_hash?: string;  // Only set when registration completes
  
  // Step 9: Account Tier (informational, no data to store)
}
```

---

## 🔐 Critical Security: BVN/NIN Verification Strategy

### ⚠️ **MUST VERIFY BEFORE PROCEEDING**

**Industry Standard:** All major fintech companies (Paystack, Kuda, Opay) **REQUIRE** ID verification before allowing users to proceed to the next step.

### Why Verification is Mandatory:

1. **Regulatory Compliance** - CBN (Central Bank of Nigeria) requires KYC verification
2. **Fraud Prevention** - Prevents fake accounts and identity theft
3. **Risk Management** - Unverified IDs pose significant financial risk
4. **AML Requirements** - Anti-Money Laundering regulations
5. **User Trust** - Verified accounts build platform credibility

### Verification Flow:

```
Step 3: User enters ID type and number
  ↓
Backend: Initiate verification with provider (Flutterwave/Paystack)
  ↓
Response: 
  - If verified → Mark step_3_verified = true, allow proceed to Step 4
  - If failed → Show error, allow retry (max 3 attempts)
  - If pending → Show "Verification in progress", poll status
  ↓
User can only proceed to Step 4 if step_3_verified = true
```

### Implementation:

```typescript
// Step 3: Submit ID Information
POST /api/v1/auth/register/step-3
{
  "phone_number": "+2348012345678",
  "id_type": "BVN",
  "id_number": "12345678901"
}

// Backend Response (Synchronous Verification)
{
  "success": true,
  "data": {
    "step": 3,
    "verification_status": "verified",  // or "pending" or "failed"
    "verification_reference": "FLW_REF_xxx",
    "can_proceed": true,  // Only true if verified
    "message": "BVN verified successfully"
  }
}

// If verification is async (webhook-based)
{
  "success": true,
  "data": {
    "step": 3,
    "verification_status": "pending",
    "verification_reference": "FLW_REF_xxx",
    "can_proceed": false,
    "message": "Verification in progress. Please wait..."
  }
}

// Frontend polls for status
GET /api/v1/auth/register/verification-status?reference=FLW_REF_xxx
```

### Verification Attempts Limit:

- **Maximum 3 attempts** per phone number for ID verification
- After 3 failures, lock registration for 24 hours
- Log all verification attempts for security audit

---

## 🔄 API Endpoints Structure

### Base URL: `/api/v1/auth/register`

### 1. Start Registration
```
POST /start
Content-Type: application/json

Request Body: {
  "phone_number": "+2348012345678",  // Required: Format: +234XXXXXXXXXX (E.164 format)
  "referral_code": "ABC123"          // Optional: Referral code from existing user
}

Success Response (200 OK): {
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "step": 1,
    "next_step": "OTP_VERIFICATION",
    "otp_sent": true,
    "otp_expires_in": 300  // seconds (5 minutes)
  }
}

Error Responses:

// Phone already registered (409 Conflict)
{
  "success": false,
  "message": "Phone number already registered",
  "error": "PHONE_ALREADY_EXISTS"
}

// Invalid phone format (400 Bad Request)
{
  "success": false,
  "message": "Invalid phone number format",
  "error": "INVALID_PHONE_FORMAT"
}

// Rate limit exceeded (429 Too Many Requests)
{
  "success": false,
  "message": "Too many OTP requests. Please try again later",
  "error": "RATE_LIMIT_EXCEEDED",
  "retry_after": 3600  // seconds
}

// Invalid referral code (400 Bad Request)
{
  "success": false,
  "message": "Invalid referral code",
  "error": "INVALID_REFERRAL_CODE"
}
```

**Field Validation:**
- `phone_number`: Required, must be in E.164 format (+234XXXXXXXXXX), 10-15 digits
- `referral_code`: Optional, alphanumeric, 3-20 characters

### 2. Verify OTP (Step 2)
```
POST /step-2/verify-otp
Body: {
  "phone_number": "+2348012345678",
  "otp": "1234"
}

Response: {
  "success": true,
  "data": {
    "step": 2,
    "is_phone_verified": true,
    "next_step": "ID_INFORMATION",
    "can_proceed": true
  }
}
```

### 3. Submit ID Information (Step 3)
```
POST /step-3/submit-id
Body: {
  "phone_number": "+2348012345678",
  "id_type": "BVN",
  "id_number": "12345678901"
}

Response: {
  "success": true,
  "data": {
    "step": 3,
    "verification_status": "verified",
    "verification_reference": "FLW_REF_xxx",
    "can_proceed": true,
    "next_step": "FACE_VERIFICATION"
  }
}
```

### 4. Face Verification (Step 4)
```
POST /step-4/submit-face
Body: {
  "phone_number": "+2348012345678",
  "face_image": "base64_encoded_image"
}

Response: {
  "success": true,
  "data": {
    "step": 4,
    "verification_status": "verified",
    "can_proceed": true,
    "next_step": "RESIDENTIAL_ADDRESS"
  }
}
```

### 5. Submit Address (Step 5)
```
POST /step-5/submit-address
Body: {
  "phone_number": "+2348012345678",
  "address": {
    "street_address": "123 Main Street",
    "city": "Lagos",
    "state": "Lagos",
    "country": "Nigeria",
    "postal_code": "101001",
    "lga": "Victoria Island"
  }
}

Response: {
  "success": true,
  "data": {
    "step": 5,
    "can_proceed": true,
    "next_step": "PEP_DECLARATION"
  }
}
```

### 6. PEP Declaration (Step 6)
```
POST /step-6/submit-pep
Body: {
  "phone_number": "+2348012345678",
  "is_pep": false,
  "pep_details": null
}

Response: {
  "success": true,
  "data": {
    "step": 6,
    "can_proceed": true,
    "next_step": "INCOME_DECLARATION"
  }
}
```

### 7. Income Declaration (Step 7)
```
POST /step-7/submit-income
Body: {
  "phone_number": "+2348012345678",
  "income_range": "100k_500k"
}

Response: {
  "success": true,
  "data": {
    "step": 7,
    "can_proceed": true,
    "next_step": "PASSWORD_SETUP"
  }
}
```

### 8. Password Setup (Step 8)
```
POST /step-8/submit-password
Body: {
  "phone_number": "+2348012345678",
  "password": "123456"
}

Response: {
  "success": true,
  "data": {
    "step": 8,
    "can_proceed": true,
    "next_step": "COMPLETE_REGISTRATION"
  }
}
```

### 9. Complete Registration
```
POST /complete
Body: {
  "phone_number": "+2348012345678"
}

Response: {
  "success": true,
  "data": {
    "user": { ... },
    "access_token": "jwt_token",
    "message": "Registration completed successfully"
  }
}
```

### Resume Registration
```
GET /resume?phone_number=+2348012345678

Response: {
  "success": true,
  "data": {
    "current_step": 3,
    "total_steps": 9,
    "progress_percentage": 33,
    "registration_data": { ... },
    "next_step": "FACE_VERIFICATION",
    "completed_steps": [1, 2, 3]
  }
}
```

### Check Step Status
```
GET /step-status?phone_number=+2348012345678&step=3

Response: {
  "success": true,
  "data": {
    "step": 3,
    "completed": true,
    "verified": true,
    "can_proceed": true
  }
}
```

---

## 🎨 Dynamic Step Configuration

### Step Configuration Object

To make the flow easily extensible, define step configuration:

```typescript
interface StepConfig {
  step_number: number;
  step_name: string;
  step_key: string;
  requires_verification: boolean;
  verification_provider?: "flutterwave" | "paystack" | "internal";
  is_optional: boolean;
  can_skip: boolean;
  validation_rules: any;
  next_step: string;
}

const REGISTRATION_STEPS: StepConfig[] = [
  {
    step_number: 1,
    step_name: "Phone Number Entry",
    step_key: "PHONE_ENTRY",
    requires_verification: false,
    is_optional: false,
    can_skip: false,
    validation_rules: { min_length: 10, max_length: 15 },
    next_step: "OTP_VERIFICATION"
  },
  {
    step_number: 2,
    step_name: "OTP Verification",
    step_key: "OTP_VERIFICATION",
    requires_verification: true,
    verification_provider: "internal",
    is_optional: false,
    can_skip: false,
    validation_rules: { length: 4, numeric: true },
    next_step: "ID_INFORMATION"
  },
  {
    step_number: 3,
    step_name: "ID Information",
    step_key: "ID_INFORMATION",
    requires_verification: true,
    verification_provider: "flutterwave",
    is_optional: false,
    can_skip: false,
    validation_rules: { id_types: ["BVN", "NIN"] },
    next_step: "FACE_VERIFICATION"
  },
  // ... add more steps
];
```

### Adding a New Step

To add a new step (e.g., "Employment Information"):

1. **Add to Step Configuration:**
```typescript
{
  step_number: 10,
  step_name: "Employment Information",
  step_key: "EMPLOYMENT_INFO",
  requires_verification: false,
  is_optional: true,  // Can be optional
  can_skip: false,
  validation_rules: { ... },
  next_step: "COMPLETE_REGISTRATION"
}
```

2. **Add Database Field:**
```prisma
step_10_completed Boolean @default(false)
```

3. **Create Endpoint:**
```typescript
POST /step-10/submit-employment
```

4. **Update Registration Data Interface:**
```typescript
employment?: {
  employer_name?: string;
  job_title?: string;
  employment_status?: string;
}
```

**That's it!** The system automatically handles the new step.

---

## 🔄 Registration State Machine

### Valid State Transitions

```
[START] → Step 1 (Phone Entry)
  ↓
Step 2 (OTP Verification) [REQUIRES: Step 1 completed]
  ↓
Step 3 (ID Information) [REQUIRES: Step 2 verified, Step 3 verified before proceeding]
  ↓
Step 4 (Face Verification) [REQUIRES: Step 3 verified]
  ↓
Step 5 (Address) [REQUIRES: Step 4 verified]
  ↓
Step 6 (PEP Declaration) [REQUIRES: Step 5 completed]
  ↓
Step 7 (Income Declaration) [REQUIRES: Step 6 completed]
  ↓
Step 8 (Password Setup) [REQUIRES: Step 7 completed]
  ↓
Step 9 (Tier Info) [REQUIRES: Step 8 completed]
  ↓
[COMPLETE] → Create User Account
```

### Validation Rules

- **Cannot skip steps** - Must complete in order
- **Verification gates** - Steps 2, 3, 4 require verification before proceeding
- **Data persistence** - All entered data saved after each step
- **Resume capability** - Can resume from any completed step

---

## 🛡️ Security Best Practices

### 1. Phone Number Verification
- OTP expires after 5 minutes
- Maximum 3 OTP requests per hour per phone number
- Rate limiting on OTP endpoint

### 2. ID Verification
- **MUST verify before proceeding** - No exceptions
- Maximum 3 verification attempts per phone number
- Lock registration for 24 hours after 3 failed attempts
- Log all verification attempts

### 3. Face Verification
- Use secure biometric verification service
- Store verification reference, not actual face image
- Comply with data protection regulations

### 4. Data Protection
- Encrypt sensitive data in `registration_data` JSON
- Don't store password until final step
- Hash password before storing
- Expire incomplete registrations after 30 days

### 5. Session Management
- Use phone number as primary identifier (not session tokens)
- Validate phone number on each request
- Track all registration attempts

---

## 📊 Progress Tracking

### Progress Calculation

```typescript
function calculateProgress(progress: RegistrationProgress): number {
  const completedSteps = [
    progress.step_1_completed,
    progress.step_2_completed,
    progress.step_3_completed && progress.step_3_verified,
    progress.step_4_completed,
    progress.step_5_completed,
    progress.step_6_completed,
    progress.step_7_completed,
    progress.step_8_completed,
    progress.step_9_completed
  ].filter(Boolean).length;
  
  return Math.round((completedSteps / 9) * 100);
}
```

### Analytics Events

Track these events for analytics:
- `registration_started`
- `step_completed` (with step number)
- `step_verification_failed` (with step number and reason)
- `registration_abandoned` (with last completed step)
- `registration_completed`

---

## 🚨 Error Handling

### Common Error Scenarios

1. **Phone Already Registered**
   - Check if phone number exists in User table
   - Return error: "Phone number already registered"

2. **OTP Expired**
   - Return error: "OTP expired. Please request a new one"

3. **ID Verification Failed**
   - Return error: "ID verification failed. Please check your details"
   - Allow retry (max 3 attempts)

4. **Registration Expired**
   - Check `expires_at` field
   - Return error: "Registration expired. Please start again"

5. **Step Skipped**
   - Return error: "Please complete previous steps first"

---

## 🔄 Frontend Integration

### Check Registration Status on App Launch

```typescript
async function checkRegistrationStatus(phoneNumber: string) {
  try {
    const response = await fetch(
      `${API_URL}/auth/register/resume?phone_number=${phoneNumber}`
    );
    const data = await response.json();
    
    if (data.success && !data.data.is_complete) {
      // Resume from saved step
      const currentStep = data.data.current_step;
      navigateToStep(currentStep);
      loadSavedData(data.data.registration_data);
    } else if (data.success && data.data.is_complete) {
      // Registration already complete, redirect to login
      navigateToLogin();
    } else {
      // No existing registration, start fresh
      navigateToStep(1);
    }
  } catch (error) {
    // Start fresh registration
    navigateToStep(1);
  }
}
```

### Save Progress After Each Step

```typescript
async function saveStepProgress(step: number, data: any) {
  try {
    const response = await fetch(
      `${API_URL}/auth/register/step-${step}/submit-${getStepKey(step)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          ...data
        })
      }
    );
    
    const result = await response.json();
    
    if (result.success && result.data.can_proceed) {
      // Move to next step
      navigateToStep(step + 1);
    } else if (result.data.verification_status === 'pending') {
      // Poll for verification status
      pollVerificationStatus(result.data.verification_reference);
    } else {
      // Show error
      showError(result.message);
    }
  } catch (error) {
    showError('Failed to save progress');
  }
}
```

---

## 🧹 Cleanup & Maintenance

### Expired Registration Cleanup

Run a cron job daily to clean up expired registrations:

```typescript
// Delete registrations older than 30 days and incomplete
async function cleanupExpiredRegistrations() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await prisma.registrationProgress.deleteMany({
    where: {
      is_complete: false,
      createdAt: {
        lt: thirtyDaysAgo
      }
    }
  });
}
```

### Analytics Queries

```typescript
// Get abandonment rate by step
async function getAbandonmentRate() {
  const total = await prisma.registrationProgress.count({
    where: { is_complete: false }
  });
  
  const byStep = await prisma.registrationProgress.groupBy({
    by: ['current_step'],
    where: { is_complete: false },
    _count: true
  });
  
  return { total, byStep };
}
```

---

## ✅ Implementation Checklist

- [ ] Add `RegistrationProgress` model to Prisma schema
- [ ] Create migration for new model
- [ ] Implement step 1 endpoint (phone entry)
- [ ] Implement step 2 endpoint (OTP verification)
- [ ] Implement step 3 endpoint (ID info + verification)
- [ ] Integrate BVN/NIN verification (Flutterwave/Paystack)
- [ ] Implement step 4 endpoint (face verification)
- [ ] Implement step 5 endpoint (address)
- [ ] Implement step 6 endpoint (PEP declaration)
- [ ] Implement step 7 endpoint (income declaration)
- [ ] Implement step 8 endpoint (password setup)
- [ ] Implement complete registration endpoint
- [ ] Implement resume registration endpoint
- [ ] Add cleanup cron job for expired registrations
- [ ] Add analytics tracking
- [ ] Add rate limiting
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Write integration tests

---

## 📚 References

- **CBN KYC Guidelines** - Central Bank of Nigeria KYC requirements
- **Flutterwave BVN Verification API** - https://developer.flutterwave.com/docs/bvn-verification
- **Paystack Verification API** - https://paystack.com/docs/identity-verification
- **Industry Best Practices** - Based on implementations by Kuda Bank, Opay, Paystack

---

## 🎯 Key Takeaways

1. **Always verify ID before proceeding** - This is non-negotiable for fintech
2. **Save progress after each step** - Enables resume functionality
3. **Use phone number as identifier** - Survives app reinstall
4. **Make it extensible** - Easy to add new steps
5. **Track everything** - Analytics help improve conversion
6. **Security first** - Verify, encrypt, rate limit

---

---

## 📱 Frontend Developer Quick Start

### Environment Setup

```typescript
// config/api.ts
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
export const API_VERSION = 'v1';
export const REGISTRATION_BASE = `${API_BASE_URL}/api/${API_VERSION}/auth/register`;
```

### TypeScript Interfaces

```typescript
// types/registration.ts

// Step 1: Start Registration
export interface StartRegistrationRequest {
  phone_number: string;      // Required: E.164 format (+234XXXXXXXXXX)
  referral_code?: string;    // Optional: 3-20 alphanumeric characters
}

export interface StartRegistrationResponse {
  success: boolean;
  message: string;
  data: {
    session_id: string;
    step: number;
    next_step: string;
    otp_sent: boolean;
    otp_expires_in: number;  // seconds
  };
}

// Step 2: Verify OTP
export interface VerifyOTPRequest {
  phone_number: string;
  otp: string;  // 4-digit numeric code
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  data: {
    step: number;
    is_phone_verified: boolean;
    next_step: string;
    can_proceed: boolean;
  };
}

// Step 3: Submit ID
export interface SubmitIDRequest {
  phone_number: string;
  id_type: "BVN" | "NIN" | "PASSPORT" | "DRIVERS_LICENSE" | "PVC";
  id_number: string;
}

export interface SubmitIDResponse {
  success: boolean;
  message: string;
  data: {
    step: number;
    verification_status: "verified" | "pending" | "failed";
    verification_reference?: string;
    can_proceed: boolean;
    next_step: string;
  };
}

// Resume Registration
export interface ResumeRegistrationResponse {
  success: boolean;
  message: string;
  data: {
    current_step: number;
    total_steps: number;
    progress_percentage: number;
    registration_data: RegistrationData;
    next_step: string;
    completed_steps: number[];
    is_complete: boolean;
  };
}

// Error Response
export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  retry_after?: number;  // seconds (for rate limit errors)
}
```

### API Client Example

```typescript
// services/registration.service.ts
import axios from 'axios';
import { REGISTRATION_BASE } from '../config/api';

export class RegistrationService {
  // Step 1: Start Registration
  static async startRegistration(data: StartRegistrationRequest) {
    const response = await axios.post(
      `${REGISTRATION_BASE}/start`,
      data
    );
    return response.data;
  }

  // Step 2: Verify OTP
  static async verifyOTP(data: VerifyOTPRequest) {
    const response = await axios.post(
      `${REGISTRATION_BASE}/step-2/verify-otp`,
      data
    );
    return response.data;
  }

  // Step 3: Submit ID
  static async submitID(data: SubmitIDRequest) {
    const response = await axios.post(
      `${REGISTRATION_BASE}/step-3/submit-id`,
      data
    );
    return response.data;
  }

  // Resume Registration
  static async resumeRegistration(phoneNumber: string) {
    const response = await axios.get(
      `${REGISTRATION_BASE}/resume`,
      { params: { phone_number: phoneNumber } }
    );
    return response.data;
  }

  // Check Step Status
  static async checkStepStatus(phoneNumber: string, step: number) {
    const response = await axios.get(
      `${REGISTRATION_BASE}/step-status`,
      { params: { phone_number: phoneNumber, step } }
    );
    return response.data;
  }
}
```

### Phone Number Validation

```typescript
// utils/validation.ts

export function validatePhoneNumber(phone: string): boolean {
  // E.164 format: +234XXXXXXXXXX
  const phoneRegex = /^\+234[0-9]{10}$/;
  return phoneRegex.test(phone);
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with +234
  if (digits.startsWith('0')) {
    return '+234' + digits.substring(1);
  }
  
  // If starts with 234, add +
  if (digits.startsWith('234')) {
    return '+' + digits;
  }
  
  // If 10 digits, assume Nigerian number
  if (digits.length === 10) {
    return '+234' + digits;
  }
  
  return phone;
}

export function validateReferralCode(code: string): boolean {
  // Alphanumeric, 3-20 characters
  const referralRegex = /^[A-Za-z0-9]{3,20}$/;
  return referralRegex.test(code);
}
```

### Error Handling

```typescript
// utils/errorHandler.ts

export function handleRegistrationError(error: any): string {
  if (error.response?.data?.error) {
    const errorCode = error.response.data.error;
    
    switch (errorCode) {
      case 'PHONE_ALREADY_EXISTS':
        return 'This phone number is already registered. Please login instead.';
      
      case 'INVALID_PHONE_FORMAT':
        return 'Please enter a valid phone number in format: +234XXXXXXXXXX';
      
      case 'INVALID_REFERRAL_CODE':
        return 'Invalid referral code. Please check and try again.';
      
      case 'RATE_LIMIT_EXCEEDED':
        const retryAfter = error.response.data.retry_after || 3600;
        const minutes = Math.ceil(retryAfter / 60);
        return `Too many requests. Please try again in ${minutes} minute(s).`;
      
      case 'OTP_EXPIRED':
        return 'OTP has expired. Please request a new one.';
      
      case 'INVALID_OTP':
        return 'Invalid OTP. Please check and try again.';
      
      case 'ID_VERIFICATION_FAILED':
        return 'ID verification failed. Please check your details and try again.';
      
      default:
        return error.response.data.message || 'An error occurred. Please try again.';
    }
  }
  
  return 'Network error. Please check your connection and try again.';
}
```

### Usage Example

```typescript
// components/RegistrationFlow.tsx

import { RegistrationService } from '../services/registration.service';
import { validatePhoneNumber, formatPhoneNumber } from '../utils/validation';
import { handleRegistrationError } from '../utils/errorHandler';

async function handleStep1(phoneNumber: string, referralCode?: string) {
  try {
    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Validate
    if (!validatePhoneNumber(formattedPhone)) {
      throw new Error('Invalid phone number format');
    }
    
    // Start registration
    const response = await RegistrationService.startRegistration({
      phone_number: formattedPhone,
      referral_code: referralCode
    });
    
    if (response.success) {
      // Navigate to OTP verification step
      navigateToStep(2);
      // Store session_id if needed
      setSessionId(response.data.session_id);
    }
  } catch (error) {
    const errorMessage = handleRegistrationError(error);
    showError(errorMessage);
  }
}
```

### HTTP Status Codes Reference

| Status Code | Meaning | When It Occurs |
|------------|---------|----------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid input data, validation failed |
| 409 | Conflict | Phone number already registered |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error, retry later |
| 503 | Service Unavailable | Service temporarily unavailable |

### Rate Limiting

- **OTP Requests**: Maximum 3 requests per hour per phone number
- **ID Verification**: Maximum 3 attempts per phone number (24-hour lock after 3 failures)
- **General Endpoints**: 100 requests per minute per IP address

### Testing

```typescript
// Test phone numbers (for development)
const TEST_PHONE_NUMBERS = {
  valid: '+2348012345678',
  invalid: '08012345678',  // Missing +234
  alreadyRegistered: '+2348099999999'
};

// Test referral codes
const TEST_REFERRAL_CODES = {
  valid: 'ABC123',
  invalid: 'INVALID',
  nonExistent: 'XYZ999'
};
```

---

**Last Updated:** 2024
**Version:** 1.0.0


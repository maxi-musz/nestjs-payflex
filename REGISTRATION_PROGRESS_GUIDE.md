# Multi-Step Registration Progress Tracking Guide

## 🎯 Problem Statement

When users start registration but don't complete it:
- User enters phone number → verifies OTP → closes app
- User uninstalls app → reinstalls → should continue from where they stopped
- Need to track registration progress across sessions

## 🏆 How Industry Leaders Handle This

### **Approach 1: Temporary User Records (Recommended)**
**Used by:** Paystack, Flutterwave, Kuda Bank, Opay

**How it works:**
1. Create a **temporary/incomplete user record** when phone number is verified
2. Store registration progress in database as user completes steps
3. User can resume from any step using phone number
4. Only create "active" account when registration is 100% complete

**Benefits:**
- ✅ Progress persists across app reinstalls
- ✅ Can resume from any step
- ✅ Can track abandonment rates
- ✅ Can send reminder notifications
- ✅ Secure (phone number is verified)

### **Approach 2: Registration Session Tokens**
**Used by:** Some fintech apps

**How it works:**
1. Generate temporary session token after phone verification
2. Store progress in Redis/cache with session token
3. Token expires after 24-48 hours
4. User must restart if token expires

**Limitations:**
- ❌ Progress lost if token expires
- ❌ Doesn't survive app reinstall (unless token stored securely)

### **Approach 3: Local Storage Only**
**Used by:** Basic apps (NOT recommended for fintech)

**Limitations:**
- ❌ Lost on app uninstall
- ❌ Lost on device change
- ❌ Not secure

---

## 💡 Recommended Solution: Temporary User Records

### Database Schema

Add a new model to track registration progress:

```prisma
model RegistrationProgress {
  id                    String   @id @default(uuid())
  phone_number          String   @unique  // Primary identifier
  current_step          Int      @default(1)  // Current step (1-10)
  total_steps           Int      @default(10)
  registration_data     Json?    @default("{}")  // Store all entered data
  is_phone_verified    Boolean  @default(false)
  is_complete           Boolean  @default(false)
  expires_at            DateTime?  // Optional: expire incomplete registrations after 30 days
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([phone_number])
  @@index([is_complete])
}
```

### Registration Steps Enum

```prisma
enum RegistrationStep {
  PHONE_ENTRY          // Step 1
  PHONE_VERIFICATION   // Step 2
  ID_TYPE_SELECTION   // Step 3
  ID_NUMBER_ENTRY     // Step 4
  PERSONAL_INFO        // Step 5
  ADDRESS_INFO         // Step 6
  PROFILE_IMAGE        // Step 7
  PASSWORD_SETUP       // Step 8
  TERMS_ACCEPTANCE     // Step 9
  COMPLETE             // Step 10
}
```

---

## 🔄 Registration Flow

### Step 1: Phone Number Entry
```
POST /api/v1/auth/register/start
Body: { "phone_number": "+2348012345678" }

Response: {
  "success": true,
  "data": {
    "session_id": "uuid",
    "step": 1,
    "next_step": "PHONE_VERIFICATION"
  }
}
```

### Step 2: Phone Verification
```
POST /api/v1/auth/register/verify-phone
Body: {
  "phone_number": "+2348012345678",
  "otp": "1234"
}

Response: {
  "success": true,
  "data": {
    "session_id": "uuid",
    "step": 2,
    "is_phone_verified": true,
    "next_step": "ID_TYPE_SELECTION"
  }
}
```

### Step 3-N: Save Progress After Each Step
```
POST /api/v1/auth/register/save-progress
Body: {
  "phone_number": "+2348012345678",
  "step": 3,
  "data": {
    "id_type": "NIN",
    "id_number": "12345678901"
  }
}

Response: {
  "success": true,
  "data": {
    "current_step": 3,
    "next_step": "ID_NUMBER_ENTRY",
    "progress_percentage": 30
  }
}
```

### Resume Registration
```
GET /api/v1/auth/register/resume?phone_number=+2348012345678

Response: {
  "success": true,
  "data": {
    "current_step": 3,
    "total_steps": 10,
    "progress_percentage": 30,
    "registration_data": {
      "phone_number": "+2348012345678",
      "is_phone_verified": true,
      "id_type": "NIN",
      "id_number": "12345678901"
    },
    "next_step": "ID_NUMBER_ENTRY"
  }
}
```

### Complete Registration
```
POST /api/v1/auth/register/complete
Body: {
  "phone_number": "+2348012345678",
  "password": "securepassword123"
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

---

## 🔐 Security Considerations

1. **Phone Number Verification Required**
   - User must verify phone before saving any data
   - Prevents spam/fake registrations

2. **OTP Expiry**
   - OTP expires after 5-10 minutes
   - Phone verification required for each session

3. **Registration Expiry**
   - Incomplete registrations expire after 30 days
   - Clean up old incomplete registrations

4. **Rate Limiting**
   - Limit OTP requests per phone number
   - Prevent abuse

5. **Data Encryption**
   - Encrypt sensitive data in `registration_data` JSON
   - Don't store passwords until final step

---

## 📱 Frontend Implementation

### Check Registration Status on App Launch

```typescript
// On app launch
async function checkRegistrationStatus(phoneNumber: string) {
  try {
    const response = await fetch(
      `${API_URL}/auth/register/resume?phone_number=${phoneNumber}`
    );
    const data = await response.json();
    
    if (data.success && data.data.current_step < 10) {
      // Resume registration from saved step
      navigateToStep(data.data.current_step);
      loadSavedData(data.data.registration_data);
    } else {
      // Start fresh registration
      navigateToStep(1);
    }
  } catch (error) {
    // No existing registration, start fresh
    navigateToStep(1);
  }
}
```

### Save Progress After Each Step

```typescript
async function saveRegistrationProgress(step: number, data: any) {
  await fetch(`${API_URL}/auth/register/save-progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone_number: phoneNumber,
      step: step,
      data: data
    })
  });
}
```

---

## 🗄️ Database Migration

```sql
-- Add registration progress table
CREATE TABLE "RegistrationProgress" (
  "id" TEXT NOT NULL,
  "phone_number" TEXT NOT NULL UNIQUE,
  "current_step" INTEGER NOT NULL DEFAULT 1,
  "total_steps" INTEGER NOT NULL DEFAULT 10,
  "registration_data" JSONB DEFAULT '{}',
  "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
  "is_complete" BOOLEAN NOT NULL DEFAULT false,
  "expires_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationProgress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationProgress_phone_number_idx" ON "RegistrationProgress"("phone_number");
CREATE INDEX "RegistrationProgress_is_complete_idx" ON "RegistrationProgress"("is_complete");
```

---

## ✅ Benefits of This Approach

1. **Survives App Reinstall**
   - Progress stored on backend
   - User can continue using phone number

2. **Analytics & Insights**
   - Track where users drop off
   - Identify problematic steps
   - Measure completion rates

3. **User Experience**
   - No need to restart from beginning
   - Seamless continuation
   - Can send reminder notifications

4. **Security**
   - Phone number verification required
   - Data encrypted
   - Rate limiting prevents abuse

---

## 🚀 Implementation Priority

1. **Phase 1:** Add `RegistrationProgress` model to schema
2. **Phase 2:** Create endpoints for save/resume progress
3. **Phase 3:** Update frontend to save progress after each step
4. **Phase 4:** Add cleanup job for expired registrations
5. **Phase 5:** Add analytics tracking

---

## 📊 Example: How Kuda Bank Does It

1. User enters phone → Creates temporary record
2. Verifies OTP → Marks phone as verified
3. Each step saves to `registration_data` JSON
4. If user closes app → Progress saved
5. User reopens → Checks phone number → Resumes from saved step
6. Completes all steps → Creates actual User account → Deletes temporary record

---

## ⚠️ Important Notes

1. **Don't create User record until registration is 100% complete**
2. **Clean up incomplete registrations after 30 days**
3. **Validate phone number before allowing resume**
4. **Encrypt sensitive data in registration_data**
5. **Track abandonment rates for each step**


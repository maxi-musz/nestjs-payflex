# Step Pending Status System

This document explains the comprehensive step pending status system that helps the app determine which screen to show for each registration step.

## Overview

The system provides detailed flags for each step indicating whether it's pending verification. This allows the app to:
- Show verification pending screens when appropriate
- Show entry forms when user needs to submit information
- Show success screens when steps are completed and verified

## Response Structure

When calling `POST /auth/check-login-status`, the response includes comprehensive pending status for all steps:

```json
{
  "success": true,
  "message": "Registration in progress",
  "data": {
    "current_step": 3,
    "next_step": "ID_INFORMATION",
    "can_proceed": false,
    
    // Step Pending Flags (one for each step 1-9)
    "is_step_1_pending": false,
    "is_step_2_pending": false,
    "is_step_3_pending": true,  // ← ID verification is pending
    "is_step_4_pending": false,
    "is_step_5_pending": false,
    "is_step_6_pending": false,
    "is_step_7_pending": false,
    "is_step_8_pending": false,
    "is_step_9_pending": false,
    
    // Step Verification Status (for steps that require verification)
    "step_2_verification_status": "verified",  // OTP verified
    "step_3_verification_status": "pending",    // ID verification pending
    "step_4_verification_status": null,         // Face verification not started
    
    // Detailed steps object
    "steps": {
      "step_3": {
        "completed": true,
        "verified": false,
        "name": "ID Information",
        "id_type": "NIN",
        "id_number": "123***890",
        "verification_status": "pending"
      }
    }
  }
}
```

## Steps That Can Be Pending

Only steps that require verification can be in pending state:

1. **Step 2 - OTP Verification**
   - Pending when: OTP sent but not verified yet
   - Flag: `is_step_2_pending`
   - Status: `step_2_verification_status` (uses `is_phone_verified` field)

2. **Step 3 - ID Information**
   - Pending when: ID (NIN/BVN) submitted but verification is pending
   - Flag: `is_step_3_pending`
   - Status: `step_3_verification_status` (values: "pending", "verified", "failed")

3. **Step 4 - Face Verification**
   - Pending when: Face verification submitted but processing
   - Flag: `is_step_4_pending`
   - Status: `step_4_verification_status` (values: "pending", "verified", "failed")

## App Decision Logic

### Recommended Flow

```typescript
function determineScreen(response: ApiResponse) {
  const currentStep = response.data.current_step;
  const pendingKey = `is_step_${currentStep}_pending`;
  const isPending = response.data[pendingKey];
  
  if (isPending) {
    // Show verification pending screen for current step
    return {
      screen: 'VERIFICATION_PENDING',
      step: currentStep,
      message: response.data.message,
      verificationStatus: response.data[`step_${currentStep}_verification_status`]
    };
  }
  
  if (!response.data.can_proceed) {
    // Show entry form for current step
    return {
      screen: 'STEP_ENTRY',
      step: currentStep,
      message: response.data.message
    };
  }
  
  // Can proceed to next step
  return {
    screen: 'STEP_ENTRY',
    step: response.data.next_step,
    message: response.data.message
  };
}
```

### Example Scenarios

#### Scenario 1: ID Verification Pending
```json
{
  "current_step": 3,
  "is_step_3_pending": true,
  "step_3_verification_status": "pending",
  "can_proceed": false
}
```
**App Action:** Show "ID Verification Pending" screen with waiting message

#### Scenario 2: OTP Not Verified Yet
```json
{
  "current_step": 2,
  "is_step_2_pending": false,  // OTP not pending, just not verified
  "step_2_verification_status": null,
  "can_proceed": true
}
```
**App Action:** Show OTP entry form

#### Scenario 3: Face Verification Pending
```json
{
  "current_step": 4,
  "is_step_4_pending": true,
  "step_4_verification_status": "pending",
  "can_proceed": false
}
```
**App Action:** Show "Face Verification Pending" screen

## Step Pending Logic

A step is considered **pending** when:
1. ✅ Step requires verification (`requiresVerification: true`)
2. ✅ Step is completed (user has submitted the information)
3. ✅ Step is NOT verified yet
4. ✅ Verification status is `"pending"`

### Formula
```typescript
isStepPending = 
  step.requiresVerification &&
  step.isCompleted &&
  !step.isVerified &&
  verificationStatus === "pending"
```

## Verification Status Values

For steps with verification status fields:

- `"pending"`: Verification is in progress, user must wait
- `"verified"`: Verification completed successfully, user can proceed
- `"failed"`: Verification failed, user needs to retry
- `null`: Verification not started yet

## Backward Compatibility

The response still includes these fields for backward compatibility:
- `is_waiting_for_verification`: Boolean for current step only
- `verification_status`: Status for current step only

**Recommendation:** Use the new `is_step_X_pending` flags instead for better control.

## Benefits

1. **Clear State Management**: App knows exactly which steps are pending
2. **Better UX**: Can show appropriate screens (pending vs entry form)
3. **Future-Proof**: Easy to add new steps without breaking existing logic
4. **Comprehensive**: All steps tracked, not just current step
5. **Professional**: Clean, structured approach to state management

## Testing Checklist

- [ ] Step 2 (OTP) pending state works correctly
- [ ] Step 3 (ID) pending state works correctly  
- [ ] Step 4 (Face) pending state works correctly
- [ ] App shows pending screen when `is_step_X_pending: true`
- [ ] App shows entry form when `is_step_X_pending: false` and `can_proceed: false`
- [ ] App shows next step when `can_proceed: true`


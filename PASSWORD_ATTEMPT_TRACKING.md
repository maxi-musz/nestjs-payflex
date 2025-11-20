# Password Attempt Tracking Implementation

This document describes the password attempt tracking and account suspension feature.

## Overview

The login system now tracks failed password attempts and automatically suspends accounts after a configurable number of failed attempts within a time window.

## Database Changes

### Schema Updates

Added to `User` model in `prisma/schema.prisma`:

```prisma
enum AccountStatus {
  active
  suspended
}

model User {
  // ... existing fields
  account_status         AccountStatus?   @default(active)
  password_attempts      Int              @default(0)
  password_attempts_started_at DateTime?
  // ... rest of fields
}
```

### Migration Required

After updating the schema, you need to:

1. **Create and run migration:**
   ```bash
   npx prisma migrate dev --name add_password_attempt_tracking
   ```

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

## Configuration

Add these environment variables to your `.env` file:

```env
# Maximum number of password attempts before suspension (default: 3)
MAX_PASSWORD_TRIAL=3

# Time window in minutes for password attempts (default: 15)
# Attempts reset after this window expires
PASSWORD_ATTEMPT_WINDOW_MINUTES=15
```

## How It Works

### 1. Failed Password Attempt

When a user enters an incorrect password:
- Password attempt count is incremented
- If this is the first failed attempt, the start time is recorded
- Response includes `attempts_remaining` and `max_attempts`
- App can display warning to user

### 2. Successful Login

When password is correct:
- All password attempts are cleared (reset to 0)
- Start time is cleared
- User receives access token and can proceed

### 3. Account Suspension

When `password_attempts >= MAX_PASSWORD_TRIAL`:
- Account status is set to `suspended`
- User cannot login
- Response indicates account is suspended
- User must contact support

### 4. Attempt Window Expiry

If user doesn't attempt login for `PASSWORD_ATTEMPT_WINDOW_MINUTES`:
- Attempts are automatically reset to 0
- User gets a fresh set of attempts

### 5. Already Suspended Account

If account is already suspended:
- Login attempts are blocked immediately
- User is informed account is suspended
- Must contact support to reactivate

## Response Examples

### Failed Attempt (Not Suspended)

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

### Account Suspended

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

## App Implementation Guide

### Display Attempt Count

When receiving a failed password response:

```typescript
if (!response.success && response.data.attempts_remaining !== null) {
  const remaining = response.data.attempts_remaining;
  const max = response.data.max_attempts;
  
  showWarning(
    `Invalid password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account suspension.`
  );
}
```

### Handle Suspended Account

```typescript
if (response.data?.account_suspended) {
  showError(
    "Your account has been suspended due to multiple failed login attempts. Please contact support."
  );
  disablePasswordField();
  showContactSupportButton();
}
```

## Support Team Actions

To reactivate a suspended account:

1. **Via Database:**
   ```sql
   UPDATE "User" 
   SET 
     account_status = 'active',
     password_attempts = 0,
     password_attempts_started_at = NULL
   WHERE id = 'user-id';
   ```

2. **Via Prisma (in admin panel or script):**
   ```typescript
   await prisma.user.update({
     where: { id: userId },
     data: {
       account_status: 'active',
       password_attempts: 0,
       password_attempts_started_at: null,
     },
   });
   ```

## Security Considerations

1. **Attempt Window:** Prevents indefinite lockout - attempts reset after time window
2. **Clear on Success:** Successful login clears all attempts immediately
3. **Suspension is Permanent:** Once suspended, only support can reactivate
4. **No User Enumeration:** Generic error messages prevent revealing if user exists

## Testing

### Test Scenarios

1. **Normal Login Flow:**
   - Enter wrong password 2 times → See attempt count
   - Enter correct password on 3rd attempt → Login succeeds, attempts cleared

2. **Account Suspension:**
   - Enter wrong password 3 times → Account suspended
   - Try to login again → Blocked with suspension message

3. **Attempt Window Reset:**
   - Enter wrong password 1 time
   - Wait 15+ minutes
   - Attempts reset, get fresh attempts

4. **Successful Login Clears Attempts:**
   - Enter wrong password 2 times
   - Enter correct password → Login succeeds
   - Attempts cleared, can make mistakes again

## Troubleshooting

### Linter Errors After Schema Update

If you see TypeScript errors about missing properties:
1. Run `npx prisma generate` to regenerate Prisma client
2. Restart your TypeScript server/IDE

### Migration Issues

If migration fails:
1. Check database connection
2. Ensure no conflicting migrations
3. Review migration SQL in `prisma/migrations/`

### Account Stuck Suspended

To manually reactivate:
```sql
UPDATE "User" 
SET account_status = 'active', password_attempts = 0 
WHERE account_status = 'suspended';
```


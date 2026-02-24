# Referral System — User-Facing API

## Overview

Every user has a referral code (their `smipay_tag`). When someone registers using that code, a referral is tracked. Rewards are issued **automatically** when the referee completes their first successful transaction (configurable by admin).

**Flow:**
```
User A shares code "johndoe" → User B registers with code "johndoe"
  → Referral record created (status: pending)
  → User B funds wallet and makes first transaction (≥ ₦100)
  → Both wallets are credited automatically
  → User A gets ₦200, User B gets ₦100 (configurable)
```

---

## Endpoints

### Base Path
`/api/v1/referral`

---

### 1. Validate Referral Code
**GET** `/api/v1/referral/validate?code=johndoe`

**Auth:** None (used during registration before user has an account)

Call this when the user enters a referral code in the registration form to show real-time feedback.

#### Query Params
| Param | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | The referral code (smipay_tag) to validate |

#### Response — Valid
```json
{
  "valid": true,
  "referrer_name": "John"
}
```

#### Response — Invalid
```json
{
  "valid": false
}
```

Invalid when: code doesn't exist, user account is not active, referral program is disabled, or referrer has reached max referral limit.

#### UI Suggestion
- Show a green checkmark + "Referred by John" when valid
- Show a red X + "Invalid referral code" when invalid
- Debounce 500ms while user types

---

### 2. My Referrals
**GET** `/api/v1/referral/my-referrals`

**Auth:** JWT Bearer token

Returns the user's referral code, share message, program details, stats, and list of all their referrals.

#### Response
```json
{
  "success": true,
  "message": "Referral info fetched",
  "data": {
    "my_referral_code": "johndoe",
    "share_message": "Join me on Smipay! Use my referral code \"johndoe\" when you sign up and we both earn rewards. Download: https://smipay.app/download",
    "program": {
      "is_active": true,
      "referrer_reward": 200,
      "referee_reward": 100,
      "reward_trigger": "first_transaction",
      "max_referrals": 50
    },
    "stats": {
      "total_referrals": 12,
      "completed": 8,
      "pending": 4,
      "total_earned": 1600
    },
    "referrals": [
      {
        "id": "uuid",
        "friend_name": "Jane",
        "friend_avatar": "https://...",
        "status": "rewarded",
        "reward_earned": 200,
        "joined_at": "2026-02-20T10:00:00.000Z",
        "completed_first_tx": true,
        "created_at": "2026-02-20T10:00:00.000Z"
      },
      {
        "id": "uuid",
        "friend_name": "Ahmed",
        "friend_avatar": null,
        "status": "pending",
        "reward_earned": null,
        "joined_at": "2026-02-23T14:00:00.000Z",
        "completed_first_tx": false,
        "created_at": "2026-02-23T14:00:00.000Z"
      }
    ]
  }
}
```

---

## Registration Integration

When creating an account, pass `referral_code` in the registration payload:

```json
POST /api/v1/auth/register
{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "first_name": "New",
  "last_name": "User",
  "phone_number": "08098765432",
  "referral_code": "johndoe",
  ...
}
```

The backend will:
1. Validate the code (silently — won't fail registration if code is invalid)
2. Create a `Referral` record linking the referrer and referee
3. Monitor for the first successful transaction to trigger rewards

---

## Mobile App Screens

### Referral Screen (Invite Friends)

**On load:** Call `GET /referral/my-referrals`

**Layout:**
```
┌──────────────────────────────────────┐
│  Your Referral Code                  │
│  ┌────────────────────────┐          │
│  │     johndoe        [📋] │          │
│  └────────────────────────┘          │
│                                      │
│  [Share with Friends]                │
│                                      │
│  ₦200 for you, ₦100 for them        │
│  when they make their first          │
│  transaction                         │
├──────────────────────────────────────┤
│  Your Stats                          │
│  ┌────────┬────────┬─────────┐       │
│  │ 12     │ 8      │ ₦1,600  │       │
│  │ Total  │ Done   │ Earned  │       │
│  └────────┴────────┴─────────┘       │
├──────────────────────────────────────┤
│  Your Referrals                      │
│                                      │
│  [👤] Jane — ₦200 earned ✅          │
│  [👤] Ahmed — Pending ⏳             │
│       Waiting for first transaction  │
│  [👤] Sarah — ₦200 earned ✅         │
└──────────────────────────────────────┘
```

**Copy button:** Copy `my_referral_code` to clipboard
**Share button:** Use native share sheet with `share_message`

### Referral Status Labels

| Status | Display | Color |
|---|---|---|
| `pending` | "Waiting for first transaction" | Yellow |
| `eligible` | "Reward processing..." | Blue |
| `rewarded` | "₦200 earned" | Green |
| `expired` | "Expired" | Gray |
| `rejected` | "Not eligible" | Red |

### Registration Screen — Referral Code Field

- Optional field at the bottom of the registration form
- On blur or after debounce, call `GET /referral/validate?code=...`
- Show validation result inline
- If user came via a deep link with a code, pre-fill and validate

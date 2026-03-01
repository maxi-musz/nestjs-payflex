# User Module — Frontend API Documentation

**Base Path:** `/api/v1/user`
**Auth:** JWT Bearer token required on all endpoints

---

## 1. App Homepage Data

**GET** `/user/fetch-app-homepage-details`

Returns everything the app homepage needs: user info, wallet, accounts (DVA), recent transactions, KYC status, and current tier.

### Response

```json
{
  "success": true,
  "message": "User data john@example.com for app homepage successfully retrieved",
  "data": {
    "user": {
      "id": "uuid",
      "smipay_tag": "johndoe",
      "name": "John Doe",
      "isTransactionPinSetup": true,
      "phone_number": "+2341234567890",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "user",
      "profile_image": "https://res.cloudinary.com/...",
      "is_email_verified": true
    },

    "accounts": [
      {
        "id": "uuid",
        "account_holder_name": "JOHN DOE",
        "account_number": "0123456789",
        "bank_name": "Wema Bank",
        "currency": "ngn",
        "balance": "₦5,000.00",
        "isActive": true,
        "createdAt": "15 Jan 2026",
        "updatedAt": "20 Jan 2026"
      }
    ],

    "wallet_card": {
      "id": "uuid",
      "current_balance": "₦5,000.00",
      "all_time_fuunding": "₦50,000.00",
      "all_time_withdrawn": "₦20,000.00",
      "owned_currencies": ["ngn"],
      "isActive": true,
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "20 Jan 2026"
    },

    "cashback_wallet": {
      "current_balance": "₦250.00",
      "all_time_earned": "₦1,500.00",
      "all_time_withdrawn": "₦1,250.00"
    },

    "cashback_rates": [
      { "service": "airtime", "percentage": 2, "is_active": true },
      { "service": "data", "percentage": 1.5, "is_active": true },
      { "service": "cable", "percentage": 1, "is_active": true },
      { "service": "electricity", "percentage": 1, "is_active": true },
      { "service": "education", "percentage": 0.5, "is_active": true },
      { "service": "betting", "percentage": 0, "is_active": false },
      { "service": "international_airtime", "percentage": 1, "is_active": true }
    ],

    "transaction_history": [
      {
        "id": "uuid",
        "amount": 1000,
        "type": "wallet_funding",
        "provider": "paystack",
        "description": "Wallet funding via card",
        "credit_debit": "credit",
        "status": "successful",
        "date": "20 Jan 2026",
        "sender": null,
        "icon": "https://res.cloudinary.com/..."
      }
    ],

    "kyc_verification": {
      "id": "uuid",
      "is_verified": true,
      "status": "approved",
      "id_type": "NIGERIAN_BVN_VERIFICATION",
      "id_no": "12345678901",
      "bvn": "12345678901",
      "bvn_verified": true,
      "watchlisted": false,
      "initiated_at": "16 Jan 2026",
      "approved_at": "17 Jan 2026",
      "failure_reason": ""
    },

    "current_tier": {
      "tier": "VERIFIED",
      "name": "Verified Tier",
      "description": "KYC verified account with increased limits",
      "requirements": ["Phone verification", "Email verification", "KYC (BVN/NIN)"],
      "limits": {
        "singleTransaction": 100000,
        "daily": 500000,
        "monthly": 5000000,
        "airtimeDaily": 50000
      },
      "is_active": true
    },

    "reward_banners": [
      {
        "type": "referral",
        "title": "Refer & Earn 🎁",
        "message": "Invite a friend and earn ₦200.00 when they make their first transaction! Your friend gets ₦100.00 too.",
        "data": {
          "referrer_reward": 200,
          "referee_reward": 100
        }
      },
      {
        "type": "cashback",
        "title": "Cashback is Live 💰",
        "message": "Earn cashback on every purchase you make on SmiPay — airtime, data, bills and more. The more you transact, the more you earn!",
        "data": {
          "max_per_transaction": 500,
          "max_per_day": 2000
        }
      },
      {
        "type": "first_transaction",
        "title": "Welcome Bonus 🎉",
        "message": "Make your first transaction and earn ₦100.00 instantly! This is our gift to you for getting started.",
        "data": {
          "reward_amount": 100,
          "min_transaction_amount": 100
        }
      }
    ]
  }
}
```

---

## 2. User Profile Page

**GET** `/user/fetch-user-profile`
*(Also available at `/user/app-user-profile-page` — same response)*

Returns user profile, address, KYC, wallet, **current tier**, and **all available tiers** so the user can see upgrade paths.

### Response

```json
{
  "success": true,
  "message": "User profile successfully fetched",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "is_verified": true,
      "phone_number": "+2341234567890",
      "profile_image": "https://res.cloudinary.com/...",
      "gender": "male",
      "date_of_birth": "1990-01-15T00:00:00.000Z",
      "joined": "15 Jan 2026",
      "totalCards": 2,
      "totalAccounts": 1,
      "wallet_balance": 5000
    },

    "address": {
      "id": "uuid",
      "house_no": "123",
      "city": "Lagos",
      "state": "Lagos",
      "country": "Nigeria",
      "house_address": "123 Main Street, Victoria Island",
      "postal_code": "101241"
    },

    "kyc_verification": {
      "id": "uuid",
      "is_active": true,
      "status": "approved",
      "id_type": "NIGERIAN_BVN_VERIFICATION",
      "id_number": "12345678901"
    },

    "wallet_card": {
      "id": "uuid",
      "current_balance": "₦5,000.00",
      "all_time_fuunding": "₦50,000.00",
      "all_time_withdrawn": "₦20,000.00",
      "isActive": true,
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "20 Jan 2026"
    },

    "current_tier": {
      "tier": "VERIFIED",
      "name": "Verified Tier",
      "description": "KYC verified account with increased limits",
      "requirements": [
        "Phone number verification",
        "Email verification",
        "KYC verification (BVN/NIN)",
        "Face verification",
        "Address verification"
      ],
      "limits": {
        "singleTransaction": 100000,
        "daily": 500000,
        "monthly": 5000000,
        "airtimeDaily": 50000
      },
      "is_active": true
    },

    "available_tiers": [
      {
        "id": "uuid",
        "tier": "UNVERIFIED",
        "name": "Basic Tier",
        "description": "New account with basic transaction limits",
        "order": 1,
        "requirements": [
          "Phone number verification",
          "Email verification"
        ],
        "limits": {
          "singleTransaction": 50000,
          "daily": 200000,
          "monthly": 1000000,
          "airtimeDaily": 20000
        },
        "is_current": false
      },
      {
        "id": "uuid",
        "tier": "VERIFIED",
        "name": "Verified Tier",
        "description": "KYC verified account with increased limits",
        "order": 2,
        "requirements": [
          "Phone number verification",
          "Email verification",
          "KYC verification (BVN/NIN)",
          "Face verification",
          "Address verification"
        ],
        "limits": {
          "singleTransaction": 100000,
          "daily": 500000,
          "monthly": 5000000,
          "airtimeDaily": 50000
        },
        "is_current": true
      },
      {
        "id": "uuid",
        "tier": "PREMIUM",
        "name": "Premium Tier",
        "description": "Fully verified account with maximum transaction limits",
        "order": 3,
        "requirements": [
          "Phone number verification",
          "Email verification",
          "KYC verification (BVN/NIN)",
          "Face verification",
          "Address verification",
          "BVN verification",
          "Additional documentation (if required)"
        ],
        "limits": {
          "singleTransaction": 500000,
          "daily": 2000000,
          "monthly": 10000000,
          "airtimeDaily": 100000
        },
        "is_current": false
      }
    ]
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error fetching user details",
  "statusCode": 503
}
```

---

## 3. User KYC Data

**GET** `/user/fetch-user-kyc`

Returns the user's KYC verification details.

---

## 4. Update Profile

**PUT** `/user/update-profile`

Updates user profile fields (name, gender, date of birth, etc.).

---

## Field Notes

### User
| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | User's unique ID |
| `smipay_tag` | string | Unique username tag (e.g. `johndoe`) |
| `isTransactionPinSetup` | boolean | Whether user has set a transaction PIN |
| `is_email_verified` | boolean | Email verification status |
| `profile_image` | string | Cloudinary URL or `""` |
| `wallet_balance` | number | Raw balance (profile endpoint only) |

### Current Tier
| Field | Type | Notes |
|---|---|---|
| `tier` | string | Tier code (e.g. `UNVERIFIED`, `VERIFIED`, `PREMIUM`) |
| `name` | string | Display name |
| `description` | string | Human-readable description |
| `requirements` | string[] | List of what the user needs to reach this tier |
| `limits.singleTransaction` | number | Max ₦ per single transaction |
| `limits.daily` | number | Max ₦ per day |
| `limits.monthly` | number | Max ₦ per month |
| `limits.airtimeDaily` | number | Max ₦ airtime per day |
| `is_active` | boolean | Whether this tier is active in the system |

### Cashback Wallet
| Field | Type | Notes |
|---|---|---|
| `current_balance` | string | Formatted cashback balance the user can spend (e.g. `"₦250.00"`). Shows `"₦0.00"` if user has never earned cashback |
| `all_time_earned` | string | Total cashback earned across all purchases |
| `all_time_withdrawn` | string | Total cashback spent (used to pay for purchases) |

**How to use this on the frontend:**
- Display the cashback balance on the homepage (e.g. a small card or badge next to the main wallet)
- When `current_balance` is greater than `"₦0.00"`, show a "Use Cashback" toggle on the purchase screens (airtime, data, etc.)
- When the user toggles "Use Cashback" on, send `use_cashback: true` in the purchase request body — the backend handles the split automatically
- The cashback balance is separate from the main wallet — it can only be used to partially or fully pay for utility purchases

### Cashback Rates
| Field | Type | Notes |
|---|---|---|
| `service` | string | Service type: `airtime`, `data`, `cable`, `electricity`, `education`, `betting`, `international_airtime` |
| `percentage` | number | Cashback percentage for this service (e.g. `2` means 2%). Will be `0` if the service is disabled |
| `is_active` | boolean | Whether cashback is currently active for this service |

**How to use this on the frontend:**
- Use `cashback_rates` to display a cashback badge on each service quick link (e.g. "2% cashback" on the airtime button)
- Only show the badge when `is_active` is `true` and `percentage` is greater than `0`
- If **all** items have `is_active: false`, the admin has turned off the entire cashback program — hide all cashback UI
- These rates are managed by the admin and can change at any time — always use the latest values from this endpoint

### Reward Banners (Homepage only)

An array of 0–3 banner objects for a horizontally scrolling promotional carousel on the homepage. Each banner represents an active reward program the user can benefit from. **If the array is empty, there are no active promotions — hide the carousel entirely.**

| Field | Type | Notes |
|---|---|---|
| `type` | string | Banner type: `"referral"`, `"cashback"`, or `"first_transaction"` — use this to apply distinct styling/colors per banner |
| `title` | string | Short headline with emoji (e.g. `"Refer & Earn 🎁"`) — display as the banner title |
| `message` | string | Ready-to-display promotional text with real amounts from the admin config. Includes ₦ formatting. |
| `data` | object | Raw numeric values in case you want to format differently or build custom UI (see below) |

#### Banner-specific `data` fields

**`type: "referral"`**

| Field | Type | Notes |
|---|---|---|
| `data.referrer_reward` | number | ₦ the referrer earns (e.g. `200`) |
| `data.referee_reward` | number | ₦ the referred friend earns (e.g. `100`) |

**`type: "cashback"`**

| Field | Type | Notes |
|---|---|---|
| `data.max_per_transaction` | number | Maximum ₦ cashback per single purchase |
| `data.max_per_day` | number | Maximum ₦ cashback per day across all purchases |

**`type: "first_transaction"`**

| Field | Type | Notes |
|---|---|---|
| `data.reward_amount` | number | ₦ bonus the user will receive on their first transaction |
| `data.min_transaction_amount` | number | Minimum ₦ the first transaction must be to qualify |

#### When each banner appears / disappears

| Banner | Shows when | Hides when |
|---|---|---|
| **referral** | Admin has enabled the referral program | Referral program is turned off |
| **cashback** | Admin has enabled the cashback program | Cashback program is turned off |
| **first_transaction** | Program is active AND user has NOT yet received the bonus AND current date is within the campaign window | User already received the bonus, OR program is off, OR outside campaign dates |

#### How to use on the frontend

- Render the `reward_banners` array as a **horizontally scrolling banner carousel** on the homepage
- Use the `type` field to apply distinct background colors / gradients per banner (e.g. purple for referral, green for cashback, gold for first transaction)
- Display `title` as the headline and `message` as the body text
- If you need custom formatting, use the raw numbers in `data` instead of the pre-formatted `message`
- The `first_transaction` banner is **personalized** — it only appears for users who haven't earned the bonus yet, so it acts as a call-to-action for new users
- When a user taps a banner, navigate to the relevant screen (referral → share referral code, cashback → purchase screen, first_transaction → purchase screen)
- The array order is: referral first, cashback second, first_transaction third (if all three are active)

#### Example: All three banners active (new user)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◀  [ Refer & Earn 🎁 ]  [ Cashback is Live 💰 ]  [ Welcome Bonus 🎉 ]  ▶  │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Example: Only cashback active (existing user who already got first-tx bonus, referral off)

```
┌──────────────────────────────────────────────┐
│          [ Cashback is Live 💰 ]              │
└──────────────────────────────────────────────┘
```

#### Example: No active programs

```json
"reward_banners": []
```

No carousel rendered.

---

### Available Tiers (Profile endpoint only)
Same fields as `current_tier`, plus:

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Tier ID |
| `order` | number | Sort order (1 = lowest tier, higher = better) |
| `is_current` | boolean | `true` if this is the user's current tier |

### Tier Upgrade UI Suggestion

Use `available_tiers` to build an "Account Tiers" or "Upgrade Account" screen:

```
┌──────────────────────────────────────────────────────┐
│  Account Tiers                                        │
│                                                       │
│  ┌──────────────────────────────────────────────┐     │
│  │  ✓  Basic Tier (Current)                     │     │
│  │      ₦50,000/tx · ₦200,000/day              │     │
│  └──────────────────────────────────────────────┘     │
│                                                       │
│  ┌──────────────────────────────────────────────┐     │
│  │  ★  Verified Tier                            │     │
│  │      ₦100,000/tx · ₦500,000/day             │     │
│  │                                              │     │
│  │  Requirements:                               │     │
│  │  ✓ Phone verification                        │     │
│  │  ✓ Email verification                        │     │
│  │  ✗ KYC verification (BVN/NIN)               │     │
│  │  ✗ Face verification                         │     │
│  │  ✗ Address verification                      │     │
│  │                                              │     │
│  │           [ Start Upgrade →]                 │     │
│  └──────────────────────────────────────────────┘     │
│                                                       │
│  ┌──────────────────────────────────────────────┐     │
│  │  ◆  Premium Tier                             │     │
│  │      ₦500,000/tx · ₦2,000,000/day           │     │
│  │                                              │     │
│  │  Requirements:                               │     │
│  │  ✓ Phone verification                        │     │
│  │  ✓ Email verification                        │     │
│  │  ✗ KYC + BVN verification                   │     │
│  │  ✗ Face verification                         │     │
│  │  ✗ Address + additional docs                 │     │
│  │                                              │     │
│  │            [ Locked 🔒 ]                     │     │
│  └──────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

**Tips:**
- Sort tiers by `order` (ascending)
- Highlight the `is_current: true` tier
- Cross-reference requirements with `kyc_verification` data to show ✓/✗
- Only show "Start Upgrade" on the **next** tier above current
- Show "Locked" on tiers that are 2+ levels above current
- All limit amounts are in ₦ (Nigerian Naira)

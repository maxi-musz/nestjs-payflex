# Referral Management — Admin API

## Base Path
`/api/v1/unified-admin/referrals`

**Auth:** JWT Bearer token (admin role required)

## What Admin Can Do
1. **View all referrals** — analytics dashboard + table of every referral
2. **Top referrers leaderboard** — who's referring the most users
3. **Manage reward settings** — change reward amounts (₦), toggle program on/off, change reward trigger, set limits
4. **Manually approve & issue rewards** — force-pay rewards for any referral
5. **Reject referrals** — block fraudulent/suspicious referrals

---

## 1. List Referrals (Analytics + Table)
**GET** `/api/v1/unified-admin/referrals`

### Query Params

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |
| `status` | string | — | Filter by: `pending`, `eligible`, `rewarded`, `partially_rewarded`, `expired`, `rejected` |
| `referrer_id` | string | — | Filter by referrer user UUID |
| `search` | string | — | Searches referral code, phone, email, smipay_tag |
| `date_from` | string | — | Start date (ISO 8601) |
| `date_to` | string | — | End date |

### Response
```json
{
  "success": true,
  "message": "Referrals fetched",
  "data": {
    "analytics": {
      "overview": {
        "total_referrals": 1250,
        "today": 15,
        "this_week": 85,
        "this_month": 340,
        "total_rewarded": 920,
        "total_paid_out": 276000
      },
      "by_status": {
        "pending": 200,
        "eligible": 30,
        "rewarded": 920,
        "expired": 85,
        "rejected": 15
      },
      "config": {
        "is_active": true,
        "referrer_reward": 200,
        "referee_reward": 100,
        "reward_trigger": "first_transaction",
        "max_per_user": 50,
        "expiry_days": 90,
        "min_tx_amount": 100
      }
    },
    "referrals": [
      {
        "id": "uuid",
        "referrer_id": "uuid",
        "referee_user_id": "uuid",
        "referee_phone_number": "+2348012345678",
        "referral_code_used": "johndoe",
        "status": "rewarded",
        "is_active": true,
        "referee_registered": true,
        "referee_registered_at": "2026-02-20T10:00:00.000Z",
        "referee_first_tx": true,
        "referee_first_tx_at": "2026-02-20T12:30:00.000Z",
        "referrer_reward_given": true,
        "referrer_reward_amount": 200,
        "referrer_reward_given_at": "2026-02-20T12:30:00.000Z",
        "referee_reward_given": true,
        "referee_reward_amount": 100,
        "referee_reward_given_at": "2026-02-20T12:30:00.000Z",
        "manually_approved": false,
        "manually_rejected": false,
        "createdAt": "2026-02-20T10:00:00.000Z",
        "referrer": {
          "id": "uuid",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com",
          "smipay_tag": "johndoe",
          "profile_image": { "secure_url": "https://..." }
        },
        "referee": {
          "id": "uuid",
          "first_name": "Jane",
          "last_name": "Smith",
          "email": "jane@example.com",
          "smipay_tag": "janesmith",
          "phone_number": "+2348012345678",
          "profile_image": null
        }
      }
    ],
    "meta": {
      "total": 1250,
      "page": 1,
      "limit": 20,
      "total_pages": 63
    }
  }
}
```

### Analytics UI Suggestion

```
┌────────────┬────────────┬────────────┬────────────┬──────────────┐
│ Total      │ Today      │ This Week  │ Rewarded   │ Total Paid   │
│  1,250     │   15       │   85       │   920      │  ₦276,000    │
└────────────┴────────────┴────────────┴────────────┴──────────────┘

┌──────────────────────────────────────┬───────────────────────────┐
│  Status Breakdown (donut)            │  Config Summary            │
│  ● Rewarded    920 (73.6%)           │  Active: Yes               │
│  ● Pending     200 (16.0%)           │  Referrer: ₦200            │
│  ● Expired      85 (6.8%)           │  Referee: ₦100             │
│  ● Eligible     30 (2.4%)           │  Trigger: First Transaction│
│  ● Rejected     15 (1.2%)           │  Max/User: 50              │
└──────────────────────────────────────┴───────────────────────────┘
```

### Table Columns

| Column | Source | Notes |
|---|---|---|
| Date | `createdAt` | When referral was created |
| Referrer | `referrer.first_name` + `smipay_tag` | Link to user profile |
| Referee | `referee.first_name` + `phone_number` | Link to user profile |
| Code Used | `referral_code_used` | The smipay_tag entered |
| Status | `status` | Colored badge |
| Registered | `referee_registered_at` | When referee signed up |
| First Tx | `referee_first_tx_at` | When milestone was hit |
| Referrer Reward | `referrer_reward_amount` | Show ₦ or "—" |
| Referee Reward | `referee_reward_amount` | Show ₦ or "—" |
| Actions | — | Approve / Reject buttons for pending/eligible |

---

## 2. Top Referrers Leaderboard
**GET** `/api/v1/unified-admin/referrals/top-referrers?limit=20`

### Response
```json
{
  "success": true,
  "message": "Top referrers fetched",
  "data": {
    "leaderboard": [
      {
        "user": {
          "id": "uuid",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com",
          "smipay_tag": "johndoe",
          "profile_image": { "secure_url": "https://..." }
        },
        "referral_count": 45,
        "total_earned": 9000
      }
    ]
  }
}
```

---

## 3. Manage Referral Rewards & Program Settings

This is where admin controls the reward amounts, enables/disables the program, and configures all referral rules.

### 3a. Get Current Config
**GET** `/api/v1/unified-admin/referrals/config`

#### Response
```json
{
  "success": true,
  "message": "Referral config updated",
  "data": {
    "id": "referral_config",
    "is_active": true,
    "referrer_reward_amount": 200,
    "referee_reward_amount": 100,
    "reward_trigger": "first_transaction",
    "max_referrals_per_user": 50,
    "referral_expiry_days": 90,
    "min_transaction_amount": 100,
    "updated_by": "admin-uuid",
    "updatedAt": "2026-02-24T12:00:00.000Z",
    "createdAt": "2026-02-01T00:00:00.000Z"
  }
}
```

### 3b. Update Config (Change Reward Amounts, Toggle Program, etc.)
**PUT** `/api/v1/unified-admin/referrals/config`

All fields are optional — send only the ones you want to change.

#### Example: Change reward amounts
```json
{
  "referrer_reward_amount": 500,
  "referee_reward_amount": 250
}
```

#### Example: Disable the program
```json
{
  "is_active": false
}
```

#### Example: Change reward trigger to "on registration" (instant reward)
```json
{
  "reward_trigger": "registration"
}
```

#### Full payload reference

| Field | Type | Current Default | Description |
|---|---|---|---|
| `is_active` | boolean | `true` | **Master switch** — enable/disable the entire referral program |
| `referrer_reward_amount` | number | `200` | ₦ amount the **referrer** (person who shared the code) receives |
| `referee_reward_amount` | number | `100` | ₦ amount the **referee** (person who used the code) receives |
| `reward_trigger` | string | `first_transaction` | **When rewards are issued.** Options: `first_transaction` (after referee's first successful tx), `kyc_verified` (after KYC), `registration` (immediately on signup) |
| `max_referrals_per_user` | number | `50` | Max people one user can refer |
| `referral_expiry_days` | number | `90` | Days before a pending referral expires (referee hasn't met trigger) |
| `min_transaction_amount` | number | `100` | Minimum ₦ amount for the first tx to count as the trigger |

#### Response
Returns the updated config (same shape as the GET response above).

### Settings UI Suggestion

Build this as a **Settings tab/section** within the Referral management page:

```
┌──────────────────────────────────────────────────────────────┐
│  Referral Program Settings                                    │
│                                                               │
│  Program Status                                               │
│  ┌─────────────────────────────────────────────┐              │
│  │  Referral Program Active     [Toggle: ON ]  │              │
│  └─────────────────────────────────────────────┘              │
│                                                               │
│  Reward Amounts                                               │
│  ┌──────────────────────┬──────────────────────┐              │
│  │  Referrer Gets       │  Referee Gets        │              │
│  │  ₦ [ 200         ]   │  ₦ [ 100         ]   │              │
│  │  (person who shared) │  (person who joined) │              │
│  └──────────────────────┴──────────────────────┘              │
│                                                               │
│  Reward Trigger                                               │
│  ┌─────────────────────────────────────────────┐              │
│  │  When should rewards be issued?             │              │
│  │                                             │              │
│  │  ○ On Registration (instant, riskier)       │              │
│  │  ○ After KYC Verification                   │              │
│  │  ● After First Transaction (recommended)    │              │
│  │                                             │              │
│  │  Min Transaction Amount: ₦ [ 100 ]          │              │
│  └─────────────────────────────────────────────┘              │
│                                                               │
│  Limits                                                       │
│  ┌──────────────────────┬──────────────────────┐              │
│  │  Max Referrals/User  │  Expiry Period       │              │
│  │  [ 50 ]              │  [ 90 ] days         │              │
│  └──────────────────────┴──────────────────────┘              │
│                                                               │
│  Last updated by Admin on 24 Feb 2026                         │
│                                                               │
│                    [ Save Changes ]                            │
└──────────────────────────────────────────────────────────────┘
```

**On page load:** Call `GET /unified-admin/referrals/config` and populate all fields.
**On save:** Call `PUT /unified-admin/referrals/config` with only the changed fields.
**Show a confirmation dialog** before disabling the program or changing reward amounts (since it affects all future referrals).

---

## 4. Manually Approve Reward
**POST** `/api/v1/unified-admin/referrals/:id/approve`

Use this when a referral hasn't been auto-rewarded (e.g., expired, stuck in "eligible", or admin wants to override). Both referrer and referee wallets are **credited immediately**.

#### Response
```json
{
  "success": true,
  "message": "Referral reward issued manually",
  "data": {
    "referral_id": "uuid",
    "status": "rewarded",
    "referrer_reward_amount": 200,
    "referee_reward_amount": 100,
    "manually_approved": true,
    "manually_approved_by": "admin-uuid"
  }
}
```

**UI:** Show an "Approve & Issue Reward" button on rows where status is `pending`, `eligible`, or `expired`. Show a confirmation dialog: *"This will credit ₦200 to the referrer and ₦100 to the referee. Proceed?"*

---

## 5. Reject Referral
**POST** `/api/v1/unified-admin/referrals/:id/reject`

### Payload
```json
{
  "reason": "Suspected self-referral — same device fingerprint on both accounts"
}
```

#### Response
```json
{
  "success": true,
  "message": "Referral rejected",
  "data": {
    "referral_id": "uuid",
    "status": "rejected",
    "rejection_reason": "Suspected self-referral — same device fingerprint on both accounts",
    "manually_rejected": true
  }
}
```

**UI:** Show a "Reject" button on rows where status is `pending` or `eligible`. Prompt for a reason before submitting.

---

## Referral Status Reference

| Status | Badge Color | Meaning | Admin Actions Available |
|---|---|---|---|
| `pending` | Yellow | Referee signed up but hasn't met the reward trigger yet | **Approve** (force issue reward), **Reject** |
| `eligible` | Blue | Trigger met, reward ready to issue (usually auto-issued) | **Approve** (if auto-issue failed), **Reject** |
| `rewarded` | Green | Both referrer and referee received their rewards | None — completed |
| `partially_rewarded` | Orange | One side rewarded but the other failed (edge case) | Investigate, **Approve** to retry |
| `expired` | Gray | Referee didn't meet trigger within expiry period | **Approve** (override expiry), leave as-is |
| `rejected` | Red | Admin manually rejected this referral | Done — no further actions |

---

## Summary: What Admin Can Do

| Action | Endpoint | Description |
|---|---|---|
| **View all referrals** | `GET /referrals` | See all referrals with analytics |
| **See top referrers** | `GET /referrals/top-referrers` | Leaderboard |
| **View current reward settings** | `GET /referrals/config` | Current amounts, trigger, limits |
| **Change reward amounts** | `PUT /referrals/config` | Edit ₦ amounts for referrer/referee |
| **Enable/disable program** | `PUT /referrals/config` | Toggle `is_active` |
| **Change reward trigger** | `PUT /referrals/config` | Switch between registration/KYC/first_tx |
| **Set limits** | `PUT /referrals/config` | Max referrals per user, expiry days, min tx amount |
| **Manually approve & pay reward** | `POST /referrals/:id/approve` | Force-issue rewards for any referral |
| **Reject a referral** | `POST /referrals/:id/reject` | Block rewards, mark as rejected |

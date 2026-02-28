# Referral Management — Admin API

## Base Path
`/api/v1/unified-admin/referrals`

**Auth:** JWT Bearer token (admin role required)

---

## READ THIS FIRST — How the Referral System Works (Plain English)

### What is a referral?

A referral is when an existing user (the **referrer**) invites someone new (the **referee**) to sign up on Smipay. If the new person signs up and meets a certain condition, BOTH of them get rewarded with money in their wallets.

- **Referrer** = the person who shared their code (the existing user)
- **Referee** = the person who used someone else's code to sign up (the new user)

Every Smipay user has a referral code — it's their `smipay_tag`. So if John's tag is "johndoe", he tells his friend Jane "sign up on Smipay and enter my code: johndoe". When Jane signs up and enters "johndoe", a referral is created linking John (referrer) to Jane (referee).

### When do they get rewarded?

That depends on the **reward trigger** setting. There are 3 options:

| Trigger | What it means | When rewards are paid | Risk level |
|---|---|---|---|
| `first_transaction` | Referee must complete their first successful transaction (buy airtime, fund wallet, etc.) | After the new user actually uses the app | **Lowest risk** — recommended. Ensures the new user is real and active. |
| `kyc_verified` | Referee must complete KYC verification (submit ID, etc.) | After the new user verifies their identity | Medium risk — proves they're a real person but they might never use the app. |
| `registration` | Reward is given immediately when the referee signs up | Instantly on signup | **Highest risk** — people can create fake accounts just to farm referral rewards. |

### What are the rewards?

Two separate amounts, both configurable:

- **Referrer reward** (default ₦200) — the person who shared the code gets this
- **Referee reward** (default ₦100) — the new user who signed up gets this

Both amounts go into their **main wallets** immediately when the trigger condition is met.

**Example flow:**
1. John shares his code "johndoe" with Jane
2. Jane signs up on Smipay and enters "johndoe" as her referral code
3. A referral record is created with status `pending`
4. Jane buys ₦500 airtime (her first transaction)
5. The system checks: reward trigger is `first_transaction`, and Jane just completed hers
6. John's wallet gets +₦200, Jane's wallet gets +₦100
7. Referral status changes to `rewarded`

### What do the referral statuses mean?

| Status | Color | What happened | What admin can do |
|---|---|---|---|
| `pending` | Yellow | The new user signed up but hasn't met the reward trigger yet. They signed up but haven't done their first transaction (or KYC, depending on the trigger). | **Approve** (force-pay the reward even though the trigger wasn't met) or **Reject** (block the referral if it looks fraudulent) |
| `eligible` | Blue | The trigger condition was met (e.g. first transaction done), and the system should have auto-paid the rewards. This status usually only appears briefly before changing to `rewarded`. If it stays here, something went wrong with the auto-payment. | **Approve** (retry the reward payment) or **Reject** |
| `rewarded` | Green | Both referrer and referee got their money. Done. | Nothing — this is the happy path. |
| `partially_rewarded` | Orange | One person got their reward but the other didn't. This is an edge case — maybe one wallet update failed. | Investigate what happened. **Approve** to retry paying the missing side. |
| `expired` | Gray | The referee signed up but never met the trigger condition within the expiry period (default 90 days). E.g. they signed up but never made a transaction within 90 days. | **Approve** (override the expiry and pay the reward anyway — useful for special cases) or leave it. |
| `rejected` | Red | An admin manually rejected this referral. Maybe it was a fake account or self-referral. No rewards will ever be paid. | Done — no further actions possible. |

### What settings can admin control?

| Setting | What it means | Example |
|---|---|---|
| **Program Active (ON/OFF)** | Master switch. When OFF, two things happen: **(1)** new users who enter a referral code during signup — the code is completely ignored, no referral record is created at all. **(2)** existing pending referrals that are waiting for a trigger (e.g. first transaction) — the reward will NOT be paid even if the user completes the trigger. The pending records are not deleted though — they just sit there. If you turn the program back ON later and the user then does their first transaction, the reward kicks in normally. | Turn OFF if you suspect widespread fraud, or if you want to pause the program temporarily. Turning it back ON resumes everything. |
| **Referrer Reward Amount** | How much ₦ the person who shared the code gets | ₦200 — if you want to encourage more sharing, increase this. If it's costing too much, decrease it. |
| **Referee Reward Amount** | How much ₦ the new user gets for signing up with a code | ₦100 — this is the incentive for new users to use someone's code instead of signing up without one. |
| **Reward Trigger** | What the new user must do before rewards are paid out | `first_transaction` is safest. `registration` is most generous but riskiest. |
| **Max Referrals Per User** | How many people one user can refer in total | Set to 50 — prevents one person from referring hundreds of (possibly fake) accounts. |
| **Referral Expiry Days** | How many days the new user has to meet the trigger before the referral expires | 90 days — if someone signs up but never makes a transaction within 90 days, the referral expires and nobody gets rewarded. |
| **Min Transaction Amount** | The minimum ₦ the first transaction must be to count as the trigger (only applies when trigger is `first_transaction`) | ₦100 — prevents people from buying ₦10 airtime just to trigger the reward. |

### Common scenarios and what to do

**Scenario: A user complains "I referred my friend but didn't get my reward"**
1. Go to the referrals list, search for the referrer's name/email/tag
2. Find the referral — check the status:
   - `pending` = the friend signed up but hasn't done their first transaction yet. Tell the user their friend needs to make a purchase first.
   - `eligible` = the trigger was met but auto-payment failed. Click **Approve** to manually issue the rewards.
   - `expired` = the friend took too long. You can **Approve** to override if you want to be nice.
   - `rejected` = an admin already rejected it. Check the rejection reason.
   - `rewarded` = they already got paid. Check their transaction history.

**Scenario: You suspect someone is creating fake accounts to farm rewards**
1. Look for patterns: same device, multiple referrals in quick succession, referee accounts that never do anything after the first transaction
2. **Reject** the suspicious referrals — this prevents rewards from being paid
3. Consider lowering `max_referrals_per_user` or switching the trigger to `first_transaction` if it's on `registration`

**Scenario: You want to run a referral promotion (double rewards for a week)**
1. Go to config, change `referrer_reward_amount` to ₦400 and `referee_reward_amount` to ₦200
2. Save. All new referrals from now on will use the new amounts.
3. After the promo, change them back to ₦200 / ₦100
4. Past referrals that were already rewarded keep whatever amount they received — changes only affect future rewards.

---

## What Admin Can Do (Quick List)
1. **View all referrals** — analytics dashboard + table of every referral
2. **Top referrers leaderboard** — who's referring the most users
3. **Manage reward settings** — change reward amounts (₦), toggle program on/off, change reward trigger, set limits
4. **Manually approve & issue rewards** — force-pay rewards for any referral
5. **Reject referrals** — block fraudulent/suspicious referrals

---

## API Endpoints

### 1. List Referrals (Analytics + Table)
**GET** `/api/v1/unified-admin/referrals`

Returns analytics overview at the top + a paginated list of all referrals. Call this on page load.

#### Query Params

| Param | Type | Default | What it filters |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |
| `status` | string | — | Filter by status: `pending`, `eligible`, `rewarded`, `partially_rewarded`, `expired`, `rejected` |
| `referrer_id` | string | — | Show referrals from one specific referrer (user UUID) |
| `search` | string | — | Searches across referral code, phone number, email, smipay_tag |
| `date_from` | string | — | Start date (ISO 8601) |
| `date_to` | string | — | End date (ISO 8601) |

#### Response
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

#### What each analytics field means

| Field | What it tells you |
|---|---|
| `total_referrals` | Total number of referrals ever created (all statuses) |
| `today` | How many new referrals were created today |
| `this_week` | New referrals this week |
| `this_month` | New referrals this month |
| `total_rewarded` | How many referrals ended in both sides getting paid |
| `total_paid_out` | Total ₦ we've paid out in referral rewards (referrer + referee combined) |

#### Analytics UI Suggestion

```
+-------------- Referral Overview ------------------------------------------+
|                                                                           |
|  +----------+  +----------+  +-----------+  +----------+  +------------+ |
|  | Total    |  | Today    |  | This Week |  | Rewarded |  | Total Paid | |
|  |  1,250   |  |   15     |  |   85      |  |   920    |  | N276,000   | |
|  +----------+  +----------+  +-----------+  +----------+  +------------+ |
|                                                                           |
|  Status Breakdown (donut chart)      |  Current Config Summary            |
|                                      |                                    |
|  Rewarded    920 (73.6%)             |  Program: Active                   |
|  Pending     200 (16.0%)             |  Referrer gets: N200               |
|  Expired      85 (6.8%)             |  Referee gets: N100                |
|  Eligible     30 (2.4%)             |  Trigger: After First Transaction  |
|  Rejected     15 (1.2%)             |  Max per user: 50                  |
|                                      |  Expiry: 90 days                   |
+---------------------------------------------------------------------------+
```

#### Table Columns

| Column | Source | Notes |
|---|---|---|
| Date | `createdAt` | When the referral was created (when the referee signed up) |
| Referrer | `referrer.first_name` + `smipay_tag` | The person who shared the code. Link to user profile. |
| Referee | `referee.first_name` + `phone_number` | The new user who signed up. Link to user profile. |
| Code Used | `referral_code_used` | The smipay_tag that was entered during signup |
| Status | `status` | Colored badge (see status reference above) |
| Registered | `referee_registered_at` | When the referee signed up |
| First Tx | `referee_first_tx_at` | When the referee did their first transaction (blank if they haven't yet) |
| Referrer Reward | `referrer_reward_amount` | Show ₦ amount if paid, or "—" if not yet |
| Referee Reward | `referee_reward_amount` | Show ₦ amount if paid, or "—" if not yet |
| Actions | — | Show Approve/Reject buttons for `pending`, `eligible`, or `expired` rows |

---

### 2. Top Referrers Leaderboard
**GET** `/api/v1/unified-admin/referrals/top-referrers?limit=20`

Shows which users are referring the most people. Useful for spotting power-referrers (good) or potential abusers (bad).

#### Response
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

| Field | What it means |
|---|---|
| `referral_count` | How many people this user has referred |
| `total_earned` | Total ₦ this user has earned from referral rewards |

---

### 3. Manage Referral Rewards & Program Settings

This is where you control everything about the referral program — how much to reward, when to reward, and the safety limits.

#### 3a. Get Current Config
**GET** `/api/v1/unified-admin/referrals/config`

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

#### 3b. Update Config
**PUT** `/api/v1/unified-admin/referrals/config`

All fields are optional — send only the ones you want to change.

##### Example: Change reward amounts
```json
{
  "referrer_reward_amount": 500,
  "referee_reward_amount": 250
}
```

##### Example: Turn off the program
```json
{
  "is_active": false
}
```

##### Example: Switch to instant reward on registration (riskier but more attractive)
```json
{
  "reward_trigger": "registration"
}
```

##### Full Payload Reference

| Field | Type | Default | What it controls |
|---|---|---|---|
| `is_active` | boolean | `true` | **Master switch** — ON means referrals are recorded and rewarded. OFF is a full stop: new referral codes are ignored (no record created), AND existing pending referrals won't be rewarded even if the trigger is met. Turn it back ON and everything resumes. |
| `referrer_reward_amount` | number | `200` | ₦ the **referrer** (person who shared the code) gets when the trigger is met |
| `referee_reward_amount` | number | `100` | ₦ the **referee** (new user who used the code) gets when the trigger is met |
| `reward_trigger` | string | `first_transaction` | When rewards are paid. Options: `first_transaction` (safest — referee must buy something), `kyc_verified` (referee must verify ID), `registration` (instant — riskiest) |
| `max_referrals_per_user` | number | `50` | Maximum number of people one user can refer. After hitting this, their code still works but no more rewards are given. |
| `referral_expiry_days` | number | `90` | Days before a pending referral expires. If the referee doesn't meet the trigger within this many days, the referral status changes to `expired` and no rewards are paid. |
| `min_transaction_amount` | number | `100` | The minimum ₦ the referee's first transaction must be to count as the trigger. Only applies when trigger is `first_transaction`. Prevents gaming with ₦10 purchases. |

##### Response
Returns the updated config (same shape as the GET response above).

#### Settings UI Suggestion

```
+----------------------------------------------------------+
|  Referral Program Settings                                |
|                                                           |
|  Program Status                                           |
|  +---------------------------------------------+         |
|  |  Referral Program Active     [Toggle: ON ]   |         |
|  +---------------------------------------------+         |
|  When ON: referral codes work, rewards are paid out.      |
|  When OFF: full stop. New referral codes are ignored      |
|  (no record created). Existing pending referrals won't    |
|  be rewarded even if the trigger is met. Turn back ON     |
|  and everything resumes — nothing is deleted.             |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Reward Amounts (credited to wallets when trigger is met) |
|                                                           |
|  +------------------------+------------------------+      |
|  |  Referrer Gets         |  Referee Gets          |      |
|  |  N [ 200           ]   |  N [ 100           ]   |      |
|  |  (person who shared    |  (new user who signed   |      |
|  |   their referral code) |   up with the code)     |      |
|  +------------------------+------------------------+      |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Reward Trigger                                           |
|  (When should we pay out the rewards?)                    |
|                                                           |
|  +---------------------------------------------+         |
|  |  O  On Registration                          |         |
|  |     Instant reward when referee signs up.     |         |
|  |     Riskiest — easy to abuse with fake accts. |         |
|  |                                               |         |
|  |  O  After KYC Verification                    |         |
|  |     Reward after referee verifies identity.    |         |
|  |     Medium risk — proves they're a real person.|         |
|  |                                               |         |
|  |  @  After First Transaction (recommended)     |         |
|  |     Reward after referee makes a purchase.     |         |
|  |     Safest — new user must actually use the app|         |
|  |                                               |         |
|  |     Min Transaction Amount: N [ 100 ]          |         |
|  |     (referee must spend at least this much)    |         |
|  +---------------------------------------------+         |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Safety Limits                                            |
|                                                           |
|  +------------------------+------------------------+      |
|  |  Max Referrals/User    |  Expiry Period         |      |
|  |  [ 50 ]                |  [ 90 ] days           |      |
|  |  (after this many      |  (if the referee hasn't|      |
|  |   referrals, no more   |   met the trigger in   |      |
|  |   rewards for them)    |   this many days, the  |      |
|  |                        |   referral expires)    |      |
|  +------------------------+------------------------+      |
|                                                           |
|  Last updated by Admin on 24 Feb 2026                     |
|                                                           |
|                    [ Save Changes ]                        |
+----------------------------------------------------------+
```

**On page load:** Call `GET /unified-admin/referrals/config` and populate all fields.
**On save:** Call `PUT /unified-admin/referrals/config` with only the changed fields.
**Show a confirmation dialog before:**
- Toggling the program ON/OFF
- Changing reward amounts (affects all future referrals)
- Changing the trigger (affects all future referrals)

---

### 4. Manually Approve & Issue Reward
**POST** `/api/v1/unified-admin/referrals/:id/approve`

Use this when a referral hasn't been auto-rewarded. Maybe it expired, got stuck in "eligible", or you just want to override the rules and pay someone their reward. Both the referrer and the referee wallets are **credited immediately**.

No request body needed — just the referral ID in the URL.

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

**UI:** Show an "Approve & Issue Reward" button on rows where status is `pending`, `eligible`, or `expired`. Before executing, show a confirmation dialog: *"This will credit ₦200 to the referrer and ₦100 to the referee immediately. Proceed?"*

---

### 5. Reject a Referral
**POST** `/api/v1/unified-admin/referrals/:id/reject`

Blocks a referral permanently. No rewards will ever be paid for this referral. Use this when you suspect fraud (fake accounts, self-referrals, etc.).

#### Request Body
```json
{
  "reason": "Suspected self-referral — same device fingerprint on both accounts"
}
```

A reason is required so there's an audit trail of why it was rejected.

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

**UI:** Show a "Reject" button on rows where status is `pending` or `eligible`. Prompt for a reason (text input) before submitting. The reason shows up in the referral detail and audit logs.

---

## Summary: All Endpoints

| Action | Endpoint | Method | What it does |
|---|---|---|---|
| **View all referrals + analytics** | `/referrals` | GET | Analytics overview + paginated referral table |
| **Top referrers leaderboard** | `/referrals/top-referrers` | GET | Users ranked by referral count and earnings |
| **View current config** | `/referrals/config` | GET | Current reward amounts, trigger, limits |
| **Update config** | `/referrals/config` | PUT | Change amounts, trigger, limits, toggle ON/OFF |
| **Manually approve & pay reward** | `/referrals/:id/approve` | POST | Force-issue rewards for any referral |
| **Reject a referral** | `/referrals/:id/reject` | POST | Block rewards permanently (requires a reason) |

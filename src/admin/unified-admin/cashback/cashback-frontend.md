# Cashback Management — Admin API

## Base Path
`/api/v1/unified-admin/cashback`

**Auth:** JWT Bearer token (admin role required)

---

## READ THIS FIRST — How Cashback Works (Plain English)

### What is cashback?

Cashback means "we give the user a small percentage of their money back" every time they buy something on our platform (airtime, data, cable, electricity, etc.). It's a reward to keep them coming back instead of using OPay or PalmPay.

**Example:** A user buys ₦1,000 airtime. If the cashback for airtime is set to 3%, the user gets ₦30 back. That ₦30 goes into a **separate cashback wallet** — NOT their main wallet. They can see it, and later we can let them withdraw or spend it (that's a future feature).

### Why a separate wallet?

We don't want cashback money mixing with real deposits. If someone funds their wallet with ₦10,000, that's real money. Cashback is a reward — it's money WE are giving away. Keeping them separate means:
- We can track exactly how much we're spending on cashback
- Users can see "You've earned ₦5,200 in cashback" as a feel-good number
- We can set rules around how/when they can use the cashback balance

### The two parts of the system

**Part 1: Global Config** — The master settings for the whole cashback program.
Think of this as the "control room" with the big switches and dials:

| Setting | What it means | Real example |
|---|---|---|
| **Program Active (ON/OFF)** | The master switch. If this is OFF, nobody gets any cashback at all, no matter what. Turn it ON to start giving cashback. | You just launched the feature and want to test — turn ON. Something is going wrong and you're giving away too much money — turn OFF immediately. |
| **Default Cashback %** | The fallback percentage. If a specific service (like airtime) doesn't have its own rule, this % is used instead. Set it to 0 if you only want specific services to give cashback. | You set this to 1%. Now every service that doesn't have its own specific rule will give 1% cashback. |
| **Min Purchase Amount** | The minimum ₦ a user has to spend before they qualify for any cashback. This prevents people from gaming the system with tiny ₦50 transactions. | Set to ₦100 — if someone buys ₦80 airtime, no cashback. If they buy ₦100 or more, they qualify. |
| **Max Per Transaction** | The most cashback ₦ a user can earn from a single purchase. This protects us if someone buys ₦500,000 electricity and we're giving 5% — without a cap that's ₦25,000 in cashback from one purchase. | Set to ₦500 — even if the calculated cashback is ₦25,000, the user only gets ₦500 max. |
| **Max Per Day** | The most cashback ₦ a user can earn in a single day. Prevents abuse from users who might make many purchases just to farm cashback. | Set to ₦2,000 — once a user has earned ₦2,000 in cashback today, they don't get any more until tomorrow. |

**Part 2: Per-Service Rules** — Different cashback percentages for different services.
Just like OPay gives different cashback for airtime vs electricity, we can too:

| Service | Example % | Why different? |
|---|---|---|
| Airtime | 3% | Airtime is the most common transaction — higher cashback brings people back |
| Data | 2.5% | Also very common, slightly lower margin |
| Cable TV | 2% | Bigger ticket sizes, so even 2% is a decent reward |
| Electricity | 1% | Very large amounts (₦10,000+), so we give less % to control costs |
| Education | 0% (OFF) | Maybe we don't want to give cashback here yet |
| Betting | 0% (OFF) | Definitely don't want to incentivize gambling |
| Intl Airtime | 0% (OFF) | Not ready yet |

Each service rule also has its own optional overrides:
- **Max Cashback Amount** — override the global "Max Per Transaction" just for this service. Leave empty to use the global cap.
- **Min Transaction Amount** — override the global minimum just for this service. Leave empty to use the global minimum.

### What does "Seed All Rules" mean?

When you first open the cashback settings page, there are NO rules yet — the system doesn't know about airtime, data, cable, etc. "Seed All Rules" is a one-click setup button that creates a row for every service type (airtime, data, cable, electricity, education, betting, intl airtime). All of them start at **0% and turned OFF**. After seeding, you just go through the table and set the percentages you want and toggle each one ON.

You only need to click this once. After that, the rules exist and you just edit them.

### Step-by-step: How to set up cashback for the first time

1. Open the Cashback page in admin
2. Click **"Seed All Rules"** — this creates a row for every service (all set to 0% and OFF)
3. Set the **Global Config**:
   - Turn the program ON
   - Set default % to something like 1% (this is the fallback)
   - Set min purchase amount (e.g. ₦100)
   - Set max per transaction (e.g. ₦500)
   - Set max per day (e.g. ₦2,000)
   - Save
4. Go through each service rule in the table:
   - For airtime: set 3%, toggle ON
   - For data: set 2.5%, toggle ON
   - For cable: set 2%, toggle ON
   - For electricity: set 1%, toggle ON
   - Leave education, betting, intl airtime OFF for now
   - Save
5. Done — users will now start earning cashback on their next purchase

### What happens when a user buys something (the flow)

Let's say a user buys ₦1,000 airtime and airtime cashback is set to 3%:

1. System checks: is the cashback program ON? Yes.
2. System checks: does airtime have its own rule? Yes, 3%.
3. System calculates: ₦1,000 x 3% = ₦30 cashback.
4. System checks: is ₦30 within the per-transaction cap (₦500)? Yes.
5. System checks: has the user already hit their daily cap (₦2,000)? No.
6. System credits ₦30 to the user's **cashback wallet** (not their main wallet).
7. User sees a notification: "You earned ₦30 cashback on your airtime purchase!"

If the same user then buys ₦50 airtime (below the ₦100 minimum), they get nothing.

### What to watch out for / common questions

**Q: If I turn off the program, do users lose their existing cashback balance?**
A: No. Turning it off just stops NEW cashback from being earned. Whatever they already have stays in their cashback wallet.

**Q: What if I change the percentage — does it affect past transactions?**
A: No. Percentage changes only affect future purchases. Past cashback is already credited and won't change.

**Q: What if a service rule is OFF but the default % is set to 2%?**
A: The user gets 0% for that service. When a service rule exists but is turned OFF, we respect that — it means you specifically don't want cashback for that service. The default % only kicks in when there is NO rule at all for a service.

**Q: Can I delete a rule?**
A: Yes. If you delete the airtime rule, airtime transactions will fall back to the default %. If you want airtime to give 0%, it's better to keep the rule and just set it to 0% or toggle it OFF rather than deleting it.

---

## What Admin Can Do (Quick List)
1. **Toggle cashback ON / OFF** — master switch for the whole program
2. **Set global defaults** — fallback %, per-tx cap, daily cap, min purchase amount
3. **Manage per-service rules** — set different cashback % for airtime, data, cable, electricity, education, betting, international airtime
4. **Seed all rules at once** — one-click first-time setup to create a row for every service
5. **View analytics** — total cashback given, today's numbers, breakdown by service
6. **View cashback history** — full audit trail of every cashback credited to every user

---

## API Endpoints

### 1. Get Config + Rules (Everything in One Call)
**GET** `/api/v1/unified-admin/cashback/config`

Returns the master config AND all service rules in a single response. Call this on page load.

#### Response
```json
{
  "success": true,
  "message": "Cashback config fetched",
  "data": {
    "config": {
      "id": "cashback_config",
      "is_active": true,
      "default_percentage": 2,
      "max_cashback_per_transaction": 500,
      "max_cashback_per_day": 2000,
      "min_transaction_amount": 100,
      "updated_by": "admin-uuid",
      "createdAt": "2026-02-26T00:00:00.000Z",
      "updatedAt": "2026-02-26T12:00:00.000Z"
    },
    "rules": [
      {
        "id": "uuid",
        "service_type": "airtime",
        "is_active": true,
        "percentage": 3,
        "max_cashback_amount": 200,
        "min_transaction_amount": 50,
        "updated_by": "admin-uuid",
        "createdAt": "2026-02-26T00:00:00.000Z",
        "updatedAt": "2026-02-26T12:00:00.000Z"
      },
      {
        "id": "uuid",
        "service_type": "data",
        "is_active": true,
        "percentage": 2.5,
        "max_cashback_amount": null,
        "min_transaction_amount": null,
        "updated_by": "admin-uuid",
        "createdAt": "2026-02-26T00:00:00.000Z",
        "updatedAt": "2026-02-26T12:00:00.000Z"
      }
    ]
  }
}
```

**Note:** `max_cashback_amount: null` and `min_transaction_amount: null` on a rule means "use the global config values". Only show these fields as overrides — if they're null, the UI should show them as empty / placeholder with the global value.

---

### 2. Update Global Config
**PUT** `/api/v1/unified-admin/cashback/config`

All fields are optional — send only what you want to change.

#### Example: Turn on the program with 2% default
```json
{
  "is_active": true,
  "default_percentage": 2
}
```

#### Example: Adjust the caps
```json
{
  "max_cashback_per_transaction": 300,
  "max_cashback_per_day": 1500,
  "min_transaction_amount": 200
}
```

#### Example: Emergency kill switch — turn everything off
```json
{
  "is_active": false
}
```

#### Full Payload Reference

| Field | Type | Default | What it controls |
|---|---|---|---|
| `is_active` | boolean | `false` | **Master switch** — ON means cashback is live, OFF means no one gets anything |
| `default_percentage` | number | `0` | Fallback % used when a service doesn't have its own rule |
| `max_cashback_per_transaction` | number | `500` | Most ₦ a user can earn from ONE purchase |
| `max_cashback_per_day` | number | `2000` | Most ₦ a user can earn in ONE day across all purchases |
| `min_transaction_amount` | number | `100` | User must spend at least this ₦ amount to qualify |

#### Response
Returns the updated config + all rules (same shape as the GET response above).

---

### 3. Manage Per-Service Rules

Each service (airtime, data, cable, etc.) can have its own cashback percentage and optional cap overrides.

#### 3a. List All Rules
**GET** `/api/v1/unified-admin/cashback/rules`

```json
{
  "success": true,
  "message": "Cashback rules fetched",
  "data": [
    {
      "id": "uuid",
      "service_type": "airtime",
      "is_active": true,
      "percentage": 3,
      "max_cashback_amount": 200,
      "min_transaction_amount": 50,
      "updated_by": "admin-uuid",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

#### 3b. Create a Rule
**POST** `/api/v1/unified-admin/cashback/rules`

```json
{
  "service_type": "airtime",
  "percentage": 3,
  "is_active": true,
  "max_cashback_amount": 200,
  "min_transaction_amount": 50
}
```

| Field | Type | Required | What it means |
|---|---|---|---|
| `service_type` | string | **Yes** | Which service: `airtime`, `data`, `cable`, `electricity`, `education`, `betting`, `international_airtime` |
| `percentage` | number | **Yes** | Cashback % — e.g. `3` means the user gets 3% back |
| `is_active` | boolean | No | Is this rule turned on? Default: `true` |
| `max_cashback_amount` | number | No | Override the global per-tx cap for this service only. Leave empty to use the global cap. |
| `min_transaction_amount` | number | No | Override the global min purchase amount for this service only. Leave empty to use the global min. |

**Note:** Only one rule per service. If airtime already has a rule, this returns `400` — use update instead.

#### 3c. Seed All Rules at Once (First-Time Setup)
**POST** `/api/v1/unified-admin/cashback/rules/seed`

No request body needed. This is a one-click setup — it creates a row for every service type that doesn't already have one. All start at **0% and turned OFF** so nothing happens until you go in and set the percentages.

```json
{
  "success": true,
  "message": "Created 7 cashback rules",
  "data": [
    { "id": "uuid", "service_type": "airtime", "percentage": 0, "is_active": false },
    { "id": "uuid", "service_type": "data", "percentage": 0, "is_active": false },
    { "id": "uuid", "service_type": "cable", "percentage": 0, "is_active": false },
    { "id": "uuid", "service_type": "electricity", "percentage": 0, "is_active": false },
    { "id": "uuid", "service_type": "education", "percentage": 0, "is_active": false },
    { "id": "uuid", "service_type": "betting", "percentage": 0, "is_active": false },
    { "id": "uuid", "service_type": "international_airtime", "percentage": 0, "is_active": false }
  ]
}
```

**When to show this button:** Only when the `rules` array from `GET /config` is empty. Once rules exist, hide this button — admin can just edit the existing rules.

If rules already exist, calling this again is safe — it only creates missing ones and skips the rest.

#### 3d. Update a Rule
**PUT** `/api/v1/unified-admin/cashback/rules/:id`

Send only the fields you want to change.

```json
{
  "percentage": 5,
  "is_active": true
}
```

#### 3e. Delete a Rule
**DELETE** `/api/v1/unified-admin/cashback/rules/:id`

Removes the rule entirely. After deletion, that service falls back to the `default_percentage` from the global config.

**Recommendation:** It's usually better to set the rule to 0% or toggle it OFF rather than deleting it. Deleting means the service falls back to the default %, which might not be what you want.

---

### 4. Analytics Dashboard
**GET** `/api/v1/unified-admin/cashback/analytics`

#### Response
```json
{
  "success": true,
  "message": "Cashback analytics fetched",
  "data": {
    "config": { "...same as config response..." },
    "rules": [ "...same as rules list..." ],
    "analytics": {
      "total_cashback_given": 1250000,
      "total_transactions": 45000,
      "today_cashback_given": 8500,
      "today_transactions": 320,
      "unique_users": 12500,
      "by_service": [
        { "service_type": "airtime", "total_amount": 500000, "transaction_count": 20000 },
        { "service_type": "data", "total_amount": 350000, "transaction_count": 12000 },
        { "service_type": "electricity", "total_amount": 200000, "transaction_count": 5000 },
        { "service_type": "cable", "total_amount": 150000, "transaction_count": 3500 },
        { "service_type": "education", "total_amount": 40000, "transaction_count": 3000 },
        { "service_type": "betting", "total_amount": 10000, "transaction_count": 1500 }
      ]
    }
  }
}
```

#### What each analytics field means

| Field | What it tells you |
|---|---|
| `total_cashback_given` | Total ₦ we've given away in cashback since the program started |
| `total_transactions` | How many purchases earned cashback (all time) |
| `today_cashback_given` | ₦ given away just today — check this daily to monitor costs |
| `today_transactions` | How many purchases earned cashback today |
| `unique_users` | How many different users have received cashback at least once |
| `by_service` | Breakdown by service — which services are costing us the most / generating the most engagement |

#### Analytics UI Suggestion

```
+---------------------------------------------- Cashback Dashboard -------+
|                                                                          |
|  +------------+  +------------+  +------------+  +------------+          |
|  | Total Given|  | Today      |  | Total Txns |  | Users      |          |
|  | N1,250,000 |  | N8,500     |  | 45,000     |  | 12,500     |          |
|  +------------+  +------------+  +------------+  +------------+          |
|                                                                          |
|  Cashback by Service                                                     |
|                                                                          |
|  Airtime        ====================  N500,000  (40%)                    |
|  Data           ==============       N350,000  (28%)                     |
|  Electricity    ========             N200,000  (16%)                     |
|  Cable          ======               N150,000  (12%)                     |
|  Education      ==                   N40,000   (3%)                      |
|  Betting        =                    N10,000   (1%)                      |
|                                                                          |
+--------------------------------------------------------------------------+
```

---

### 5. Cashback History (Audit Trail)
**GET** `/api/v1/unified-admin/cashback/history`

This is the log of every single cashback that was given to any user. Use this to investigate or verify.

#### Query Params

| Param | Type | Default | What it filters |
|---|---|---|---|
| `user_id` | string | — | Show cashback for one specific user |
| `service_type` | string | — | Filter by service: `airtime`, `data`, `cable`, `electricity`, `education`, `betting`, `international_airtime` |
| `date_from` | string | — | Start date (ISO 8601) |
| `date_to` | string | — | End date (ISO 8601) |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |

#### Response
```json
{
  "success": true,
  "message": "Cashback history fetched",
  "data": {
    "history": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "amount": 30,
        "service_type": "airtime",
        "transaction_ref": "20260226-airtime-abc123",
        "percentage_applied": 3,
        "source_amount": 1000,
        "status": "credited",
        "createdAt": "2026-02-26T14:30:00.000Z"
      }
    ],
    "meta": {
      "total": 45000,
      "page": 1,
      "limit": 20,
      "total_pages": 2250
    }
  }
}
```

#### What each history field means

| Field | What it means | Example |
|---|---|---|
| `amount` | The ₦ cashback the user received | ₦30 |
| `service_type` | Which service triggered it | airtime |
| `source_amount` | How much the user originally paid for the service | ₦1,000 (user bought ₦1,000 airtime) |
| `percentage_applied` | The % that was used to calculate this cashback | 3 (meaning 3%) |
| `transaction_ref` | The reference of the original purchase transaction | Links to the transaction in transaction history |
| `status` | Whether the cashback is still valid | `credited` = given, `reversed` = taken back, `withdrawn` = user moved it out |

#### Table Columns for the UI

| Column | Source | Notes |
|---|---|---|
| Date | `createdAt` | When cashback was credited |
| User | `user_id` | Link to user profile |
| Service | `service_type` | Colored badge (same colors as utility icons) |
| Purchase Amount | `source_amount` | The original ₦ the user spent |
| Cashback % | `percentage_applied` | The % that was applied |
| Cashback Earned | `amount` | ₦ that went into the user's cashback wallet |
| Tx Reference | `transaction_ref` | Link to the original transaction detail |
| Status | `status` | `credited` / `reversed` / `withdrawn` |

---

## Settings Page UI Suggestion

Build this as a **dedicated Cashback page** in the admin dashboard with two tabs: **Settings** and **Analytics/History**.

### Settings Tab

```
+----------------------------------------------------------+
|  Cashback Program Settings                                |
|                                                           |
|  Program Status                                           |
|  +---------------------------------------------+         |
|  |  Cashback Program Active     [Toggle: OFF]   |         |
|  +---------------------------------------------+         |
|  When ON: users earn cashback on purchases.               |
|  When OFF: no one earns cashback (existing balances stay). |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Global Defaults (apply to all services unless overridden)|
|                                                           |
|  +-----------------------+-----------------------+        |
|  |  Default Cashback %   |  Min Purchase Amount  |        |
|  |  [ 2 ] %              |  N [ 100 ]            |        |
|  |  (fallback if service |  (user must spend at  |        |
|  |   has no own rule)    |   least this much)    |        |
|  +-----------------------+-----------------------+        |
|  +-----------------------+-----------------------+        |
|  |  Max Per Transaction  |  Max Per Day          |        |
|  |  N [ 500 ]            |  N [ 2000 ]           |        |
|  |  (most cashback from  |  (most cashback a     |        |
|  |   a single purchase)  |   user can earn/day)  |        |
|  +-----------------------+-----------------------+        |
|                                                           |
|                    [ Save Global Config ]                  |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Per-Service Rules                    [ Seed All Rules ]  |
|  (set different cashback % per service)                   |
|                                                           |
|  +----------------+--------+-------+-----------+--------+ |
|  | Service        | Active |  %    | Max N     | Min N  | |
|  +----------------+--------+-------+-----------+--------+ |
|  | Airtime        | [ON ]  | [ 3 ] | [ 200  ]  | [ 50 ]| |
|  | Data           | [ON ]  | [2.5] | [      ]  | [    ]| |
|  | Cable TV       | [ON ]  | [ 2 ] | [ 300  ]  | [100 ]| |
|  | Electricity    | [ON ]  | [ 1 ] | [ 500  ]  | [200 ]| |
|  | Education      | [OFF]  | [ 0 ] | [      ]  | [    ]| |
|  | Betting        | [OFF]  | [ 0 ] | [      ]  | [    ]| |
|  | Intl Airtime   | [OFF]  | [ 0 ] | [      ]  | [    ]| |
|  +----------------+--------+-------+-----------+--------+ |
|                                                           |
|  Empty Max/Min fields = uses the global values above.     |
|  Filling them in overrides the global value for that      |
|  service only.                                            |
|                                                           |
|  Last updated by Admin on 26 Feb 2026                     |
|                                                           |
|                    [ Save All Rules ]                      |
+----------------------------------------------------------+
```

**On page load:**
1. Call `GET /unified-admin/cashback/config` — populates the whole page
2. If `rules` array is empty, show a "Seed All Rules" button. After clicking it, the table appears with all 7 services at 0% / OFF

**On save global config:** Call `PUT /unified-admin/cashback/config` with only changed fields.

**On save rules:** Loop through changed rules and call `PUT /unified-admin/cashback/rules/:id` for each one.

**Show confirmation dialogs before:**
- Toggling the program ON/OFF (because it affects all users immediately)
- Changing percentages (because it affects all future purchases)

---

## Service Types Reference

| Value | Display Name |
|---|---|
| `airtime` | Airtime |
| `data` | Data |
| `cable` | Cable TV |
| `electricity` | Electricity |
| `education` | Education |
| `betting` | Betting |
| `international_airtime` | Intl Airtime |

---

## Summary: All Endpoints

| Action | Endpoint | Method | What it does |
|---|---|---|---|
| **Get everything** | `/cashback/config` | GET | Returns config + all rules in one call |
| **Update global config** | `/cashback/config` | PUT | Toggle ON/OFF, set default %, caps, minimums |
| **List all rules** | `/cashback/rules` | GET | All per-service rules |
| **Create a rule** | `/cashback/rules` | POST | Add a cashback rule for a specific service |
| **Seed all rules** | `/cashback/rules/seed` | POST | First-time setup — creates a row for every service |
| **Update a rule** | `/cashback/rules/:id` | PUT | Change %, caps, or toggle a service ON/OFF |
| **Delete a rule** | `/cashback/rules/:id` | DELETE | Remove a rule (service falls back to default %) |
| **View analytics** | `/cashback/analytics` | GET | Dashboard numbers + per-service breakdown |
| **View history** | `/cashback/history` | GET | Every cashback credit ever given, with filters |

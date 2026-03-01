# First Transaction Reward — Admin API

## Base Path
`/api/v1/unified-admin/first-tx-reward`

**Auth:** JWT Bearer token (admin role required)

---

## READ THIS FIRST — How the First Transaction Reward Works (Plain English)

### What is this?

The First Transaction Reward is a **one-time bonus** we give to users the moment they complete their very first transaction on Smipay. It's a welcome incentive — "congratulations on your first purchase, here's ₦100 on us." The user receives it once, ever. After that, this system never touches them again.

**Example:** A brand new user buys ₦500 airtime. The system detects this is their very first successful transaction, and instantly credits ₦100 (or whatever the reward is set to) into their main wallet. They see a transaction in their history: "First transaction bonus — Welcome reward for completing your first transaction!"

### Why does this matter?

In fintech, getting a user to do their **first transaction** is the hardest part. After that first purchase, they're 5x more likely to come back. This reward removes the friction — "try us once, and we'll literally pay you for it." OPay, PalmPay, and every serious fintech runs a variant of this.

### How is this different from referral rewards?

| | First Tx Reward | Referral Reward |
|---|---|---|
| **Who gets it?** | Every user who does their first transaction | Only users who signed up with a referral code |
| **How many times?** | Once, ever | Once per referral relationship |
| **Trigger** | Any qualifying first transaction | Depends on referral config (first tx, KYC, or registration) |
| **Who pays?** | We give money to the user | We give money to BOTH the referrer and the referee |
| **Can stack?** | Yes — a user can get BOTH the first-tx bonus AND a referral bonus on the same transaction | Yes — both fire independently |

**Important:** A user who signed up with a referral code AND does their first transaction can receive both the referral reward AND the first-tx reward on the same purchase. They are completely independent systems.

### The config settings (what each one does)

| Setting | What it means | Real example |
|---|---|---|
| **Program Active (ON/OFF)** | Master switch. If OFF, nobody gets the first-tx bonus, no matter what. Existing rewards already given are not affected — they keep their money. | Turn ON when you're ready to launch. Turn OFF if costs are too high or you want to pause. |
| **Reward Amount** | How much ₦ the user gets when they complete their first transaction. Goes straight into their main wallet. | ₦100 — enough to feel like a real reward, not so much that it bleeds money. |
| **Min Transaction Amount** | The user's first transaction must be at least this ₦ to qualify. Prevents gaming with tiny ₦10 purchases just to grab the bonus. | ₦100 — if someone buys ₦50 airtime, no bonus. ₦100 or more, they qualify. |
| **Eligible Transaction Types** | Which types of transactions count. You might want only airtime and data to qualify, or you might include everything (deposits, transfers, cable, electricity, etc.). This is a list you can customize. | Default: all types (airtime, data, transfer, deposit, cable, electricity, education, betting). Admin can remove types they don't want to incentivize. |
| **Budget Limit** | Total ₦ you're willing to spend on this program. Once the total rewards given reaches this number, the system stops giving out new rewards automatically. Set to `null` (empty) for unlimited budget. | ₦1,000,000 — after we've given away ₦1M in first-tx bonuses, the program auto-stops. Great for controlling costs. |
| **Max Recipients** | Maximum number of users who can receive this bonus. "First 500 users get a bonus." Set to `null` (empty) for unlimited. | 500 — after 500 users have received the bonus, no more are given out. Perfect for a "first 500 users" launch promo. |
| **Start Date** | The program only gives rewards after this date. Set to `null` (empty) for no start restriction. | March 1, 2026 — bonus only applies to first transactions on or after this date. |
| **End Date** | The program stops giving rewards after this date. Set to `null` (empty) for no end restriction. | March 31, 2026 — the promo runs for one month only. After March 31, no more first-tx bonuses even if the user qualifies. |
| **Require KYC** | If ON, the user must have completed KYC verification before they can receive the bonus. Their first transaction still has to qualify, but they also need to be KYC-verified. | OFF by default — don't gate a welcome reward behind KYC. Turn ON if you're worried about fraud from unverified accounts. |

### Step-by-step: How to set up the first-tx reward for the first time

1. Open the First Transaction Reward page in admin
2. Set the **Reward Amount** — e.g. ₦100
3. Set the **Min Transaction Amount** — e.g. ₦100
4. Decide on limits:
   - Want a "first 500 users" promo? Set **Max Recipients** to 500
   - Want a budget cap? Set **Budget Limit** to e.g. ₦100,000
   - Want a time-limited promo? Set **Start Date** and **End Date**
   - No limits? Leave all of these empty (null)
5. Choose which **Eligible Transaction Types** qualify (default: all types)
6. Toggle **Program Active** to ON
7. Save — users will now start receiving the bonus on their first qualifying transaction

### What happens when a user does their first transaction (the flow)

Let's say a new user buys ₦500 airtime and the reward is set to ₦100:

1. System checks: is the first-tx reward program ON? **Yes.**
2. System checks: is today within the start/end date window? **Yes** (or no dates set).
3. System checks: is "airtime" in the eligible transaction types list? **Yes.**
4. System checks: is ₦500 >= the minimum transaction amount (₦100)? **Yes.**
5. System checks: has this user already received a first-tx bonus before? **No** — this is their first time.
6. System checks: is this actually their first successful transaction on the platform? **Yes** — no prior completed transactions.
7. System checks: is KYC required? **No** (or yes and they're verified).
8. System checks: have we hit the recipient cap? **No** — only 342 out of 500 have received it so far.
9. System checks: have we hit the budget limit? **No** — ₦34,200 out of ₦100,000 spent so far.
10. **All checks pass** — system credits ₦100 to the user's main wallet.
11. A transaction appears in their history: `first_tx_bonus` — "First transaction bonus — Welcome reward for completing your first transaction!"
12. A record is saved in the first-tx reward history for audit.

If ANY check fails, the user simply doesn't get the bonus. No error, no notification — it's silent. The bonus is a pleasant surprise, not something users should expect or feel entitled to.

### What to watch out for / common questions

**Q: If I turn off the program, do users who already got the bonus lose their money?**
A: No. Turning it off only stops NEW bonuses from being issued. Money already credited stays in their wallets.

**Q: If I change the reward amount from ₦100 to ₦200, does it affect past rewards?**
A: No. Past rewards are already credited at whatever amount was set at the time. The new amount only applies to future first-tx bonuses.

**Q: Can a user game this by doing a tiny transaction first?**
A: Not if you set a sensible **Min Transaction Amount**. If it's set to ₦100, a ₦10 airtime purchase won't trigger the bonus — but their ₦10 purchase IS now their first transaction, so when they later buy ₦500 airtime, that's their SECOND transaction and they still won't qualify. The system only rewards the literal first successful qualifying transaction.

**Q: What if a user's first transaction fails and they retry?**
A: Failed transactions don't count. The system only looks at successful transactions. If their first attempt fails and the second succeeds, the second one is their "first successful transaction" and qualifies.

**Q: What if the budget runs out mid-day?**
A: The system checks the budget before every reward. Once total_given >= budget_limit, no more rewards are issued. The admin sees "Budget Remaining: ₦0" in the dashboard. You can increase the budget at any time and rewards will resume.

**Q: What if I set max_recipients to 100 and we've hit 100?**
A: Same as budget — the system stops giving rewards. Admin sees "Recipient Slots Remaining: 0". Increase the cap to resume.

**Q: Can a user get both the first-tx reward AND a referral reward on the same transaction?**
A: Yes. They are completely independent systems. If a referred user does their first ₦500 airtime purchase, they can receive: (1) the first-tx bonus (e.g. ₦100), (2) the referral referee reward (e.g. ₦100), AND the referrer gets their reward (e.g. ₦200). All three fire independently.

**Q: What if I want to run this for "March only" then stop?**
A: Set **Start Date** to March 1 and **End Date** to March 31. The program will only reward first transactions that happen within that window. You don't even need to manually turn it off — it auto-stops after the end date.

---

## What Admin Can Do (Quick List)
1. **Toggle the first-tx reward ON / OFF** — master switch
2. **Set the reward amount** — how much ₦ new users get
3. **Set eligibility rules** — min transaction amount, which tx types qualify, KYC requirement
4. **Set campaign limits** — budget cap, recipient cap, date window
5. **View analytics** — total given, budget remaining, recipients today/week/month, breakdown by trigger type
6. **View reward history** — full audit trail of every bonus ever given

---

## API Endpoints

### 1. Get Config + Live Stats
**GET** `/api/v1/unified-admin/first-tx-reward/config`

Returns the config AND live usage stats in a single response. Call this on page load.

#### Response
```json
{
  "success": true,
  "message": "First-tx reward config fetched",
  "data": {
    "config": {
      "id": "first_tx_reward_config",
      "is_active": true,
      "reward_amount": 100,
      "min_transaction_amount": 100,
      "eligible_transaction_types": ["airtime", "data", "transfer", "deposit", "cable", "electricity", "education", "betting"],
      "budget_limit": 100000,
      "max_recipients": 500,
      "start_date": "2026-03-01T00:00:00.000Z",
      "end_date": "2026-03-31T23:59:59.000Z",
      "require_kyc": false,
      "updated_by": "admin-uuid",
      "createdAt": "2026-02-28T00:00:00.000Z",
      "updatedAt": "2026-02-28T12:00:00.000Z"
    },
    "stats": {
      "total_recipients": 342,
      "total_given": 34200,
      "budget_remaining": 65800,
      "recipient_slots_remaining": 158
    }
  }
}
```

#### What each stats field means

| Field | What it tells you | Example |
|---|---|---|
| `total_recipients` | How many unique users have received the bonus so far | 342 users |
| `total_given` | Total ₦ we've given away in first-tx bonuses | ₦34,200 |
| `budget_remaining` | How much ₦ is left before the budget cap is hit. `null` if no budget limit is set. | ₦65,800 remaining out of ₦100,000 |
| `recipient_slots_remaining` | How many more users can receive the bonus before the recipient cap is hit. `null` if no cap is set. | 158 slots remaining out of 500 |

**Note:** `budget_remaining` and `recipient_slots_remaining` will be `null` when the corresponding limit (`budget_limit` / `max_recipients`) is not set (unlimited). In the UI, show "Unlimited" instead of a number when these are `null`.

---

### 2. Update Config
**PUT** `/api/v1/unified-admin/first-tx-reward/config`

All fields are optional — send only what you want to change.

#### Example: Turn on the program with ₦100 reward
```json
{
  "is_active": true,
  "reward_amount": 100
}
```

#### Example: Set a "first 500 users in March" campaign
```json
{
  "is_active": true,
  "reward_amount": 150,
  "max_recipients": 500,
  "start_date": "2026-03-01T00:00:00.000Z",
  "end_date": "2026-03-31T23:59:59.000Z"
}
```

#### Example: Set a budget cap
```json
{
  "budget_limit": 500000,
  "min_transaction_amount": 200
}
```

#### Example: Limit to only airtime and data
```json
{
  "eligible_transaction_types": ["airtime", "data"]
}
```

#### Example: Remove budget limit (set to unlimited)
```json
{
  "budget_limit": null
}
```

#### Example: Remove date window (no time restriction)
```json
{
  "start_date": null,
  "end_date": null
}
```

#### Example: Emergency kill switch
```json
{
  "is_active": false
}
```

#### Full Payload Reference

| Field | Type | Default | What it controls |
|---|---|---|---|
| `is_active` | boolean | `false` | **Master switch** — ON means first-tx rewards are live, OFF means nobody gets anything |
| `reward_amount` | number | `100` | ₦ credited to the user's wallet on their first qualifying transaction |
| `min_transaction_amount` | number | `100` | User's first transaction must be at least this ₦ amount to qualify |
| `eligible_transaction_types` | string[] | all types | Which transaction types count. Options: `airtime`, `data`, `transfer`, `deposit`, `cable`, `electricity`, `education`, `betting` |
| `budget_limit` | number \| null | `null` | Total ₦ budget. Once reached, no more rewards. `null` = unlimited. |
| `max_recipients` | number \| null | `null` | Max users who can receive the bonus. `null` = unlimited. |
| `start_date` | ISO string \| null | `null` | Program only active after this date. `null` = no start restriction. |
| `end_date` | ISO string \| null | `null` | Program stops after this date. `null` = no end restriction. |
| `require_kyc` | boolean | `false` | If true, user must be KYC-verified to qualify |

#### Response
Returns the updated config (same shape as `config` object in the GET response, without the `stats` block).

---

### 3. Analytics Dashboard
**GET** `/api/v1/unified-admin/first-tx-reward/analytics`

#### Response
```json
{
  "success": true,
  "message": "First-tx reward analytics fetched",
  "data": {
    "config": {
      "id": "first_tx_reward_config",
      "is_active": true,
      "reward_amount": 100,
      "min_transaction_amount": 100,
      "eligible_transaction_types": ["airtime", "data", "transfer", "deposit", "cable", "electricity", "education", "betting"],
      "budget_limit": 100000,
      "max_recipients": 500,
      "start_date": "2026-03-01T00:00:00.000Z",
      "end_date": "2026-03-31T23:59:59.000Z",
      "require_kyc": false,
      "updated_by": "admin-uuid",
      "createdAt": "2026-02-28T00:00:00.000Z",
      "updatedAt": "2026-02-28T12:00:00.000Z"
    },
    "analytics": {
      "overview": {
        "total_recipients": 342,
        "total_given": 34200,
        "budget_remaining": 65800,
        "recipient_slots_remaining": 158
      },
      "today": {
        "recipients": 12,
        "amount_given": 1200
      },
      "this_week": {
        "recipients": 85
      },
      "this_month": {
        "recipients": 342
      },
      "by_trigger_type": [
        { "transaction_type": "airtime", "count": 180, "total_amount": 18000 },
        { "transaction_type": "data", "count": 95, "total_amount": 9500 },
        { "transaction_type": "deposit", "count": 40, "total_amount": 4000 },
        { "transaction_type": "transfer", "count": 27, "total_amount": 2700 }
      ]
    }
  }
}
```

#### What each analytics field means

| Field | What it tells you |
|---|---|
| `total_recipients` | Total unique users who have received the first-tx bonus (all time) |
| `total_given` | Total ₦ we've given away in first-tx bonuses (all time) |
| `budget_remaining` | ₦ remaining before the budget cap is hit. `null` if unlimited. |
| `recipient_slots_remaining` | Slots remaining before the recipient cap is hit. `null` if unlimited. |
| `today.recipients` | How many users received the bonus today |
| `today.amount_given` | ₦ given away today |
| `this_week.recipients` | Users who received the bonus in the last 7 days |
| `this_month.recipients` | Users who received the bonus in the last 30 days |
| `by_trigger_type` | Breakdown by which transaction type triggered the reward — shows which services are driving first transactions |

#### Analytics UI Suggestion

```
+---------------------------------------------- First Tx Reward Dashboard ----+
|                                                                              |
|  +-----------+  +-----------+  +-----------+  +-----------+                  |
|  | Recipients|  | Total     |  | Budget    |  | Slots     |                  |
|  |    342    |  | Given     |  | Remaining |  | Remaining |                  |
|  |  of 500   |  | N34,200   |  | N65,800   |  |    158    |                  |
|  +-----------+  +-----------+  +-----------+  +-----------+                  |
|                                                                              |
|  +-----------+  +-----------+  +-----------+                                 |
|  | Today     |  | This Week |  | This Month|                                |
|  |   12      |  |   85      |  |   342     |                                |
|  | N1,200    |  |           |  |           |                                |
|  +-----------+  +-----------+  +-----------+                                 |
|                                                                              |
|  What triggered the first transaction?                                       |
|                                                                              |
|  Airtime      ====================  180 users  (53%)   N18,000              |
|  Data         ==========           95 users   (28%)   N9,500               |
|  Deposit      =====                40 users   (12%)   N4,000               |
|  Transfer     ===                  27 users   (8%)    N2,700               |
|                                                                              |
|  Campaign Window: Mar 1 – Mar 31, 2026                                       |
|  Budget: N34,200 / N100,000 used (34.2%)                                    |
|  Recipients: 342 / 500 (68.4%)                                               |
|                                                                              |
|  [============████████████─────────────────] 68.4% recipients used           |
|  [=======████████─────────────────────────] 34.2% budget used               |
|                                                                              |
+------------------------------------------------------------------------------+
```

**Progress bars:** When `budget_limit` or `max_recipients` is set, show progress bars showing how close we are to the cap. When either is `null`, show "Unlimited" instead of a progress bar.

---

### 4. Reward History (Audit Trail)
**GET** `/api/v1/unified-admin/first-tx-reward/history`

This is the log of every first-tx bonus ever given. One row per user (since each user can only receive it once).

#### Query Params

| Param | Type | Default | What it filters |
|---|---|---|---|
| `user_id` | string | — | Show the reward for one specific user |
| `source_transaction_type` | string | — | Filter by which tx type triggered it: `airtime`, `data`, `transfer`, `deposit`, `cable`, `electricity`, `education`, `betting` |
| `date_from` | string | — | Start date (ISO 8601) |
| `date_to` | string | — | End date (ISO 8601) |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |

#### Response
```json
{
  "success": true,
  "message": "First-tx reward history fetched",
  "data": {
    "history": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "reward_amount": 100,
        "transaction_ref": "FTX-A1B2C3D4-1709136000000",
        "source_transaction_ref": "20260228-airtime-xyz789",
        "source_transaction_type": "airtime",
        "source_amount": 500,
        "createdAt": "2026-02-28T14:30:00.000Z"
      }
    ],
    "meta": {
      "total": 342,
      "page": 1,
      "limit": 20,
      "total_pages": 18
    }
  }
}
```

#### What each history field means

| Field | What it means | Example |
|---|---|---|
| `user_id` | The user who received the bonus | Link to user profile |
| `reward_amount` | ₦ credited to their wallet | ₦100 |
| `transaction_ref` | Reference of the bonus credit transaction (the reward itself) | `FTX-A1B2C3D4-1709136000000` — links to the `first_tx_bonus` transaction in their history |
| `source_transaction_ref` | Reference of the original transaction that triggered the reward | `20260228-airtime-xyz789` — the airtime purchase that was their first transaction |
| `source_transaction_type` | What type of transaction triggered it | `airtime` — their first transaction was an airtime purchase |
| `source_amount` | How much ₦ the original transaction was for | ₦500 — user bought ₦500 airtime, which triggered the ₦100 bonus |
| `createdAt` | When the bonus was credited | Feb 28, 2026 at 2:30 PM |

#### Table Columns for the UI

| Column | Source | Notes |
|---|---|---|
| Date | `createdAt` | When the bonus was credited |
| User | `user_id` | Link to user profile |
| Trigger Type | `source_transaction_type` | Colored badge — airtime (blue), data (green), transfer (purple), deposit (orange), etc. |
| Purchase Amount | `source_amount` | ₦ the user spent on the original transaction |
| Bonus Given | `reward_amount` | ₦ bonus credited to their wallet |
| Bonus Tx Ref | `transaction_ref` | Link to the bonus transaction in transaction history |
| Source Tx Ref | `source_transaction_ref` | Link to the original purchase in transaction history |

---

## Settings Page UI Suggestion

Build this as a **dedicated First Transaction Reward page** in the admin dashboard with two sections/tabs: **Settings** and **Analytics/History**.

### Settings Tab

```
+----------------------------------------------------------+
|  First Transaction Reward Settings                        |
|                                                           |
|  Program Status                                           |
|  +---------------------------------------------+         |
|  |  First Tx Reward Active       [Toggle: OFF]  |         |
|  +---------------------------------------------+         |
|  When ON: new users earn a bonus on their first           |
|  qualifying transaction. When OFF: no bonuses given       |
|  (existing rewards already credited are not affected).    |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Reward Settings                                          |
|                                                           |
|  +-----------------------+-----------------------+        |
|  |  Reward Amount        |  Min Purchase Amount  |        |
|  |  N [ 100 ]            |  N [ 100 ]            |        |
|  |  (credited to user's  |  (first tx must be at |        |
|  |   wallet instantly)   |   least this amount)  |        |
|  +-----------------------+-----------------------+        |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Eligible Transaction Types                               |
|  (which tx types count as a qualifying first transaction) |
|                                                           |
|  [x] Airtime      [x] Data         [x] Transfer          |
|  [x] Deposit      [x] Cable TV     [x] Electricity       |
|  [x] Education    [x] Betting                             |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Campaign Limits (all optional — leave empty for no limit)|
|                                                           |
|  +-----------------------+-----------------------+        |
|  |  Budget Limit         |  Max Recipients       |        |
|  |  N [ 100000 ]         |  [ 500 ]              |        |
|  |  (stop giving rewards |  (first 500 users     |        |
|  |   when total hits     |   only — then stop)   |        |
|  |   this amount)        |                       |        |
|  +-----------------------+-----------------------+        |
|                                                           |
|  Campaign Window (optional — leave empty for always-on)   |
|                                                           |
|  +-----------------------+-----------------------+        |
|  |  Start Date           |  End Date             |        |
|  |  [  Mar 1, 2026    ]  |  [  Mar 31, 2026   ]  |        |
|  |  (rewards only given  |  (rewards stop after  |        |
|  |   after this date)    |   this date)          |        |
|  +-----------------------+-----------------------+        |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Additional Requirements                                  |
|                                                           |
|  +---------------------------------------------+         |
|  |  Require KYC Verification     [Toggle: OFF]  |         |
|  +---------------------------------------------+         |
|  When ON: user must be KYC-verified to receive the bonus. |
|  When OFF: any user qualifies regardless of KYC status.   |
|                                                           |
|  Last updated by Admin on 28 Feb 2026                     |
|                                                           |
|                    [ Save Changes ]                        |
+----------------------------------------------------------+
```

**On page load:**
1. Call `GET /unified-admin/first-tx-reward/config` — populates the whole page
2. Show the `stats` block at the top or inline — "342 recipients so far, ₦34,200 given, ₦65,800 remaining"

**On save:** Call `PUT /unified-admin/first-tx-reward/config` with only changed fields.

**Show confirmation dialogs before:**
- Toggling the program ON/OFF (affects all future first transactions)
- Changing the reward amount (only affects future rewards)
- Setting/changing budget or recipient limits

**Null handling:**
- When `budget_limit` is `null`, show the input as empty with placeholder text "No limit"
- When `max_recipients` is `null`, show as empty with placeholder "Unlimited"
- When `start_date` / `end_date` is `null`, show as empty with placeholder "No restriction"
- To clear a limit (set back to unlimited), send `null` in the PUT request: `{ "budget_limit": null }`

---

## Transaction Types Reference

| Value | Display Name | Icon suggestion |
|---|---|---|
| `airtime` | Airtime | Phone icon |
| `data` | Data | WiFi icon |
| `transfer` | Transfer | Arrow icon |
| `deposit` | Deposit | Download/Wallet icon |
| `cable` | Cable TV | TV icon |
| `electricity` | Electricity | Bolt icon |
| `education` | Education | Book icon |
| `betting` | Betting | Dice icon |

---

## Summary: All Endpoints

| Action | Endpoint | Method | What it does |
|---|---|---|---|
| **Get config + stats** | `/first-tx-reward/config` | GET | Returns config + live usage stats (budget remaining, slots remaining) |
| **Update config** | `/first-tx-reward/config` | PUT | Change reward amount, limits, toggle ON/OFF, set campaign window |
| **View analytics** | `/first-tx-reward/analytics` | GET | Dashboard numbers: today/week/month, budget/recipient progress, breakdown by tx type |
| **View history** | `/first-tx-reward/history` | GET | Every bonus ever given, with filters (user, tx type, date range) and pagination |

---

## TypeScript Examples

### Fetch Config on Page Load

```typescript
const res = await fetch('/api/v1/unified-admin/first-tx-reward/config', {
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await res.json();

// data.config.is_active → true/false
// data.config.reward_amount → 100
// data.config.budget_limit → 100000 or null
// data.stats.total_recipients → 342
// data.stats.budget_remaining → 65800 or null
// data.stats.recipient_slots_remaining → 158 or null
```

### Update Config

```typescript
const res = await fetch('/api/v1/unified-admin/first-tx-reward/config', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    is_active: true,
    reward_amount: 150,
    max_recipients: 1000,
    start_date: '2026-03-01T00:00:00.000Z',
    end_date: '2026-03-31T23:59:59.000Z',
  }),
});
```

### Fetch Analytics

```typescript
const res = await fetch('/api/v1/unified-admin/first-tx-reward/analytics', {
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await res.json();

// data.analytics.overview.total_recipients → 342
// data.analytics.overview.budget_remaining → 65800
// data.analytics.today.recipients → 12
// data.analytics.today.amount_given → 1200
// data.analytics.by_trigger_type → [{ transaction_type: "airtime", count: 180, total_amount: 18000 }, ...]
```

### Fetch History with Filters

```typescript
const params = new URLSearchParams({
  source_transaction_type: 'airtime',
  date_from: '2026-03-01',
  page: '1',
  limit: '20',
});

const res = await fetch(`/api/v1/unified-admin/first-tx-reward/history?${params}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await res.json();

// data.history → [{ user_id, reward_amount, source_transaction_type, ... }]
// data.meta → { total: 180, page: 1, limit: 20, total_pages: 9 }
```

---

## Frontend Implementation Checklist

- [ ] Settings page with all config fields (see UI suggestion above)
- [ ] Program ON/OFF toggle with confirmation dialog
- [ ] Reward amount + min transaction amount inputs
- [ ] Eligible transaction types — checkbox grid
- [ ] Budget limit + max recipients inputs (empty = unlimited, with "No limit" placeholder)
- [ ] Date range picker for start/end dates (empty = no restriction)
- [ ] KYC requirement toggle
- [ ] Save button that sends only changed fields via PUT
- [ ] Analytics dashboard with:
  - [ ] Summary cards (total recipients, total given, budget remaining, slots remaining)
  - [ ] Today / this week / this month recipient counts
  - [ ] Progress bars for budget usage and recipient cap usage (when limits are set)
  - [ ] Bar chart or horizontal breakdown by trigger transaction type
- [ ] History table with:
  - [ ] Filter by user_id, source_transaction_type, date range
  - [ ] Pagination
  - [ ] Links to user profiles and transaction details
  - [ ] Colored badges for transaction types

---

## Changelog

| Date | Change |
|---|---|
| 2026-02-28 | Initial implementation — config, analytics, history, budget/recipient caps, campaign date windows, per-tx-type eligibility |

# Transaction Management API Endpoints

## Base Path
`/api/v1/unified-admin/transactions`

**Auth:** JWT Bearer token (admin role required)

---

## 1. List Transactions (Analytics + Table — Single Endpoint)
**GET** `/api/v1/unified-admin/transactions`

Returns both the **analytics** (for the cards/charts above the table) and the **paginated transaction list** (for the table) in a single response. Analytics reflect the full dataset — not affected by table filters.

### Query Params

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |
| `search` | string | — | Searches across: transaction reference, transaction number, description, recipient mobile, session ID (case-insensitive) |
| `status` | string | — | Filter by status: `pending`, `success`, `failed`, `cancelled` |
| `transaction_type` | string | — | Filter by type: `transfer`, `deposit`, `airtime`, `data`, `cable`, `education`, `betting` |
| `credit_debit` | string | — | Filter by direction: `credit`, `debit` |
| `payment_channel` | string | — | Filter by channel: `bank_transfer`, `smipay_tag`, `paystack`, `flutterwave`, `other` |
| `user_id` | string | — | Filter by specific user UUID |
| `min_amount` | number | — | Minimum transaction amount |
| `max_amount` | number | — | Maximum transaction amount |
| `date_from` | string | — | Start date (ISO 8601, e.g. `"2026-01-01"`) |
| `date_to` | string | — | End date |
| `sort_by` | string | `createdAt` | Sort field: `createdAt`, `amount`, `status`, `transaction_type` |
| `sort_order` | string | `desc` | Sort direction: `asc` or `desc` |

### Example Requests
```
GET /api/v1/unified-admin/transactions?page=1&limit=20&status=pending&sort_by=amount&sort_order=desc

GET /api/v1/unified-admin/transactions?search=SMI-TXN-abc123&date_from=2026-02-01&date_to=2026-02-28

GET /api/v1/unified-admin/transactions?transaction_type=transfer&credit_debit=debit&min_amount=1000&max_amount=50000
```

### Response
```json
{
  "success": true,
  "message": "Transactions fetched",
  "data": {
    "analytics": {
      "overview": {
        "total_transactions": 5420,
        "total_volume": 125000000.00,
        "total_revenue": 3750000.00,
        "avg_amount": 23529.41,
        "min_amount": 50.00,
        "max_amount": 5000000.00
      },
      "activity": {
        "today_count": 85,
        "today_volume": 2400000.00,
        "week_count": 620,
        "week_volume": 18500000.00,
        "month_count": 2800,
        "month_volume": 82000000.00,
        "volume_growth_percent": 14
      },
      "by_status": {
        "success": { "count": 5100, "volume": 120000000.00 },
        "pending": { "count": 200, "volume": 3000000.00 },
        "failed": { "count": 100, "volume": 1500000.00 },
        "cancelled": { "count": 20, "volume": 500000.00 }
      },
      "by_type": {
        "transfer": { "count": 800, "volume": 90000000.00 },
        "deposit": { "count": 1000, "volume": 20000000.00 },
        "airtime": { "count": 2000, "volume": 5000000.00 },
        "data": { "count": 1500, "volume": 8000000.00 },
        "cable": { "count": 100, "volume": 1500000.00 },
        "education": { "count": 20, "volume": 500000.00 }
      },
      "by_channel": {
        "paystack": { "count": 1000, "volume": 20000000.00 },
        "smipay_tag": { "count": 1600, "volume": 90000000.00 },
        "bank_transfer": { "count": 200, "volume": 5000000.00 },
        "flutterwave": { "count": 50, "volume": 2000000.00 },
        "other": { "count": 2570, "volume": 8000000.00 }
      }
    },
    "transactions": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "amount": 5000.00,
        "provider": "mtn",
        "transaction_type": "airtime",
        "credit_debit": "debit",
        "description": "MTN Airtime VTU",
        "status": "success",
        "recipient_mobile": "+2348012345678",
        "currency_type": "ngn",
        "payment_method": "wallet",
        "payment_channel": "other",
        "fee": 0.0,
        "balance_before": 55000.00,
        "balance_after": 50000.00,
        "transaction_number": "TXN-123456",
        "transaction_reference": "SMI-TXN-abc123def456",
        "session_id": "sess_abc123",
        "markup_value": 150.00,
        "createdAt": "2026-02-24T10:30:00.000Z",
        "updatedAt": "2026-02-24T10:30:05.000Z",
        "sender_details": null,
        "icon": {
          "secure_url": "https://res.cloudinary.com/..."
        },
        "user": {
          "id": "uuid",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com",
          "phone_number": "+2348012345678",
          "smipay_tag": "johndoe",
          "role": "user",
          "account_status": "active",
          "profile_image": {
            "secure_url": "https://..."
          }
        }
      }
    ],
    "meta": {
      "total": 5420,
      "page": 1,
      "limit": 20,
      "total_pages": 271
    }
  }
}
```

### Analytics Object (`data.analytics`)

Rendered above the table as cards and charts. Analytics reflect the **full dataset** — they are not affected by table filters/search/pagination.

| Field | Type | Description |
|---|---|---|
| `overview.total_transactions` | number | Total transaction count (all-time) |
| `overview.total_volume` | number | Sum of all successful transaction amounts (NGN) |
| `overview.total_revenue` | number | Total markup revenue earned across all VTU transactions |
| `overview.avg_amount` | number | Average successful transaction amount |
| `overview.min_amount` | number | Smallest successful transaction |
| `overview.max_amount` | number | Largest successful transaction |
| `activity.today_count` | number | Transactions created today |
| `activity.today_volume` | number | Successful volume today |
| `activity.week_count` | number | Transactions in the last 7 days |
| `activity.week_volume` | number | Successful volume this week |
| `activity.month_count` | number | Transactions in the last 30 days |
| `activity.month_volume` | number | Successful volume this month |
| `activity.volume_growth_percent` | number | Month-over-month volume change (positive = growth, negative = decline) |
| `by_status` | object | Breakdown by status. Keys: `success`, `pending`, `failed`, `cancelled`. Each: `{ count, volume }` |
| `by_type` | object | Breakdown by transaction type. Keys: `transfer`, `deposit`, `airtime`, `data`, `cable`, `education`, `betting`. Each: `{ count, volume }` |
| `by_channel` | object | Breakdown by payment channel. Keys: `paystack`, `smipay_tag`, `bank_transfer`, `flutterwave`, `other`. Each: `{ count, volume }` |

### Analytics UI Layout Suggestion

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  Total Volume    │  Today's Volume  │  Total Revenue   │  Avg Transaction │
│  ₦125,000,000    │  ₦2,400,000      │  ₦3,750,000      │  ₦23,529         │
│  5,420 txns      │  85 txns         │  from markups    │  +14% MoM ▲      │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

┌─────────────────────────────┬──────────────────────────────┐
│  Status Breakdown (donut)   │  Type Breakdown (bar chart)  │
│  ● Success  5100            │  ██████████ transfer   800   │
│  ● Pending   200            │  ████████ deposit     1000   │
│  ● Failed    100            │  ██████ airtime       2000   │
│  ● Cancelled  20            │  █████ data           1500   │
└─────────────────────────────┴──────────────────────────────┘
```

### Transaction Object (`data.transactions[]`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Transaction UUID |
| `user_id` | string | Owner user UUID |
| `amount` | number \| null | Transaction amount in NGN |
| `provider` | string \| null | Service provider (e.g. `"mtn"`, `"dstv"`) |
| `transaction_type` | string \| null | One of: `transfer`, `deposit`, `airtime`, `data`, `cable`, `education`, `betting` |
| `credit_debit` | string \| null | `credit` or `debit` |
| `description` | string \| null | Human-readable description |
| `status` | string \| null | `pending`, `success`, `failed`, `cancelled` |
| `recipient_mobile` | string \| null | Recipient phone number (for airtime/data) |
| `currency_type` | string \| null | `ngn`, `usd`, `gbp`, `eur` |
| `payment_method` | string \| null | `paystack`, `card`, `bank_transfer`, `wallet`, `ussd` |
| `payment_channel` | string \| null | `bank_transfer`, `smipay_tag`, `paystack`, `flutterwave`, `other` |
| `fee` | number \| null | Transaction fee |
| `balance_before` | number | User wallet balance before transaction |
| `balance_after` | number | User wallet balance after transaction |
| `transaction_number` | string \| null | Access code / transaction number |
| `transaction_reference` | string \| null | Unique reference (Paystack ref, etc.) |
| `session_id` | string \| null | Session ID for tracing |
| `markup_value` | number \| null | Revenue earned on this transaction (VTU markup: `smipay_amount - vtpass_amount`). `null` for non-VTU transactions. |
| `createdAt` | string | ISO datetime |
| `updatedAt` | string | ISO datetime |
| `sender_details` | object \| null | `{ sender_name, sender_bank, sender_account_number }` |
| `icon` | object \| null | `{ secure_url }` — transaction icon URL |
| `user` | object \| null | Enriched user info (see User Brief Object below) |

### User Brief Object (included in each transaction)

| Field | Type | Description |
|---|---|---|
| `id` | string | User UUID |
| `first_name` | string \| null | |
| `last_name` | string \| null | |
| `email` | string \| null | |
| `phone_number` | string | |
| `smipay_tag` | string \| null | |
| `role` | string | |
| `account_status` | string | |
| `profile_image` | object \| null | `{ secure_url }` |

---

## 2. Get Transaction Detail
**GET** `/api/v1/unified-admin/transactions/:id`

Returns full transaction details including VTU markup data, metadata, and the user who owns it. For P2P Smipay tag transfers, also includes the counterpart transaction.

### Response
```json
{
  "success": true,
  "message": "Transaction fetched",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "account_id": "uuid",
    "amount": 10000.00,
    "provider": null,
    "transaction_type": "transfer",
    "credit_debit": "debit",
    "description": "Transfer to @janedoe",
    "status": "success",
    "recipient_mobile": null,
    "currency_type": "ngn",
    "payment_method": "wallet",
    "payment_channel": "smipay_tag",
    "fee": 0.0,
    "balance_before": 60000.00,
    "balance_after": 50000.00,
    "transaction_number": null,
    "transaction_reference": "SMI-TXN-xyz789",
    "authorization_url": null,
    "session_id": "sess_xyz789",
    "markup_value": null,
    "vtpass_amount": null,
    "smipay_amount": null,
    "markup_percent": null,
    "meta_data": {
      "transfer_type": "smipay_tag",
      "recipient_tag": "janedoe",
      "recipient_id": "uuid",
      "recipient_name": "Jane Doe"
    },
    "createdAt": "2026-02-24T10:30:00.000Z",
    "updatedAt": "2026-02-24T10:30:02.000Z",
    "sender_details": null,
    "icon": null,
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+2348012345678",
      "smipay_tag": "johndoe",
      "role": "user",
      "account_status": "active",
      "profile_image": null,
      "wallet": { "current_balance": 50000.00 },
      "tier": { "tier": "VERIFIED", "name": "Verified Tier" }
    },
    "counterpart": {
      "id": "uuid",
      "user_id": "uuid",
      "amount": 10000.00,
      "credit_debit": "credit",
      "balance_before": 20000.00,
      "balance_after": 30000.00,
      "status": "success",
      "user": {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane@example.com",
        "smipay_tag": "janedoe"
      }
    }
  }
}
```

### Additional Detail Fields (not in list view)

| Field | Type | Description |
|---|---|---|
| `account_id` | string \| null | Linked account UUID |
| `vtpass_amount` | number \| null | Raw amount sent to VTpass (for VTU transactions) |
| `smipay_amount` | number \| null | Amount charged to customer (after markup) |
| `markup_percent` | number \| null | Markup percentage applied |
| `authorization_url` | string \| null | Paystack authorization URL (for deposits) |
| `meta_data` | object \| null | Arbitrary JSON metadata (transfer details, provider responses, etc.) |
| `user.wallet` | object | `{ current_balance }` — user's current wallet balance |
| `user.tier` | object \| null | `{ tier, name }` — user's current tier |
| `counterpart` | object \| null | The other side of a P2P transfer (only for `smipay_tag` payment channel). Includes the counterpart transaction + user info. `null` for non-transfer transactions. |

---

## 3. Transaction Timeline (Chart Data)
**GET** `/api/v1/unified-admin/transactions/timeline`

Returns time-bucketed data for charting. Automatically picks hourly buckets for ranges <= 2 days, daily buckets for longer ranges. Keep this as a separate call — it's chart-specific data the frontend can lazy-load or refresh independently.

### Query Params

| Param | Type | Default | Description |
|---|---|---|---|
| `date_from` | string | 30 days ago | Start date (ISO 8601) |
| `date_to` | string | now | End date |

### Response
```json
{
  "success": true,
  "message": "Transaction timeline fetched",
  "data": {
    "period": "daily",
    "date_from": "2026-01-25T00:00:00.000Z",
    "date_to": "2026-02-24T23:59:59.000Z",
    "data": [
      {
        "timestamp": "2026-01-25T00:00:00.000Z",
        "count": 120,
        "volume": 3500000.00,
        "success_count": 110,
        "failed_count": 8
      },
      {
        "timestamp": "2026-01-26T00:00:00.000Z",
        "count": 145,
        "volume": 4200000.00,
        "success_count": 138,
        "failed_count": 5
      }
    ]
  }
}
```

### Timeline Data Point

| Field | Type | Description |
|---|---|---|
| `timestamp` | string | Bucket start time (ISO datetime) |
| `count` | number | Total transactions in this bucket |
| `volume` | number | Sum of successful transaction amounts |
| `success_count` | number | Number of successful transactions |
| `failed_count` | number | Number of failed transactions |

---

## 4. User Transactions
**GET** `/api/v1/unified-admin/transactions/user/:userId`

Returns all transactions for a specific user. Accepts the same query params as the main list endpoint (pagination, filters, search, sort). Response includes analytics scoped to that user.

### Example Request
```
GET /api/v1/unified-admin/transactions/user/uuid-here?page=1&limit=20&status=success
```

### Response
Same structure as endpoint #1 (List Transactions).

---

## 5. Flag Transaction
**POST** `/api/v1/unified-admin/transactions/:id/flag`

Flags a transaction for compliance/fraud review. Creates an audit log entry.

### Payload
```json
{
  "reason": "Unusually large transfer to newly created account"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `reason` | string | Yes | Why this transaction is being flagged |

### Response
```json
{
  "success": true,
  "message": "Transaction flagged for review",
  "data": null
}
```

---

## Enum Values Reference

### Transaction Status
| Value | Description | Badge Color Suggestion |
|---|---|---|
| `pending` | Awaiting processing/verification | Yellow |
| `success` | Completed successfully | Green |
| `failed` | Transaction failed | Red |
| `cancelled` | Cancelled by user or system | Gray |

### Transaction Type
| Value | Description |
|---|---|
| `transfer` | P2P transfer (wallet to wallet) |
| `deposit` | Wallet funding (Paystack, bank transfer) |
| `airtime` | Airtime purchase |
| `data` | Data bundle purchase |
| `cable` | Cable TV subscription (DStv, GOtv, etc.) |
| `education` | Education payments (WAEC, JAMB, etc.) |
| `betting` | Betting account funding |

### Credit / Debit
| Value | Description |
|---|---|
| `credit` | Money coming in (funding, received transfer) |
| `debit` | Money going out (purchases, sent transfer) |

### Payment Channel
| Value | Description |
|---|---|
| `paystack` | Paystack gateway |
| `smipay_tag` | Smipay tag P2P transfer |
| `bank_transfer` | Direct bank transfer |
| `flutterwave` | Flutterwave gateway |
| `other` | VTU services, etc. |

### Payment Method
| Value | Description |
|---|---|
| `paystack` | Paystack card/bank |
| `card` | Direct card payment |
| `bank_transfer` | Bank transfer |
| `wallet` | Wallet balance |
| `ussd` | USSD payment |

---

## Frontend Implementation Notes

### Page Load
One call does everything — `GET /unified-admin/transactions` returns `analytics` + `transactions` + `meta`. Render analytics at the top, then the table below. Optionally lazy-load the timeline chart via `GET /timeline`.

When the user changes page/filters/search, the same endpoint is called again. The `analytics` section always reflects the full dataset (not affected by table filters), so the cards stay consistent.

### Analytics Section (Above Table)
- **Overview cards:** Total Volume, Today's Volume, Total Revenue (markup), Avg Transaction — display as stat cards. Use `activity.volume_growth_percent` for a green/red arrow.
- **Status breakdown:** Donut/pie chart — success (green), pending (yellow), failed (red), cancelled (gray).
- **Type breakdown:** Horizontal bar chart — shows which services drive the most volume.
- **Channel breakdown:** Stacked bar or pie — shows payment channel distribution.

### Transactions Table (Below Analytics)
Suggested columns:

| Column | Source | Notes |
|---|---|---|
| User | `user.first_name + last_name` | Show avatar + name. Link to user detail. |
| Amount | `amount` | Format: `₦5,000.00`. Bold for large amounts. |
| Type | `transaction_type` | Chip/badge with icon (airtime, transfer, etc.) |
| Status | `status` | Colored badge: green/yellow/red/gray |
| Direction | `credit_debit` | Green arrow up for credit, red arrow down for debit |
| Channel | `payment_channel` | `smipay_tag`, `paystack`, etc. |
| Revenue | `markup_value` | Show `₦150.00` for VTU, `—` for null. Useful for spotting profitable transactions. |
| Reference | `transaction_reference` | Truncated, copy-on-click |
| Date | `createdAt` | Relative time + full date on hover |

- **Search:** Debounce 300-500ms. Searches reference, description, recipient mobile — useful for customer support lookups.
- **Filters:** All filters are AND-combined. Show active filter chips with a clear option.
- **Amount range:** Useful for spotting unusually large or small transactions.
- **Row click:** Navigate to transaction detail view.

### Transaction Detail Page
- Show all the core transaction fields.
- **Counterpart section:** For `smipay_tag` transfers, show "Other side of transfer" with the counterpart's details. Helps support trace P2P issues.
- **Markup info:** For VTU (airtime/data/cable/education), show `vtpass_amount`, `smipay_amount`, `markup_percent`, `markup_value` in a "Revenue" section.
- **Metadata:** Render `meta_data` as a collapsible JSON viewer — useful for debugging.
- **Flag button:** Add a "Flag for review" action that opens a modal to enter a reason.

### Timeline Chart
- Call `GET /timeline` separately — it uses a raw SQL query for efficiency and returns pre-bucketed data.
- **Daily view (default):** Line chart with volume on Y-axis, date on X-axis. Overlay success_count and failed_count.
- **Hourly view:** Triggered when date range is <= 2 days.
- Can be lazy-loaded after the main page renders.

### Amount Formatting
- All amounts are in NGN (Nigerian Naira).
- Format with commas and 2 decimal places: `₦5,000.00`
- Large volumes in charts: abbreviate (e.g. `₦125M`, `₦4.5M`).

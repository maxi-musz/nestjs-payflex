# Transaction History API

## Base Path
`/api/v1/history`

**Auth:** JWT Bearer token (all endpoints)

---

## 1. Get Transaction History (with Filtering & Categories)
**GET** `/api/v1/history/fetch-all-history`

Returns the user's transactions with pagination, category counts for filter tabs, and optional filtering by type/status/direction/search.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `type` | string | — | Filter by transaction type (see enum below) |
| `status` | string | — | Filter by status: `pending`, `success`, `failed`, `cancelled` |
| `credit_debit` | string | — | Filter by direction: `credit` (money in) or `debit` (money out) |
| `search` | string | — | Search across description, reference, and recipient phone number (case-insensitive) |

### Example Requests
```
GET /api/v1/history/fetch-all-history
GET /api/v1/history/fetch-all-history?page=2&limit=15
GET /api/v1/history/fetch-all-history?type=airtime
GET /api/v1/history/fetch-all-history?type=deposit&status=success
GET /api/v1/history/fetch-all-history?credit_debit=debit
GET /api/v1/history/fetch-all-history?search=MTN
```

### Response
```json
{
  "success": true,
  "message": "Transactions successfully retrieved",
  "data": {
    "categories": {
      "all": 25,
      "deposit": 10,
      "airtime": 6,
      "data": 4,
      "transfer": 3,
      "referral_bonus": 2
    },
    "pagination": {
      "currentPage": 1,
      "totalItems": 25,
      "totalPages": 3,
      "activeFilter": "all"
    },
    "transactions": [
      {
        "id": "uuid",
        "amount": "1,200",
        "raw_amount": 1200,
        "type": "deposit",
        "credit_debit": "credit",
        "transaction_type": "deposit",
        "description": "Wallet Funding Via Gateway",
        "status": "success",
        "date": "Feb 24, 2026, 10:30 PM",
        "reference": "ref-abc123",
        "sender": "John Doe",
        "icon": "https://...",
        "payment_channel": "paystack",
        "payment_method": "paystack"
      },
      {
        "id": "uuid",
        "amount": "500",
        "raw_amount": 500,
        "type": "airtime",
        "credit_debit": "debit",
        "transaction_type": "airtime",
        "description": "MTN ₦500 Airtime - 08012345678",
        "status": "success",
        "date": "Feb 24, 2026, 9:15 PM",
        "reference": "ref-xyz789",
        "sender": null,
        "icon": "https://...",
        "payment_channel": "vtpass",
        "payment_method": "wallet"
      }
    ]
  }
}
```

### Response Fields

#### `categories` — Always present, always unfiltered

Counts of ALL the user's transactions grouped by type. This is **not affected by filters** — it always shows the full picture so the frontend can render filter tabs with accurate counts.

| Key | Description |
|---|---|
| `all` | Total transaction count for this user |
| `deposit` | Wallet funding (bank transfer, Paystack gateway) |
| `transfer` | Transfers to other users (SmipPay tag, bank) |
| `airtime` | Airtime purchases |
| `data` | Data bundle purchases |
| `cable` | Cable TV subscriptions |
| `education` | Education payments |
| `betting` | Betting wallet funding |
| `referral_bonus` | Referral program rewards |

Only categories that have at least 1 transaction will appear. If a user has never bought airtime, `airtime` won't be in the object.

#### `pagination`

| Field | Type | Description |
|---|---|---|
| `currentPage` | number | Current page number |
| `totalItems` | number | Total matching transactions (affected by filters) |
| `totalPages` | number | Total pages (affected by filters) |
| `activeFilter` | string | Currently applied type filter, or `"all"` if none |

#### `transactions[]`

| Field | Type | Description |
|---|---|---|
| `id` | string | Transaction UUID |
| `amount` | string | Formatted amount with commas, e.g. `"1,200"`, `"50,000"`. Add `₦` prefix in UI. |
| `raw_amount` | number | Raw numeric amount (e.g. `1200`). Use for calculations, sorting, or custom formatting. |
| `type` | string | Transaction type (same as `transaction_type`) |
| `credit_debit` | string | `"credit"` (money in) or `"debit"` (money out) |
| `transaction_type` | string | Same as `type` — kept for backward compatibility |
| `description` | string | Human-readable description |
| `status` | string | `"pending"`, `"success"`, `"failed"`, `"cancelled"` |
| `date` | string | Formatted date string, e.g. `"Feb 24, 2026, 10:30 PM"` |
| `reference` | string \| null | Transaction reference |
| `sender` | string \| null | Sender name (for deposits via bank transfer) |
| `icon` | string \| null | Transaction icon URL |
| `payment_channel` | string \| null | e.g. `"paystack"`, `"vtpass"`, `"smipay_tag"` |
| `payment_method` | string \| null | e.g. `"paystack"`, `"wallet"`, `"bank_transfer"` |

---

## 2. Get Single Transaction
**GET** `/api/v1/history/:id`

Returns full details for a single transaction.

### Response
```json
{
  "success": true,
  "message": "Single transaction retrieved",
  "data": {
    "id": "uuid",
    "amount": "1,200",
    "type": "deposit",
    "description": "Wallet Funding Via Gateway",
    "provider": null,
    "status": "success",
    "recipient_mobile": null,
    "tx_reference": "ref-abc123",
    "created_on": "Feb 24, 2026, 10:30 PM",
    "updated_on": "Feb 24, 2026, 10:30 PM",
    "sender": "John Doe",
    "icon": "https://..."
  }
}
```

---

## Enum Values

### Transaction Types
Use these values for the `type` query parameter:

| Value | Display Name | Direction | Description |
|---|---|---|---|
| `deposit` | Deposit | credit | Wallet funding (bank transfer, Paystack) |
| `transfer` | Transfer | debit | Transfers to other users or banks |
| `airtime` | Airtime | debit | Airtime purchases |
| `data` | Data | debit | Data bundle purchases |
| `cable` | Cable TV | debit | Cable TV subscriptions (DSTV, GOtv, etc.) |
| `education` | Education | debit | Education payments |
| `betting` | Betting | debit | Betting wallet funding |
| `referral_bonus` | Referral Bonus | credit | Referral program rewards |

### Transaction Status

| Value | Display | Color |
|---|---|---|
| `pending` | Pending | Yellow/Orange |
| `success` | Success | Green |
| `failed` | Failed | Red |
| `cancelled` | Cancelled | Gray |

### Credit/Debit

| Value | Meaning | UI Treatment |
|---|---|---|
| `credit` | Money coming in | Green text, `+₦` prefix |
| `debit` | Money going out | Red text, `-₦` prefix |

---

## Frontend Implementation Guide

### Transaction List Screen

#### Filter Tabs (from `categories`)

Build filter tabs dynamically from the `categories` object:

```javascript
// Response: data.categories = { all: 25, deposit: 10, airtime: 6, data: 4, transfer: 3, referral_bonus: 2 }

const CATEGORY_LABELS = {
  all: 'All',
  deposit: 'Deposits',
  transfer: 'Transfers',
  airtime: 'Airtime',
  data: 'Data',
  cable: 'Cable TV',
  education: 'Education',
  betting: 'Betting',
  referral_bonus: 'Rewards',
};

// Only render tabs for categories that exist
const tabs = Object.entries(data.categories).map(([key, count]) => ({
  key,
  label: CATEGORY_LABELS[key] || key,
  count,
}));
```

Renders as:
```
[All (25)]  [Deposits (10)]  [Airtime (6)]  [Data (4)]  [Transfers (3)]  [Rewards (2)]
```

When a tab is tapped, re-fetch with `?type=airtime` (or whichever). When "All" is tapped, fetch without `type` param.

#### Search

Debounce 300–500ms, then pass `?search=MTN`. The backend searches description, reference, and phone number.

#### Amount Display

- `amount` field is already comma-formatted (e.g. `"1,200"`) — just prepend `₦`
- `raw_amount` field is a raw number (e.g. `1200`) — use for sorting or custom formatting
- Use `credit_debit` to decide the sign: `credit` → `+₦1,200` (green), `debit` → `-₦500` (red)

#### Pagination

Standard page-based. Show `totalItems` as "X transactions". Use `totalPages` to show/hide next button.

#### Adding New Categories Later

When a new transaction type is added to the backend (e.g. `electricity`, `insurance`), it will automatically appear in the `categories` object. The frontend just needs a label mapping entry in `CATEGORY_LABELS` — no API changes needed.

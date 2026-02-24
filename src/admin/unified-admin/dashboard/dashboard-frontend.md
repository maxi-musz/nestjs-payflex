# Dashboard API Endpoint

## Base Path
`/api/v1/unified-admin/dashboard`

**Auth:** JWT Bearer token (admin role required)

---

## 1. Get Dashboard Stats
**GET** `/api/v1/unified-admin/dashboard`

No query params, no payload. Returns all stats in a single call.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard stats fetched",
  "data": {
    "users": {
      "total": 1250,
      "new_today": 14,
      "new_this_week": 87,
      "active": 1200,
      "suspended": 50
    },
    "transactions": {
      "total_today": 342,
      "total_volume_today": 4500000.00,
      "pending_count": 12,
      "failed_count": 5,
      "success_count": 325
    },
    "support": {
      "open_tickets": 8,
      "pending_tickets": 3,
      "escalated_tickets": 1
    },
    "wallets": {
      "total_balance_all_users": 125000000.00,
      "total_funded_today": 3200000.00
    },
    "kyc": {
      "pending": 12,
      "approved_today": 8,
      "approved_this_week": 45,
      "rejected": 3
    },
    "compliance": {
      "flagged_audit_logs": 3,
      "security_events_today": 2
    },
    "cards": {
      "total_active": 1500,
      "issued_today": 5
    },
    "referrals": {
      "today": 4,
      "this_week": 28
    },
    "tier_distribution": {
      "UNVERIFIED": 200,
      "VERIFIED": 800,
      "PREMIUM": 250
    },
    "revenue": {
      "markup_today": 125000.00,
      "markup_this_week": 850000.00
    },
    "action_items": [
      { "type": "escalated_tickets", "count": 1 },
      { "type": "flagged_audits", "count": 3 },
      { "type": "pending_kyc", "count": 12 },
      { "type": "pending_transactions", "count": 5 }
    ]
  }
}
```

---

## Response Field Reference

### `users`
| Field | Type | Description |
|---|---|---|
| `total` | number | Total registered users |
| `new_today` | number | Users registered today |
| `new_this_week` | number | Users registered in the last 7 days |
| `active` | number | Users with `active` account status |
| `suspended` | number | Users with `suspended` account status |

### `transactions`
| Field | Type | Description |
|---|---|---|
| `total_today` | number | Number of transactions created today |
| `total_volume_today` | number | Total successful transaction amount today (NGN) |
| `pending_count` | number | Transactions currently in `pending` state |
| `failed_count` | number | Transactions that failed today |
| `success_count` | number | Transactions that succeeded today |

### `support`
| Field | Type | Description |
|---|---|---|
| `open_tickets` | number | Tickets with `in_progress` status |
| `pending_tickets` | number | Tickets with `pending` status (awaiting first response) |
| `escalated_tickets` | number | Tickets with `escalated` status |

### `wallets`
| Field | Type | Description |
|---|---|---|
| `total_balance_all_users` | number | Sum of all user wallet balances (NGN) |
| `total_funded_today` | number | Total amount funded into wallets today (NGN) |

### `kyc`
| Field | Type | Description |
|---|---|---|
| `pending` | number | KYC applications awaiting review |
| `approved_today` | number | KYC approvals today |
| `approved_this_week` | number | KYC approvals in the last 7 days |
| `rejected` | number | KYC rejections today |

### `compliance`
| Field | Type | Description |
|---|---|---|
| `flagged_audit_logs` | number | Audit log entries flagged for compliance review |
| `security_events_today` | number | Security events logged today |

### `cards`
| Field | Type | Description |
|---|---|---|
| `total_active` | number | Total active virtual cards |
| `issued_today` | number | Cards issued today |

### `referrals`
| Field | Type | Description |
|---|---|---|
| `today` | number | Referrals created today |
| `this_week` | number | Referrals created in the last 7 days |

### `tier_distribution`
| Field | Type | Description |
|---|---|---|
| `{TIER_NAME}` | number | Number of users in each tier. Keys are tier names (e.g. `"UNVERIFIED"`, `"VERIFIED"`, `"PREMIUM"`). Dynamic — depends on tiers configured in the system. |

### `revenue`
| Field | Type | Description |
|---|---|---|
| `markup_today` | number | Revenue from VTU/bill payment markup today (NGN) |
| `markup_this_week` | number | Revenue from markup over the last 7 days (NGN) |

### `action_items`
Array of items requiring admin attention. Each item:

| Field | Type | Description |
|---|---|---|
| `type` | string | One of: `"escalated_tickets"`, `"flagged_audits"`, `"pending_kyc"`, `"pending_transactions"` |
| `count` | number | Number of items needing attention |

Only items with `count > 0` are included. If everything is clear, this array is empty.

---

## 2. Recalculate Stats
**POST** `/api/v1/unified-admin/dashboard/recalculate`

Re-syncs all stats from actual database data. Use this after first deploy or if counters drift.

**Payload:** None

**Response:** Same structure as `GET /dashboard` above, with message `"Stats recalculated successfully"`.

---

## Frontend Implementation Notes

- **Polling:** Safe to poll every 30–60 seconds. The endpoint reads from pre-aggregated stats tables (3 lightweight queries), not from main transaction/user tables.
- **Action items:** Use this array to show notification badges or an "Attention needed" section on the dashboard.
- **Tier distribution:** Render as a pie/donut chart. Keys are dynamic — iterate over the object.
- **Revenue:** Only includes VTU/bill markup. Will be `0` if no VTU transactions have occurred.
- **Number formatting:** All monetary values are in NGN (Nigerian Naira). Format with commas and 2 decimal places on the frontend.

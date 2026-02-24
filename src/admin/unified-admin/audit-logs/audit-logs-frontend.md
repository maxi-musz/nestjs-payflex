# Audit Logs API Endpoints

## Base Path
`/api/v1/unified-admin/audit-logs`

**Auth:** JWT Bearer token (admin role required)

---

## 1. List Audit Logs (Analytics + Fraud Indicators + Table — Single Endpoint)
**GET** `/api/v1/unified-admin/audit-logs`

Returns **analytics** (overview, breakdowns, fraud indicators, financial summary), and the **paginated audit log list** in a single response. Analytics reflect the full dataset.

### Query Params

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |
| `search` | string | — | Searches across: description, actor name, resource name, error message (case-insensitive) |
| `user_id` | string | — | Filter by user UUID |
| `action` | string | — | Filter by specific action (e.g. `LOGIN`, `WALLET_DEBIT`, `TRANSFER_INITIATE`) |
| `category` | string | — | Filter by category (e.g. `AUTHENTICATION`, `BANKING`, `TRANSFER`) |
| `status` | string | — | Filter by outcome: `SUCCESS`, `FAILURE`, `PENDING`, `BLOCKED` |
| `severity` | string | — | Filter by risk level: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `actor_type` | string | — | Filter by who: `USER`, `ADMIN`, `SYSTEM`, `WEBHOOK`, `CRON` |
| `resource_type` | string | — | Filter by affected resource (e.g. `User`, `Wallet`, `TransactionHistory`) |
| `resource_id` | string | — | Filter by specific resource UUID |
| `ip_address` | string | — | Filter by IP address |
| `is_flagged` | boolean | — | Filter flagged entries (`true` / `false`) |
| `date_from` | string | — | Start date (ISO 8601) |
| `date_to` | string | — | End date |

### Example Requests
```
GET /api/v1/unified-admin/audit-logs?page=1&limit=20&severity=HIGH&status=FAILURE

GET /api/v1/unified-admin/audit-logs?category=AUTHENTICATION&action=LOGIN_FAILED&date_from=2026-02-01

GET /api/v1/unified-admin/audit-logs?search=wallet&is_flagged=true

GET /api/v1/unified-admin/audit-logs?user_id=uuid&category=TRANSFER
```

### Response
```json
{
  "success": true,
  "message": "Audit logs fetched",
  "data": {
    "analytics": {
      "overview": {
        "total_logs": 145000,
        "today": 520,
        "yesterday": 480,
        "this_week": 3800,
        "this_month": 16500,
        "week_over_week_percent": 12,
        "flagged": 45,
        "unreviewed_flagged": 12,
        "failures": 3200,
        "failures_today": 45,
        "high_severity": 890,
        "high_severity_today": 8,
        "blocked": 300
      },
      "financial": {
        "flagged_transaction_count": 18,
        "flagged_transaction_volume": 2450000.00
      },
      "by_category": {
        "AUTHENTICATION": 45000,
        "BANKING": 30000,
        "TRANSFER": 25000,
        "WALLET": 18000,
        "AIRTIME": 8000,
        "DATA": 6000,
        "REGISTRATION": 5000,
        "ADMIN": 3000,
        "SYSTEM": 2500,
        "KYC_VERIFICATION": 1500,
        "SUPPORT": 500,
        "CARD_MANAGEMENT": 500
      },
      "by_status": {
        "SUCCESS": 130000,
        "FAILURE": 3200,
        "PENDING": 1500,
        "BLOCKED": 300
      },
      "by_severity": {
        "LOW": 120000,
        "MEDIUM": 20000,
        "HIGH": 4500,
        "CRITICAL": 500
      },
      "by_actor_type": {
        "USER": 130000,
        "ADMIN": 5000,
        "SYSTEM": 3000,
        "WEBHOOK": 5000,
        "CRON": 2000
      },
      "recent_high_severity": [
        {
          "id": "uuid",
          "action": "LOGIN_FAILED",
          "category": "AUTHENTICATION",
          "severity": "HIGH",
          "status": "FAILURE",
          "description": "Multiple failed login attempts from new IP",
          "user_id": "uuid",
          "actor_type": "USER",
          "ip_address": "105.112.45.67",
          "geo_location": "Lagos, LA, NG",
          "amount": null,
          "is_flagged": false,
          "created_at": "2026-02-24T10:30:00.000Z",
          "user": {
            "id": "uuid",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone_number": "+2348012345678"
          }
        }
      ],
      "fraud_indicators": {
        "top_failed_actions": [
          { "action": "LOGIN_FAILED", "failure_count": 1200 },
          { "action": "TRANSFER_INITIATE", "failure_count": 450 },
          { "action": "PIN_VERIFY", "failure_count": 380 },
          { "action": "FUND_WALLET_INITIATE", "failure_count": 220 }
        ],
        "top_failed_users": [
          {
            "user": {
              "id": "uuid",
              "first_name": "Suspect",
              "last_name": "User",
              "email": "suspect@example.com",
              "phone_number": "+2348099999999",
              "account_status": "active"
            },
            "failure_count": 87
          }
        ],
        "suspicious_ips": [
          {
            "ip_address": "105.112.45.67",
            "distinct_users": 5,
            "total_actions": 340
          },
          {
            "ip_address": "197.210.78.12",
            "distinct_users": 3,
            "total_actions": 120
          }
        ]
      }
    },
    "logs": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "actor_type": "USER",
        "actor_name": "John Doe",
        "session_id": "sess_abc123",
        "action": "TRANSFER_INITIATE",
        "category": "TRANSFER",
        "status": "SUCCESS",
        "severity": "MEDIUM",
        "resource_type": "TransactionHistory",
        "resource_id": "tx-uuid",
        "resource_name": null,
        "ip_address": "105.112.45.67",
        "user_agent": "SmipayApp/2.1.0 Android",
        "device_id": "device-abc123",
        "device_model": "Samsung Galaxy S23",
        "platform": "android",
        "geo_location": "Lagos, LA, NG",
        "latitude": 6.5244,
        "longitude": 3.3792,
        "http_method": "POST",
        "endpoint": "/api/v1/banking/send-ngn-money",
        "request_id": "req-abc123",
        "description": "User initiated P2P transfer of ₦10,000 to @janedoe",
        "old_values": null,
        "new_values": null,
        "metadata": { "recipient_tag": "janedoe", "amount": 10000 },
        "error_message": null,
        "amount": 10000.00,
        "currency": "NGN",
        "balance_before": 60000.00,
        "balance_after": 50000.00,
        "transaction_ref": "SMI-TXN-xyz789",
        "is_flagged": false,
        "flagged_reason": null,
        "reviewed_by": null,
        "reviewed_at": null,
        "review_notes": null,
        "created_at": "2026-02-24T10:30:00.000Z",
        "user": {
          "id": "uuid",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com",
          "phone_number": "+2348012345678"
        }
      }
    ],
    "meta": {
      "total": 145000,
      "page": 1,
      "limit": 20,
      "total_pages": 7250,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

### Analytics Object (`data.analytics`)

| Field | Type | Description |
|---|---|---|
| `overview.total_logs` | number | Total audit log entries ever |
| `overview.today` | number | Entries created today |
| `overview.yesterday` | number | Entries created yesterday (for day-over-day comparison) |
| `overview.this_week` | number | Entries in the last 7 days |
| `overview.this_month` | number | Entries in the last 30 days |
| `overview.week_over_week_percent` | number | Percentage change this week vs. previous week (positive = increase) |
| `overview.flagged` | number | Total flagged entries |
| `overview.unreviewed_flagged` | number | Flagged entries not yet reviewed — **primary action item** |
| `overview.failures` | number | Total entries with `FAILURE` status |
| `overview.failures_today` | number | Failures today — spike = active attack |
| `overview.high_severity` | number | Total `HIGH` + `CRITICAL` severity entries |
| `overview.high_severity_today` | number | High-severity today — spike = active incident |
| `overview.blocked` | number | Total entries with `BLOCKED` status |
| `financial.flagged_transaction_count` | number | Number of flagged entries that have a financial amount |
| `financial.flagged_transaction_volume` | number | Total ₦ value of flagged financial entries |
| `by_category` | object | Entry count per category |
| `by_status` | object | Entry count per status: `SUCCESS`, `FAILURE`, `PENDING`, `BLOCKED` |
| `by_severity` | object | Entry count per severity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `by_actor_type` | object | Entry count per actor: `USER`, `ADMIN`, `SYSTEM`, `WEBHOOK`, `CRON` |
| `recent_high_severity` | array | Last 15 HIGH/CRITICAL entries with full user info |
| `fraud_indicators.top_failed_actions` | array | Top 10 actions by failure count — shows systemic issues |
| `fraud_indicators.top_failed_users` | array | Top 10 users by failure count with profile — shows brute-force/fraud suspects |
| `fraud_indicators.suspicious_ips` | array | IPs used across multiple user accounts in last 30 days — fraud ring indicator |

### Analytics UI Layout Suggestion

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Logs   │ Today / Yest │ Flagged      │ Failures     │ High Sev.    │
│  145,000     │ 520 / 480    │ 45 (12 new)  │ 3,200 (45⬆) │ 890 (8⬆)    │
│              │   +8.3%      │ ← review!    │ today: 45    │ today: 8     │
│              │              │              │              │              │
│ Blocked: 300 │ WoW: +12%    │ ₦2.45M vol.  │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘

┌────────────────────────────────┬─────────────────────────────────┐
│  Category Breakdown (bar)      │  Severity Breakdown (donut)     │
│  ██████ AUTH           45000   │  ● Low      120,000             │
│  █████ BANKING         30000   │  ● Medium    20,000             │
│  ████ TRANSFER         25000   │  ● High       4,500             │
│  ███ WALLET            18000   │  ● Critical     500             │
└────────────────────────────────┴─────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  🚨 Fraud Indicators                                             │
│                                                                  │
│  Top Failed Actions:                                             │
│  LOGIN_FAILED: 1,200 │ TRANSFER_INITIATE: 450 │ PIN_VERIFY: 380 │
│                                                                  │
│  Suspicious Users (by failures):                                 │
│  [avatar] Suspect User — 87 failures — account: active           │
│  [avatar] Another User — 65 failures — account: suspended        │
│                                                                  │
│  Multi-Account IPs:                                              │
│  105.112.45.67 → 5 accounts, 340 actions [Investigate →]        │
│  197.210.78.12 → 3 accounts, 120 actions [Investigate →]        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Recent High-Severity Events (live feed, 15 items)               │
│  🔴 CRITICAL — LOGIN_FAILED — Multiple failed logins — 2m ago   │
│  🟠 HIGH — TRANSFER_INITIATE — Large transfer failed — 15m ago  │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Timeline / Trend Chart Data
**GET** `/api/v1/unified-admin/audit-logs/timeline`

Returns time-bucketed data for charting failure spikes, severity trends, and flagged-event patterns.

### Query Params

| Param | Type | Default | Description |
|---|---|---|---|
| `date_from` | string | 30 days ago | Start date (ISO 8601) |
| `date_to` | string | now | End date |

Automatically uses **hourly** buckets for ranges ≤ 2 days, **daily** buckets otherwise.

### Example Request
```
GET /api/v1/unified-admin/audit-logs/timeline?date_from=2026-02-01&date_to=2026-02-24
```

### Response
```json
{
  "success": true,
  "message": "Audit log timeline fetched",
  "data": {
    "period": "daily",
    "date_from": "2026-02-01T00:00:00.000Z",
    "date_to": "2026-02-24T12:00:00.000Z",
    "data": [
      {
        "timestamp": "2026-02-01T00:00:00.000Z",
        "total": 540,
        "success_count": 490,
        "failure_count": 35,
        "blocked_count": 5,
        "high_severity_count": 10,
        "flagged_count": 2
      },
      {
        "timestamp": "2026-02-02T00:00:00.000Z",
        "total": 610,
        "success_count": 560,
        "failure_count": 40,
        "blocked_count": 3,
        "high_severity_count": 7,
        "flagged_count": 1
      }
    ]
  }
}
```

### UI Suggestions
- **Multi-line chart:** Total (gray), Failures (red), High-Severity (orange), Flagged (purple)
- **Spike detection:** Highlight data points that are > 2x the rolling average
- When admin clicks a spike point, auto-filter the table below to that date range
- Use **hourly** view (pass `date_from` and `date_to` within 2 days) for real-time incident investigation

---

## 3. IP Investigation
**GET** `/api/v1/unified-admin/audit-logs/ip/:ipAddress`

Returns all activity from a specific IP, which accounts used it, and action breakdown. **Critical for fraud ring detection** — when an IP appears across multiple accounts, it's a major red flag.

### Query Params
Same pagination params as the main list: `page`, `limit`.

### Example Request
```
GET /api/v1/unified-admin/audit-logs/ip/105.112.45.67?page=1&limit=20
```

### Response
```json
{
  "success": true,
  "message": "IP activity fetched",
  "data": {
    "ip_address": "105.112.45.67",
    "geo_location": "Lagos, LA, NG",
    "summary": {
      "total_actions": 340,
      "distinct_users": 5,
      "first_seen": "2026-01-15T08:30:00.000Z",
      "last_seen": "2026-02-24T10:30:00.000Z",
      "is_multi_account": true
    },
    "associated_users": [
      {
        "user": {
          "id": "uuid1",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com",
          "phone_number": "+2348012345678",
          "smipay_tag": "johndoe",
          "account_status": "active"
        },
        "action_count": 150
      },
      {
        "user": {
          "id": "uuid2",
          "first_name": "Jane",
          "last_name": "Smith",
          "email": "jane@example.com",
          "phone_number": "+2348087654321",
          "smipay_tag": "janesmith",
          "account_status": "active"
        },
        "action_count": 90
      }
    ],
    "top_actions": [
      { "action": "LOGIN", "count": 120 },
      { "action": "TRANSFER_INITIATE", "count": 80 },
      { "action": "BALANCE_CHECK", "count": 60 }
    ],
    "logs": [ /* full audit log objects with user relation */ ],
    "meta": {
      "total": 340,
      "page": 1,
      "limit": 20,
      "total_pages": 17
    }
  }
}
```

### UI Suggestions
- Navigate here from: "Suspicious IPs" in fraud indicators, or from clicking any IP in the log table
- **Red banner** if `is_multi_account: true` — "This IP is associated with X accounts"
- Show associated users as cards with link to their profile / user audit logs
- Show action breakdown as a mini bar chart
- Full log table below

---

## 4. Session Trace
**GET** `/api/v1/unified-admin/audit-logs/session/:sessionId`

Returns all actions performed within a single login session, in chronological order. **Essential for incident investigation** — "what exactly did this user do during this session?"

### Example Request
```
GET /api/v1/unified-admin/audit-logs/session/sess_abc123def456
```

### Response
```json
{
  "success": true,
  "message": "Session trace fetched",
  "data": {
    "session_id": "sess_abc123def456",
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    "summary": {
      "total_actions": 24,
      "duration_seconds": 1847,
      "started_at": "2026-02-24T09:00:00.000Z",
      "ended_at": "2026-02-24T09:30:47.000Z",
      "ip_address": "105.112.45.67",
      "geo_location": "Lagos, LA, NG",
      "platform": "android",
      "device_model": "Samsung Galaxy S23",
      "failure_count": 3,
      "unique_endpoints": 8,
      "total_financial_amount": 85000.00
    },
    "logs": [
      {
        "id": "uuid",
        "action": "LOGIN",
        "status": "SUCCESS",
        "severity": "LOW",
        "description": "User logged in successfully",
        "created_at": "2026-02-24T09:00:00.000Z"
      },
      {
        "id": "uuid",
        "action": "BALANCE_CHECK",
        "status": "SUCCESS",
        "severity": "LOW",
        "description": "Checked wallet balance",
        "created_at": "2026-02-24T09:01:15.000Z"
      },
      {
        "id": "uuid",
        "action": "TRANSFER_INITIATE",
        "status": "SUCCESS",
        "severity": "MEDIUM",
        "description": "P2P transfer of ₦50,000 to @janedoe",
        "amount": 50000.00,
        "created_at": "2026-02-24T09:05:30.000Z"
      }
    ]
  }
}
```

### UI Suggestions
- Navigate here from: clicking `session_id` in any audit log detail view
- Display as a **vertical timeline** (chronological, top-to-bottom)
- Each action is a node: icon by action type, colored by severity, status badge
- Highlight failures in red
- Summary card at the top: duration, device, location, total financial volume, failure rate
- Financial actions should show amounts inline on the timeline

---

## 5. Device Investigation
**GET** `/api/v1/unified-admin/audit-logs/device/:deviceId`

Returns all activity from a specific device. When a single device is used across multiple accounts, it's a strong indicator of fraud (multi-accounting).

### Query Params
Same pagination params: `page`, `limit`.

### Example Request
```
GET /api/v1/unified-admin/audit-logs/device/device-abc123?page=1&limit=20
```

### Response
```json
{
  "success": true,
  "message": "Device activity fetched",
  "data": {
    "device_id": "device-abc123",
    "device_model": "Samsung Galaxy S23",
    "platform": "android",
    "summary": {
      "total_actions": 520,
      "distinct_users": 2,
      "distinct_ips": 3,
      "is_multi_account": true
    },
    "associated_users": [
      {
        "user": {
          "id": "uuid",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com",
          "account_status": "active"
        },
        "action_count": 400
      },
      {
        "user": {
          "id": "uuid2",
          "first_name": "Fake",
          "last_name": "Account",
          "email": "fake@example.com",
          "account_status": "suspended"
        },
        "action_count": 120
      }
    ],
    "ip_addresses": [
      { "ip_address": "105.112.45.67", "action_count": 300 },
      { "ip_address": "197.210.78.12", "action_count": 180 },
      { "ip_address": "41.58.100.5", "action_count": 40 }
    ],
    "logs": [ /* full audit log objects with user relation */ ],
    "meta": {
      "total": 520,
      "page": 1,
      "limit": 20,
      "total_pages": 26
    }
  }
}
```

### UI Suggestions
- Navigate here from: clicking `device_id` in any audit log detail view
- **Red banner** if `is_multi_account: true` — "Multiple accounts detected on this device"
- Show all associated users as cards
- Show all IPs used with this device
- Full activity log below

---

## 6. User Audit Logs (with Per-User Analytics)
**GET** `/api/v1/unified-admin/audit-logs/user/:userId`

Returns all audit logs for a specific user with their profile info **plus per-user analytics**: action breakdown, severity breakdown, failure count, and IP addresses used.

### Query Params
Same as the main list (pagination, filters, search, date range).

### Response
```json
{
  "success": true,
  "message": "User audit logs fetched",
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+2348012345678",
      "smipay_tag": "johndoe",
      "account_status": "active",
      "role": "user",
      "profile_image": { "secure_url": "https://..." }
    },
    "user_summary": {
      "total_actions": 1240,
      "failure_count": 15,
      "top_actions": [
        { "action": "BALANCE_CHECK", "count": 450 },
        { "action": "TRANSFER_INITIATE", "count": 200 },
        { "action": "LOGIN", "count": 180 }
      ],
      "by_severity": {
        "LOW": 1100,
        "MEDIUM": 120,
        "HIGH": 18,
        "CRITICAL": 2
      },
      "ip_addresses": [
        { "ip_address": "105.112.45.67", "count": 800 },
        { "ip_address": "197.210.78.12", "count": 400 },
        { "ip_address": "41.58.100.5", "count": 40 }
      ]
    },
    "data": [ /* audit log objects */ ],
    "meta": { /* pagination */ }
  }
}
```

### UI Suggestions
- Show user profile card at top with avatar, status, contact info
- **User summary section:**
  - Total actions, failure count (red if high), failure rate percentage
  - Top actions as a horizontal bar chart
  - Severity breakdown as colored chips
  - IP addresses used — highlight if user has many distinct IPs (VPN/fraud indicator)
- Full filterable audit log table below

---

## 7. Get Audit Log Detail
**GET** `/api/v1/unified-admin/audit-logs/:id`

Returns a single audit log entry with full user info, reviewer details, **and nearby session actions for context**.

### Response
Same fields as the list object, plus:

| Field | Type | Description |
|---|---|---|
| `user.smipay_tag` | string \| null | User's Smipay tag |
| `user.role` | string | User's role |
| `user.account_status` | string | User's account status |
| `user.profile_image` | object \| null | `{ secure_url }` |
| `reviewed_by_admin` | object \| null | `{ id, first_name, last_name, email }` — who reviewed this entry |
| `session_context` | array | Up to 20 nearby actions in the same session (±5 min window) |

### Session Context Object (`data.session_context[]`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Log UUID |
| `action` | string | Action code |
| `status` | string | Outcome |
| `severity` | string | Risk level |
| `description` | string | What happened |
| `created_at` | string | Timestamp |

### UI Suggestions
- Show all fields organized: **Who** (actor), **What** (action/status/severity), **Where** (IP/geo/device), **How** (method/endpoint), **Context** (description, old/new values, metadata, error)
- **Session Context:** Show as a mini-timeline below the main detail — "What else happened in this session?" Clicking an item opens that log's detail
- **Old/New values:** Diff view for update actions
- **Financial section:** Amount, currency, balance before/after, transaction link
- **Compliance section:** Flag status, reviewer, review notes, review timestamp
- Clickable links: user → user audit logs, session → full session trace, IP → IP investigation, device → device investigation

---

## 8. Flagged Logs
**GET** `/api/v1/unified-admin/audit-logs/flagged`

Convenience endpoint that pre-filters `is_flagged=true`. Accepts same query params as the main list.

### Response
Same paginated list structure (without analytics).

---

## 9. Flag Audit Log
**POST** `/api/v1/unified-admin/audit-logs/:id/flag`

Flags an entry for compliance review.

### Payload
```json
{
  "reason": "Suspicious transfer pattern — multiple transfers to new accounts"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `reason` | string | Yes | Why this entry is being flagged |

### Response
```json
{
  "success": true,
  "message": "Audit log flagged",
  "data": { /* updated audit log object */ }
}
```

---

## 10. Review Flagged Log
**POST** `/api/v1/unified-admin/audit-logs/:id/review`

Review a flagged entry. Optionally resolve it.

### Payload
```json
{
  "review_notes": "Investigated — legitimate transfers to family members. No action needed.",
  "resolve": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `review_notes` | string | Yes | Review findings / notes |
| `resolve` | boolean | Yes | `true` = unflag and mark resolved. `false` = add notes but keep flagged. |

### Response
```json
{
  "success": true,
  "message": "Audit log resolved",
  "data": { /* updated audit log object */ }
}
```

---

## Enum Values Reference

### Categories
| Value | Description |
|---|---|
| `AUTHENTICATION` | Login, logout, session management |
| `REGISTRATION` | Multi-step registration flow |
| `USER_MANAGEMENT` | Profile, KYC, PIN, dashboard views |
| `KYC_VERIFICATION` | BVN, NIN, ID verification |
| `BANKING` | Wallet funding, virtual accounts, bank operations |
| `TRANSFER` | P2P transfers, Paystack transfers |
| `WALLET` | Wallet credit, debit, balance checks |
| `AIRTIME` | Airtime purchases |
| `DATA` | Data bundle purchases |
| `CABLE` | Cable TV subscriptions |
| `EDUCATION` | Education payments |
| `ELECTRICITY` | Electricity payments |
| `INSURANCE` | Insurance payments |
| `BETTING` | Betting account funding |
| `CARD_MANAGEMENT` | Virtual card operations |
| `SUPPORT` | Support ticket operations |
| `NOTIFICATION` | Push notification operations |
| `ADMIN` | Admin-specific operations |
| `SYSTEM` | Cron jobs, system errors |
| `WEBHOOK` | Incoming webhook processing |
| `TRANSACTION_HISTORY` | Transaction history views |

### Status
| Value | Badge Color | Description |
|---|---|---|
| `SUCCESS` | Green | Action completed successfully |
| `FAILURE` | Red | Action failed |
| `PENDING` | Yellow | Action in progress |
| `BLOCKED` | Gray | Action was blocked (rate limit, etc.) |

### Severity
| Value | Badge Color | Description |
|---|---|---|
| `LOW` | Gray | Routine action, no risk |
| `MEDIUM` | Blue | Notable action (financial, profile changes) |
| `HIGH` | Orange | Sensitive action (failed auth, large transfers) |
| `CRITICAL` | Red | Critical event (suspected fraud, system errors) |

### Actor Type
| Value | Description |
|---|---|
| `USER` | Regular app user |
| `ADMIN` | Admin panel user |
| `SYSTEM` | Internal system process |
| `WEBHOOK` | External webhook (Paystack, Flutterwave, etc.) |
| `CRON` | Scheduled cron job |

---

## Frontend Implementation Notes

### Page Structure

```
┌──────────────────────────────────────────────────┐
│  Analytics Cards Row (overview numbers)           │
├──────────────────────────────────────────────────┤
│  Charts Row (timeline + breakdowns)               │
├──────────────────────────────────────────────────┤
│  Fraud Indicators Panel (collapsible)             │
├──────────────────────────────────────────────────┤
│  Recent High-Severity Feed                        │
├──────────────────────────────────────────────────┤
│  Filter Bar + Search                              │
├──────────────────────────────────────────────────┤
│  Audit Logs Table                                 │
└──────────────────────────────────────────────────┘
```

### Page Load
1. Call `GET /unified-admin/audit-logs` → renders analytics + table
2. Call `GET /unified-admin/audit-logs/timeline` → renders trend chart
3. Both calls can run **in parallel**

### Analytics Section
- **Overview cards:** Total Logs, Today vs Yesterday (with % change), Flagged (highlight unreviewed in red badge), Failures (show today's count), High Severity (show today's count), Blocked.
- **Financial flagged volume** — "₦2.45M flagged" — shows scale of potentially suspicious financial activity.
- **Week-over-week** trend indicator on activity card.
- **Unreviewed flagged** is the primary CTA — display as a red pulsing badge.

### Fraud Indicators Section
- **Top Failed Actions:** Shows which actions fail most — if `LOGIN_FAILED` spikes, there may be a brute-force attack in progress
- **Top Failed Users:** Shows users with the most failures — clicking navigates to their user audit log page
- **Suspicious IPs:** IPs used by multiple accounts — clicking navigates to the IP investigation page
- This section should be **collapsible** and default-open

### Timeline Chart
- X-axis: time buckets, Y-axis: counts
- Multi-line: total (gray), failures (red), high-severity (orange), flagged (purple)
- Clickable data points → filter the table below to that date range
- Spike detection: visually highlight points > 2x rolling average

### Audit Logs Table
Suggested columns:

| Column | Source | Notes |
|---|---|---|
| Time | `created_at` | Relative time, full datetime on hover |
| Actor | `actor_name` or `user.first_name` | Show actor_type badge (User/Admin/System/Webhook) |
| Action | `action` | Formatted label (e.g. `TRANSFER_INITIATE` → "Transfer Initiated") |
| Category | `category` | Colored chip |
| Status | `status` | Green/red/yellow/gray badge |
| Severity | `severity` | Colored badge (critical = red pulse animation) |
| Description | `description` | Truncated, full on hover |
| Amount | `amount` + `currency` | Format as ₦10,000.00, hide column if null |
| IP / Location | `ip_address` + `geo_location` | Show location, IP on hover. **Clickable → IP investigation** |
| Device | `device_model` + `platform` | **Clickable → device investigation** |
| Session | `session_id` | Truncated, **clickable → session trace** |
| Flagged | `is_flagged` | Flag icon, red if flagged |

- **Quick filters:** Preset buttons: "Failures", "High Severity", "Flagged", "Blocked", "Financial"
- **Category tabs:** Tab bar for switching between categories
- **Search:** Debounce 300-500ms
- **Row click:** Opens detail view (slide-in drawer or full page)

### Detail View
- Organized sections: **Who** → **What** → **Where** → **How** → **Context** → **Financial** → **Compliance**
- **Session Context** section: mini-timeline of nearby actions in the same session
- **Old/New values:** Diff view for update actions
- **Metadata:** Collapsible JSON viewer
- **Navigation links:** User → user logs, Session → session trace, IP → IP investigation, Device → device investigation, Transaction ref → transaction detail
- **Actions:** Flag button (opens reason modal), Review button (opens notes + resolve toggle)

### Navigation Between Investigation Pages

```
Main Audit Table
  → Click IP → IP Investigation Page
  → Click Device → Device Investigation Page
  → Click Session ID → Session Trace Page
  → Click User → User Audit Logs Page
  → Click Row → Detail Page
      → Session Context links → other Detail Pages
      → IP/Device/Session links → investigation pages
```

### Action Name Formatting
Convert enum values to readable labels:
```
TRANSFER_INITIATE → "Transfer Initiated"
LOGIN_FAILED → "Login Failed"
WALLET_CREDIT → "Wallet Credited"
FUND_WALLET_COMPLETE → "Wallet Funding Completed"
```
Pattern: split by `_`, title-case each word, past tense where appropriate.

### Severity Color Coding
- `LOW` → `gray-400` / muted
- `MEDIUM` → `blue-500`
- `HIGH` → `orange-500`
- `CRITICAL` → `red-600` with subtle pulse animation

### Status Color Coding
- `SUCCESS` → `green-500`
- `FAILURE` → `red-500`
- `PENDING` → `yellow-500`
- `BLOCKED` → `gray-500`

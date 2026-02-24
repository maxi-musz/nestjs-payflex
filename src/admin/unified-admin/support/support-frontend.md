# Support Ticket Management API Endpoints

## Base Path
`/api/v1/unified-admin/support`

**Auth:** JWT Bearer token (admin role required)

---

## 1. List Tickets (Analytics + Table — Single Endpoint)
**GET** `/api/v1/unified-admin/support`

Returns both the **analytics** (for the dashboard cards above the table) and the **paginated ticket list** in a single response. Analytics reflect the full dataset — not affected by table filters.

### Query Params

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |
| `search` | string | — | Searches across: ticket number, subject, email, phone number, description (case-insensitive) |
| `status` | string | — | Filter by status: `pending`, `in_progress`, `waiting_user`, `resolved`, `closed`, `escalated` |
| `priority` | string | — | Filter by priority: `low`, `medium`, `high`, `urgent` |
| `support_type` | string | — | Filter by type: `REGISTRATION_ISSUE`, `LOGIN_ISSUE`, `TRANSACTION_ISSUE`, etc. (see enum reference below) |
| `assigned_to` | string | — | Filter by assigned admin user UUID |
| `user_id` | string | — | Filter by ticket owner user UUID |
| `date_from` | string | — | Start date (ISO 8601) |
| `date_to` | string | — | End date |
| `sort_by` | string | `createdAt` | Sort field: `createdAt`, `updatedAt`, `priority`, `status`, `support_type` |
| `sort_order` | string | `desc` | Sort direction: `asc` or `desc` |

### Example Requests
```
GET /api/v1/unified-admin/support?page=1&limit=20&status=pending&priority=urgent

GET /api/v1/unified-admin/support?search=SMI-2026-001234

GET /api/v1/unified-admin/support?support_type=TRANSACTION_ISSUE&status=escalated&sort_by=priority&sort_order=desc
```

### Response
```json
{
  "success": true,
  "message": "Tickets fetched",
  "data": {
    "analytics": {
      "overview": {
        "total_tickets": 842,
        "open": 125,
        "pending": 65,
        "in_progress": 40,
        "escalated": 20,
        "waiting_user": 35,
        "resolved": 580,
        "closed": 102,
        "unassigned": 28
      },
      "activity": {
        "new_today": 8,
        "new_this_week": 42,
        "new_this_month": 180
      },
      "performance": {
        "avg_response_time_seconds": 3600,
        "avg_satisfaction_rating": 4.2,
        "total_rated": 320
      },
      "by_status": {
        "pending": 65,
        "in_progress": 40,
        "waiting_user": 35,
        "resolved": 580,
        "closed": 102,
        "escalated": 20
      },
      "by_priority": {
        "low": 200,
        "medium": 450,
        "high": 150,
        "urgent": 42
      },
      "by_type": {
        "REGISTRATION_ISSUE": 120,
        "TRANSACTION_ISSUE": 280,
        "WALLET_ISSUE": 95,
        "KYC_VERIFICATION_ISSUE": 80,
        "PAYMENT_ISSUE": 65,
        "ACCOUNT_ISSUE": 50,
        "LOGIN_ISSUE": 40,
        "CARD_ISSUE": 30,
        "SECURITY_ISSUE": 20,
        "REFUND_REQUEST": 25,
        "GENERAL_INQUIRY": 37
      }
    },
    "tickets": [
      {
        "id": "uuid",
        "ticket_number": "SMI-2026-001234",
        "user_id": "uuid",
        "phone_number": "+2348012345678",
        "email": "john@example.com",
        "subject": "My transfer did not go through",
        "support_type": "TRANSACTION_ISSUE",
        "status": "pending",
        "priority": "high",
        "assigned_to": "admin-uuid",
        "first_response_at": null,
        "last_response_at": null,
        "response_time_seconds": null,
        "resolved_at": null,
        "satisfaction_rating": null,
        "tags": ["payment", "urgent"],
        "createdAt": "2026-02-24T08:30:00.000Z",
        "updatedAt": "2026-02-24T08:30:00.000Z",
        "user": {
          "id": "uuid",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com",
          "phone_number": "+2348012345678",
          "smipay_tag": "johndoe",
          "profile_image": {
            "secure_url": "https://..."
          }
        },
        "message_count": 3,
        "assigned_admin": {
          "id": "admin-uuid",
          "first_name": "Admin",
          "last_name": "User",
          "email": "admin@smipay.com"
        }
      }
    ],
    "meta": {
      "total": 842,
      "page": 1,
      "limit": 20,
      "total_pages": 43
    }
  }
}
```

### Analytics Object (`data.analytics`)

| Field | Type | Description |
|---|---|---|
| `overview.total_tickets` | number | Total tickets ever created |
| `overview.open` | number | Currently active (pending + in_progress + escalated) |
| `overview.pending` | number | Awaiting first support response |
| `overview.in_progress` | number | Being actively worked on |
| `overview.escalated` | number | Escalated to management |
| `overview.waiting_user` | number | Waiting for user response |
| `overview.resolved` | number | Total resolved tickets |
| `overview.closed` | number | Total closed tickets |
| `overview.unassigned` | number | Open tickets with no admin assigned |
| `activity.new_today` | number | Tickets created today |
| `activity.new_this_week` | number | Tickets created in the last 7 days |
| `activity.new_this_month` | number | Tickets created in the last 30 days |
| `performance.avg_response_time_seconds` | number \| null | Average first-response time in seconds. Display as human-readable (e.g. "1h 30m") |
| `performance.avg_satisfaction_rating` | number \| null | Average user satisfaction (1-5 scale). `null` if no ratings yet. |
| `performance.total_rated` | number | How many tickets have been rated |
| `by_status` | object | Ticket count per status |
| `by_priority` | object | Ticket count per priority |
| `by_type` | object | Ticket count per support type |

### Analytics UI Layout Suggestion

```
┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐
│  Open Tickets │  Pending      │  Unassigned   │  Avg Response │  Satisfaction │
│     125       │     65        │     28        │   1h 30m      │   ⭐ 4.2/5    │
│  20 escalated │  ← needs attn│  ← needs attn │               │  320 rated    │
└───────────────┴───────────────┴───────────────┴───────────────┴───────────────┘

┌─────────────────────────────┬──────────────────────────────┐
│  Status Breakdown (donut)   │  Type Breakdown (bar chart)  │
│  ● Pending     65           │  ██████ TRANSACTION    280   │
│  ● In Progress 40           │  ████ REGISTRATION     120   │
│  ● Escalated   20           │  ███ WALLET             95   │
│  ● Waiting     35           │  ██ KYC                 80   │
│  ● Resolved   580           │  ██ PAYMENT             65   │
└─────────────────────────────┴──────────────────────────────┘
```

### Ticket Object (`data.tickets[]`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Ticket UUID |
| `ticket_number` | string | Human-readable ticket number (e.g. `"SMI-2026-001234"`) |
| `user_id` | string \| null | Owner user UUID (null for unregistered users) |
| `phone_number` | string \| null | Contact phone |
| `email` | string \| null | Contact email |
| `subject` | string | Brief summary of the issue |
| `support_type` | string | Issue category (see enum reference) |
| `status` | string | Current status (see enum reference) |
| `priority` | string | Priority level (see enum reference) |
| `assigned_to` | string \| null | Assigned admin user UUID |
| `first_response_at` | string \| null | When admin first responded |
| `last_response_at` | string \| null | Most recent response time |
| `response_time_seconds` | number \| null | First response time in seconds |
| `resolved_at` | string \| null | When ticket was resolved |
| `satisfaction_rating` | number \| null | User rating 1-5 |
| `tags` | array \| null | Categorization tags |
| `createdAt` | string | Ticket creation time |
| `updatedAt` | string | Last update time |
| `user` | object \| null | Ticket owner info (see User Brief below) |
| `message_count` | number | Total messages in this ticket |
| `assigned_admin` | object \| null | `{ id, first_name, last_name, email }` — assigned admin info |

### User Brief Object

| Field | Type | Description |
|---|---|---|
| `id` | string | User UUID |
| `first_name` | string \| null | |
| `last_name` | string \| null | |
| `email` | string \| null | |
| `phone_number` | string | |
| `smipay_tag` | string \| null | |
| `profile_image` | object \| null | `{ secure_url }` |

---

## 2. Get Ticket Detail (Full Conversation)
**GET** `/api/v1/unified-admin/support/:id`

Returns the full ticket with all messages (including internal notes), user details, assigned admin, resolver, and related transaction.

### Response
```json
{
  "success": true,
  "message": "Ticket fetched",
  "data": {
    "id": "uuid",
    "ticket_number": "SMI-2026-001234",
    "user_id": "uuid",
    "phone_number": "+2348012345678",
    "email": "john@example.com",
    "subject": "My transfer did not go through",
    "description": "I tried sending ₦10,000 to @janedoe but the money was deducted and not received.",
    "support_type": "TRANSACTION_ISSUE",
    "status": "in_progress",
    "priority": "high",
    "assigned_to": "admin-uuid",
    "resolved_at": null,
    "resolved_by": null,
    "resolution_notes": null,
    "related_transaction_id": "tx-uuid",
    "related_registration_progress_id": null,
    "device_metadata": {
      "device_id": "device-abc123",
      "platform": "android",
      "device_model": "Samsung Galaxy S23",
      "app_version": "2.1.0"
    },
    "ip_address": "105.112.45.67",
    "user_agent": "SmipayApp/2.1.0 Android",
    "tags": ["payment", "urgent"],
    "internal_notes": "Checked transaction logs — looks like a timeout issue.",
    "attachments": null,
    "first_response_at": "2026-02-24T09:00:00.000Z",
    "last_response_at": "2026-02-24T10:15:00.000Z",
    "response_time_seconds": 1800,
    "satisfaction_rating": null,
    "feedback": null,
    "createdAt": "2026-02-24T08:30:00.000Z",
    "updatedAt": "2026-02-24T10:15:00.000Z",
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+2348012345678",
      "smipay_tag": "johndoe",
      "account_status": "active",
      "role": "user",
      "profile_image": null,
      "wallet": { "current_balance": 50000.00 },
      "tier": { "tier": "VERIFIED", "name": "Verified Tier" },
      "kyc_verification": { "is_verified": true, "status": "approved" }
    },
    "messages": [
      {
        "id": "msg-uuid-1",
        "message": "I tried sending ₦10,000 to @janedoe but the money was deducted and not received.",
        "is_internal": false,
        "is_from_user": true,
        "user_id": "uuid",
        "sender_name": "John Doe",
        "sender_email": "john@example.com",
        "attachments": null,
        "createdAt": "2026-02-24T08:30:00.000Z"
      },
      {
        "id": "msg-uuid-2",
        "message": "Checking the transaction logs now.",
        "is_internal": true,
        "is_from_user": false,
        "user_id": "admin-uuid",
        "sender_name": "Admin User",
        "sender_email": "admin@smipay.com",
        "attachments": null,
        "createdAt": "2026-02-24T09:00:00.000Z"
      },
      {
        "id": "msg-uuid-3",
        "message": "Hi John, we've identified the issue. The transfer timed out during processing. We're crediting the recipient now.",
        "is_internal": false,
        "is_from_user": false,
        "user_id": "admin-uuid",
        "sender_name": "Admin User",
        "sender_email": "admin@smipay.com",
        "attachments": null,
        "createdAt": "2026-02-24T10:15:00.000Z"
      }
    ],
    "assigned_admin": {
      "id": "admin-uuid",
      "first_name": "Admin",
      "last_name": "User",
      "email": "admin@smipay.com"
    },
    "resolved_by_admin": null,
    "related_transaction": {
      "id": "tx-uuid",
      "amount": 10000.00,
      "transaction_type": "transfer",
      "status": "success",
      "transaction_reference": "SMI-TXN-xyz789",
      "createdAt": "2026-02-24T08:25:00.000Z"
    }
  }
}
```

### Detail Fields

| Field | Type | Description |
|---|---|---|
| `description` | string | Full issue description |
| `resolution_notes` | string \| null | Admin notes on how issue was resolved |
| `related_transaction_id` | string \| null | Linked transaction UUID |
| `related_registration_progress_id` | string \| null | Linked registration progress UUID |
| `device_metadata` | object \| null | Device info when ticket was created |
| `ip_address` | string \| null | User IP |
| `user_agent` | string \| null | User agent string |
| `internal_notes` | string \| null | Internal-only notes |
| `attachments` | array \| null | Attachment URLs |
| `feedback` | string \| null | User feedback after resolution |
| `messages` | array | Full conversation thread (see Message Object) |
| `assigned_admin` | object \| null | `{ id, first_name, last_name, email }` |
| `resolved_by_admin` | object \| null | `{ id, first_name, last_name, email }` — who resolved it |
| `related_transaction` | object \| null | Linked transaction summary |
| `user.wallet` | object | `{ current_balance }` |
| `user.tier` | object \| null | `{ tier, name }` |
| `user.kyc_verification` | object \| null | `{ is_verified, status }` |

### Message Object (`messages[]`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Message UUID |
| `message` | string | Message content |
| `is_internal` | boolean | `true` = only visible to support team. Style differently in UI (e.g. yellow background). |
| `is_from_user` | boolean | `true` = from user, `false` = from admin |
| `user_id` | string \| null | Sender's user UUID |
| `sender_name` | string \| null | Display name of sender |
| `sender_email` | string \| null | Email of sender |
| `attachments` | array \| null | Attachment URLs |
| `createdAt` | string | Message timestamp |

---

## 3. Reply to Ticket
**POST** `/api/v1/unified-admin/support/:id/reply`

### Payload
```json
{
  "message": "Hi John, we've identified the issue and are resolving it now.",
  "is_internal": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | Reply content |
| `is_internal` | boolean | No | Default: `false`. Set `true` for internal notes only visible to the support team. |

### Behavior
- Creates a new message in the conversation thread
- Updates `last_response_at` on the ticket
- If this is the first admin response, sets `first_response_at` and calculates `response_time_seconds`
- If ticket status is `pending`, auto-sets it to `in_progress` (unless it's an internal note)

### Response
```json
{
  "success": true,
  "message": "Reply sent",
  "data": {
    "id": "msg-uuid",
    "message": "Hi John, we've identified the issue and are resolving it now.",
    "is_internal": false,
    "is_from_user": false,
    "sender_name": "Admin User",
    "createdAt": "2026-02-24T10:15:00.000Z"
  }
}
```

---

## 4. Update Ticket Status
**PUT** `/api/v1/unified-admin/support/:id/status`

### Payload
```json
{
  "status": "resolved",
  "resolution_notes": "Wallet credited manually after confirming payment on provider side."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | New status: `pending`, `in_progress`, `waiting_user`, `resolved`, `closed`, `escalated` |
| `resolution_notes` | string | No | Notes on resolution (saved when resolving/closing) |

### Behavior
- When setting `resolved` or `closed`: automatically sets `resolved_at` timestamp and `resolved_by` to the current admin
- Updates stats counters

### Response
```json
{
  "success": true,
  "message": "Ticket resolved",
  "data": { /* ticket list object */ }
}
```

---

## 5. Assign Ticket
**PUT** `/api/v1/unified-admin/support/:id/assign`

### Payload
```json
{
  "assigned_to": "admin-user-uuid"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `assigned_to` | string | Yes | UUID of the admin user to assign to |

### Response
```json
{
  "success": true,
  "message": "Ticket assigned",
  "data": { /* ticket list object */ }
}
```

---

## 6. Update Ticket Priority
**PUT** `/api/v1/unified-admin/support/:id/priority`

### Payload
```json
{
  "priority": "urgent"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `priority` | string | Yes | `low`, `medium`, `high`, `urgent` |

### Response
```json
{
  "success": true,
  "message": "Priority updated",
  "data": { /* ticket list object */ }
}
```

---

## Enum Values Reference

### Ticket Status
| Value | Description | Badge Color |
|---|---|---|
| `pending` | Awaiting first support response | Yellow |
| `in_progress` | Being actively worked on | Blue |
| `waiting_user` | Waiting for user to respond | Orange |
| `resolved` | Issue resolved | Green |
| `closed` | Ticket closed | Gray |
| `escalated` | Escalated to management | Red |

### Ticket Priority
| Value | Description | Badge Color |
|---|---|---|
| `low` | Non-urgent | Gray |
| `medium` | Standard | Blue |
| `high` | Needs attention soon | Orange |
| `urgent` | Critical, immediate attention | Red |

### Support Type
| Value | Description |
|---|---|
| `REGISTRATION_ISSUE` | Problems during registration |
| `LOGIN_ISSUE` | Unable to log in |
| `TRANSACTION_ISSUE` | Failed/stuck transaction |
| `PAYMENT_ISSUE` | Payment processing problems |
| `ACCOUNT_ISSUE` | Account access or settings |
| `WALLET_ISSUE` | Wallet balance or funding |
| `CARD_ISSUE` | Virtual card problems |
| `KYC_VERIFICATION_ISSUE` | KYC verification problems |
| `SECURITY_ISSUE` | Suspicious activity, fraud |
| `FEATURE_REQUEST` | Feature suggestion |
| `BUG_REPORT` | App bug report |
| `BILLING_ISSUE` | Billing/charges dispute |
| `REFUND_REQUEST` | Requesting a refund |
| `GENERAL_INQUIRY` | General question |
| `OTHER` | Anything else |

---

## Frontend Implementation Notes

### Page Load
One call — `GET /unified-admin/support` returns `analytics` + `tickets` + `meta`. Render analytics at the top, then the table below.

### Analytics Section (Above Table)
- **Overview cards:** Open Tickets (highlight if high), Pending (needs attention), Unassigned (action required), Avg Response Time, Satisfaction Rating.
- **Pending + Unassigned** are action items — highlight them in orange/red if above thresholds.
- **Avg Response Time:** Format `response_time_seconds` as human-readable: `< 60` = "< 1m", `3600` = "1h", `86400` = "1d". Color: green < 1h, yellow 1-4h, red > 4h.
- **Status breakdown:** Donut chart — pending (yellow), in_progress (blue), escalated (red), waiting_user (orange), resolved (green), closed (gray).
- **Type breakdown:** Horizontal bar chart — shows which issue types drive the most tickets.
- **Priority breakdown:** Small badges or stacked bar.

### Tickets Table
Suggested columns:

| Column | Source | Notes |
|---|---|---|
| Ticket # | `ticket_number` | Clickable, links to detail view |
| User | `user.first_name + last_name` | Avatar + name. Show email if no user (unregistered). |
| Subject | `subject` | Truncated, full on hover |
| Type | `support_type` | Chip/badge with category |
| Status | `status` | Colored badge |
| Priority | `priority` | Colored badge (urgent = red, high = orange, etc.) |
| Assigned | `assigned_admin.first_name` | Show "Unassigned" in muted red if null |
| Messages | `message_count` | Message bubble icon + count |
| Last Response | `last_response_at` | Relative time. Highlight in red if pending > X hours with no response. |
| Created | `createdAt` | Relative time + full date on hover |

- **Quick filters:** Show preset filter buttons at the top: "Pending", "My Tickets" (assigned_to = current admin), "Unassigned", "Urgent", "Escalated"
- **Search:** Debounce 300-500ms. Searches ticket number, subject, email, phone, description.
- **Row click:** Navigate to ticket detail / conversation view.

### Ticket Detail / Conversation Page
- **Left panel or main area:** Full message thread. Style messages as chat bubbles:
  - User messages: left-aligned, light background
  - Admin messages: right-aligned, colored background
  - Internal notes: distinct style (e.g. yellow background, lock icon), only visible to admins
- **Reply box at bottom:** Text input with "Send" and "Internal Note" toggle
- **Sidebar or header:** Show ticket metadata (status, priority, assigned, created, response time)
- **Action buttons:** Change Status, Change Priority, Assign, Flag
- **Related transaction:** If `related_transaction` is present, show a clickable link to the transaction detail page
- **User card:** Show user info, wallet balance, tier, KYC status — helpful for context
- **Resolution section:** When resolved, show `resolution_notes`, `resolved_by_admin`, `resolved_at`

### Response Time Formatting
```
seconds < 60       → "< 1 min"
seconds < 3600     → "Xm"   (e.g. "45m")
seconds < 86400    → "Xh Ym" (e.g. "2h 15m")
seconds >= 86400   → "Xd Yh" (e.g. "1d 4h")
```

### Satisfaction Rating Display
- Show as stars (1-5) or numeric with star icon
- `null` = "Not rated" in muted text
- Color: 4-5 green, 3 yellow, 1-2 red

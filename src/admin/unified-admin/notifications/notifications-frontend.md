# Notification Campaigns — Admin API

## Base Path
`/api/v1/unified-admin/notifications`

**Auth:** JWT Bearer token (admin role required)

**Response format:** All endpoints return the standard `ApiResponseDto` wrapper:
```json
{ "success": true, "message": "...", "data": { ...actual payload... } }
```
Frontend should always read the actual data from `response.data.data` (Axios) or `(await res.json()).data` (fetch).

---

## READ THIS FIRST — How Notification Campaigns Work (Plain English)

### What is this?

This lets admin/support staff send emails to SmiPay users — individually, to a filtered group, or to everyone. Think of it as an internal email campaign tool built right into the admin panel.

**Use cases:**
- "Planned maintenance tonight at 2 AM" → send to **all** users
- "Your KYC is expiring soon" → send to users whose KYC was verified over 6 months ago (use **filtered**)
- "Welcome bonus activated for you" → send to one specific user (use **individual**)

### How it works end-to-end

1. **Admin writes an email** — title, subject line, and the body in Markdown
2. **Admin picks an audience** — "all", a specific list of emails, or by applying filters (role, tier, balance, etc.)
3. **Admin clicks "Send" or "Schedule"**
   - **Send now:** Backend starts sending immediately in the background. The API returns the campaign ID right away — admin doesn't wait.
   - **Schedule:** Backend saves the campaign with `status: scheduled`. A cron job checks every 60 seconds and fires it when the time comes.
4. **Emails go out in batches of 50** with a 2-second gap between batches so we don't hit rate limits
5. **Every single email is logged** — admin can see exactly who received it, who failed, and retry failed ones

### About Markdown content

The email body is written in **Markdown** (same syntax as GitHub, Notion, etc.). The backend converts it to beautiful HTML wrapped in SmiPay's branded email template (logo, footer, social links — the works).

Supported Markdown features:
- **Bold** (`**text**`), *italic* (`*text*`)
- Headings (`# Big`, `## Medium`, `### Small`)
- Links (`[click here](https://example.com)`)
- Bullet lists (`- item`) and numbered lists (`1. item`)
- Horizontal rules (`---`)
- Blockquotes (`> important note`)

**Variable interpolation** — you can use placeholders that get replaced per recipient:
- `{{first_name}}` → user's first name (falls back to "Customer" if empty)
- `{{last_name}}` → user's last name
- `{{email}}` → recipient's email address

Example:
```markdown
# Hi {{first_name}}! 👋

We're excited to let you know that **SmiPay** is launching a new cashback program!

Starting **March 1st**, you'll earn cashback on every purchase:
- **Airtime:** 3% back
- **Data:** 2.5% back
- **Cable TV:** 2% back

> Your cashback goes into a separate wallet you can track in the app.

Thanks for being part of the SmiPay family!
```

### Campaign Lifecycle

```
draft → sending → sent       (immediate send)
draft → scheduled → sending → sent  (scheduled send)
draft → scheduled → cancelled       (admin cancelled before send time)
draft → sending → failed            (all emails failed)
```

---

## API Endpoints

### 1. Create Campaign (Send or Schedule)

**`POST /campaigns`**

Creates a new email campaign. If `scheduled_for` is in the future, the campaign is scheduled. Otherwise it sends immediately in the background.

**Request Body:**

```json
{
  "title": "March Maintenance Notice",
  "subject": "Planned Maintenance — March 1st",
  "content_markdown": "# Hi {{first_name}}!\n\nWe will be performing scheduled maintenance on **March 1st from 2:00 AM to 4:00 AM WAT**.\n\nDuring this time, the app may be briefly unavailable.\n\nThank you for your patience!",
  "target_type": "all",
  "target_filters": null,
  "target_emails": null,
  "scheduled_for": null
}
```

**Request Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Internal campaign name (not shown to users) |
| `subject` | string | Yes | Email subject line (what users see in inbox) |
| `content_markdown` | string | Yes | Email body in Markdown format |
| `target_type` | string | Yes | `"all"`, `"individual"`, or `"filtered"` |
| `target_filters` | object | Only if `filtered` | Filter criteria (see below) |
| `target_emails` | string[] | Only if `individual` | Array of specific email addresses |
| `scheduled_for` | string (ISO) | No | ISO datetime to send in the future. If null or in the past, sends immediately. |

**Response (201):**

```json
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    "title": "March Maintenance Notice",
    "subject": "Planned Maintenance — March 1st",
    "content_markdown": "# Hi {{first_name}}! ...",
    "content_html": "<html>...</html>",
    "target_type": "all",
    "target_filters": null,
    "target_emails": null,
    "status": "draft",
    "scheduled_for": null,
    "sent_at": null,
    "total_recipients": 0,
    "sent_count": 0,
    "failed_count": 0,
    "created_by": "admin-user-id",
    "createdAt": "2026-02-26T18:30:00.000Z",
    "updatedAt": "2026-02-26T18:30:00.000Z"
  }
}
```

> **Note:** For immediate sends, `status` will be `"draft"` in the response but the campaign starts sending in the background right away. Poll `GET /campaigns/:id` to track progress.

---

### 2. Preview Audience (No Emails Sent)

**`POST /campaigns/preview`**

Same request body as Create Campaign, but **does not create or send anything**. Just returns how many users match the filters, plus a sample of 5 emails so admin can verify.

**Use this before every send** so admin can confirm "234 users will receive this email" before committing.

**Request Body:** Same as Create Campaign

**Response (200):**

```json
{
  "success": true,
  "message": "Audience preview fetched",
  "data": {
    "count": 234,
    "sample": [
      "john@example.com",
      "jane@example.com",
      "user3@example.com",
      "user4@example.com",
      "user5@example.com"
    ]
  }
}
```

---

### 3. List All Campaigns (Paginated)

**`GET /campaigns`**

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `status` | string | — | Filter by status: `draft`, `scheduled`, `sending`, `sent`, `failed`, `cancelled` |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

**Response (200):**

```json
{
  "success": true,
  "message": "Campaigns fetched",
  "data": {
    "campaigns": [
      {
        "id": "a1b2c3d4-...",
        "title": "March Maintenance Notice",
        "subject": "Planned Maintenance — March 1st",
        "target_type": "all",
        "status": "sent",
        "total_recipients": 234,
        "sent_count": 231,
        "failed_count": 3,
        "scheduled_for": null,
        "sent_at": "2026-02-26T18:35:00.000Z",
        "createdAt": "2026-02-26T18:30:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

---

### 4. Get Campaign Details

**`GET /campaigns/:id`**

Returns full campaign details including the markdown source and rendered HTML. Useful for showing a "preview" of the email in the admin panel.

**Response (200):**

```json
{
  "success": true,
  "message": "Campaign fetched",
  "data": {
    "id": "a1b2c3d4-...",
    "title": "March Maintenance Notice",
    "subject": "Planned Maintenance — March 1st",
    "content_markdown": "# Hi {{first_name}}! ...",
    "content_html": "<html>...</html>",
    "target_type": "all",
    "target_filters": null,
    "target_emails": null,
    "status": "sent",
    "scheduled_for": null,
    "sent_at": "2026-02-26T18:35:00.000Z",
    "total_recipients": 234,
    "sent_count": 231,
    "failed_count": 3,
    "created_by": "admin-user-id",
    "createdAt": "2026-02-26T18:30:00.000Z",
    "updatedAt": "2026-02-26T18:35:00.000Z"
  }
}
```

**Frontend tip:** Render `data.content_html` inside an `<iframe>` to show the email preview without your app's CSS interfering.

---

### 5. Get Delivery Logs

**`GET /campaigns/:id/logs`**

Shows per-recipient delivery status. Useful for debugging and for the admin to see exactly who got/didn't get the email.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |

**Response (200):**

```json
{
  "success": true,
  "message": "Campaign logs fetched",
  "data": {
    "logs": [
      {
        "id": "log-id-1",
        "campaign_id": "a1b2c3d4-...",
        "user_id": "user-123",
        "email": "john@example.com",
        "status": "sent",
        "error_message": null,
        "createdAt": "2026-02-26T18:31:00.000Z"
      },
      {
        "id": "log-id-2",
        "campaign_id": "a1b2c3d4-...",
        "user_id": "user-456",
        "email": "bad-email@invalid",
        "status": "failed",
        "error_message": "Connection refused",
        "createdAt": "2026-02-26T18:31:02.000Z"
      }
    ],
    "total": 234,
    "page": 1,
    "limit": 50,
    "pages": 5
  }
}
```

---

### 6. Cancel a Scheduled Campaign

**`POST /campaigns/:id/cancel`**

Only works if the campaign `status` is `scheduled`. Returns 400 if the campaign is already sending/sent.

**Response (200):**

```json
{
  "success": true,
  "message": "Campaign cancelled",
  "data": {
    "id": "a1b2c3d4-...",
    "status": "cancelled",
    "title": "...",
    "...": "...full campaign object..."
  }
}
```

---

### 7. Resend to Failed Recipients

**`POST /campaigns/:id/resend-failed`**

Retries sending to recipients whose delivery status is `"failed"`. Only works for campaigns with status `sent` or `failed`.

**Response (200):**

```json
{
  "success": true,
  "message": "Resending to failed recipients",
  "data": {
    "message": "Resending to 3 failed recipients",
    "count": 3
  }
}
```

---

## Target Type & Filters Guide

### `target_type: "all"`

No filters needed. Sends to every user with a verified email address.

```json
{
  "target_type": "all",
  "target_filters": null,
  "target_emails": null
}
```

### `target_type: "individual"`

Send to specific email addresses. Provide the emails in `target_emails`.

```json
{
  "target_type": "individual",
  "target_filters": null,
  "target_emails": ["john@example.com", "jane@example.com"]
}
```

> Only users who exist in our system AND have verified emails will actually receive the email. Invalid/non-existent emails are silently skipped.

### `target_type: "filtered"`

This is the powerful one. Combine any of these filters — they're all AND-combined (user must match ALL specified filters):

| Filter | Type | Description | Example |
|---|---|---|---|
| `role` | string | User role from the system | `"user"`, `"agent"`, `"admin"` |
| `tier` | string | User's verification tier | `"BASIC"`, `"VERIFIED"`, `"PREMIUM"` |
| `account_status` | string | Account status | `"active"`, `"suspended"` |
| `is_email_verified` | boolean | Has verified email (always true internally, but you can set it) | `true` |
| `has_completed_onboarding` | boolean | Finished full onboarding | `true` / `false` |
| `gender` | string | User's gender | `"male"`, `"female"` |
| `registered_before` | ISO date | Registered before this date | `"2026-01-01"` |
| `registered_after` | ISO date | Registered after this date | `"2025-06-01"` |
| `min_balance` | number | Wallet balance >= this amount (in Naira) | `1000` |
| `max_balance` | number | Wallet balance <= this amount | `50000` |
| `min_total_transactions` | number | Users with at least this many transactions | `10` |
| `max_total_transactions` | number | Users with at most this many transactions | `100` |
| `platform` | string | Users who have logged in from this platform | `"ios"`, `"android"` |

**Example: Send to verified users who registered in 2026 with balance above ₦5,000:**

```json
{
  "target_type": "filtered",
  "target_filters": {
    "tier": "VERIFIED",
    "registered_after": "2026-01-01",
    "min_balance": 5000
  },
  "target_emails": null
}
```

**Example: Send to all inactive Android users (no transactions):**

```json
{
  "target_type": "filtered",
  "target_filters": {
    "max_total_transactions": 0,
    "platform": "android"
  },
  "target_emails": null
}
```

---

## Recommended UI Wireframe

### Campaign Builder Page

```
┌─────────────────────────────────────────────────────┐
│  📧 New Email Campaign                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Campaign Title (internal)                          │
│  ┌─────────────────────────────────────────────┐   │
│  │ March Maintenance Notice                     │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Email Subject (what users see)                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Planned Maintenance — March 1st              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Audience ─────────────────────────────────────     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐       │
│  │ ● All    │ │ ○ Filter │ │ ○ Individual  │       │
│  └──────────┘ └──────────┘ └──────────────┘       │
│                                                     │
│  [When "Filter" selected, show filter dropdowns]    │
│  [When "Individual" selected, show email input]     │
│                                                     │
│  Email Content (Markdown) ──────────────────────    │
│  ┌─────────────────────────────────────────────┐   │
│  │ # Hi {{first_name}}! 👋                     │   │
│  │                                              │   │
│  │ We will be performing scheduled              │   │
│  │ maintenance on **March 1st**...              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  📋 Variables: {{first_name}} {{last_name}} {{email}}│
│                                                     │
│  ☐ Schedule for later                               │
│    📅 [Date picker] 🕐 [Time picker]               │
│                                                     │
│  ┌───────────────────────┐ ┌─────────────────┐     │
│  │  👁️ Preview (23 users) │ │  🚀 Send Now    │     │
│  └───────────────────────┘ └─────────────────┘     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Campaign List Page

```
┌──────────────────────────────────────────────────────────────────┐
│  📧 Email Campaigns                            [+ New Campaign]  │
├──────────────────────────────────────────────────────────────────┤
│  Status: [All ▾]  [Search...]                                    │
├──────────────────────────────────────────────────────────────────┤
│  Title                   │ Audience │ Status  │ Sent │ Created   │
│─────────────────────────│──────────│─────────│──────│───────────│
│  March Maintenance       │ All (234)│ ● Sent  │231/234│ Feb 26   │
│  Welcome Bonus           │ Filter(8)│ ● Sched │ —    │ Feb 25   │
│  KYC Reminder            │ Indiv(1) │ ● Sent  │  1/1 │ Feb 24   │
└──────────────────────────────────────────────────────────────────┘
```

### Status Badge Colors

| Status | Color | Meaning |
|---|---|---|
| `draft` | Gray | Created but not yet sending |
| `scheduled` | Blue | Waiting for the scheduled time |
| `sending` | Yellow/Orange | Currently sending (in progress) |
| `sent` | Green | All done |
| `failed` | Red | All emails failed |
| `cancelled` | Gray strikethrough | Admin cancelled before it was sent |

---

## Frontend Implementation Checklist

- [ ] Campaign list page with status filter and pagination
- [ ] Campaign detail page (show markdown preview + delivery stats)
- [ ] Campaign builder form with:
  - [ ] Title + subject inputs
  - [ ] Audience type selector (all / filtered / individual)
  - [ ] Dynamic filter form (show/hide based on audience type)
  - [ ] Email input for individual targeting (comma-separated or chip-input)
  - [ ] Markdown textarea with preview toggle
  - [ ] Schedule toggle with date/time picker
  - [ ] **Preview button** (calls `/campaigns/preview` — always show count before send)
  - [ ] Send/Schedule button
- [ ] Delivery logs page (per-campaign, paginated)
- [ ] Cancel button (only for `scheduled` campaigns)
- [ ] Resend Failed button (only for `sent`/`failed` campaigns with `failed_count > 0`)
- [ ] Auto-refresh or poll for `sending` status campaigns to update progress bar

---

## TypeScript Examples

### Create & Send Immediately

```typescript
const res = await fetch('/api/v1/unified-admin/notifications/campaigns', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: 'Flash Sale Alert',
    subject: '⚡ 5% Extra Cashback — Today Only!',
    content_markdown: `# Hi {{first_name}}! ⚡\n\nFor today only, enjoy **5% cashback** on all airtime and data purchases.\n\n[Open SmiPay](https://smipay.ng)\n\nHurry — offer ends at midnight!`,
    target_type: 'all',
  }),
});

const { data: campaign } = await res.json();
// campaign.id → use this to poll status
```

### Preview Before Sending

```typescript
const preview = await fetch('/api/v1/unified-admin/notifications/campaigns/preview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: 'Flash Sale Alert',
    subject: '⚡ 5% Extra Cashback',
    content_markdown: 'test',
    target_type: 'filtered',
    target_filters: {
      tier: 'VERIFIED',
      min_balance: 1000,
    },
  }),
});

const { data } = await preview.json();
// data.count → 142
// data.sample → ["john@example.com", "jane@example.com", ...]
```

### Schedule for Later

```typescript
const res = await fetch('/api/v1/unified-admin/notifications/campaigns', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: 'Maintenance Downtime',
    subject: 'Planned Maintenance — March 1st',
    content_markdown: '# Heads up, {{first_name}}!\n\nWe will be offline from **2:00 AM to 4:00 AM WAT** on March 1st for maintenance.\n\nSorry for any inconvenience!',
    target_type: 'all',
    scheduled_for: '2026-03-01T01:00:00.000Z',
  }),
});

const { data: campaign } = await res.json();
// campaign.status → "scheduled"
```

### Poll Campaign Status (for progress bar)

```typescript
async function pollCampaignStatus(campaignId: string) {
  const res = await fetch(
    `/api/v1/unified-admin/notifications/campaigns/${campaignId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const { data: campaign } = await res.json();

  // campaign.status → "sending" | "sent" | "failed"
  // campaign.sent_count → 150 (updates in real-time as every 10 emails)
  // campaign.total_recipients → 234
  // Progress: (campaign.sent_count + campaign.failed_count) / campaign.total_recipients * 100

  return campaign;
}
```

---

## cURL Examples

### Create Campaign (All Users)

```bash
curl -X POST http://localhost:3000/api/v1/unified-admin/notifications/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Welcome Email",
    "subject": "Welcome to SmiPay!",
    "content_markdown": "# Welcome, {{first_name}}!\n\nThank you for joining SmiPay.",
    "target_type": "all"
  }'
```

### Preview Filtered Audience

```bash
curl -X POST http://localhost:3000/api/v1/unified-admin/notifications/campaigns/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "test",
    "subject": "test",
    "content_markdown": "test",
    "target_type": "filtered",
    "target_filters": {
      "role": "user",
      "min_balance": 5000,
      "registered_after": "2026-01-01"
    }
  }'
```

### Cancel Scheduled Campaign

```bash
curl -X POST http://localhost:3000/api/v1/unified-admin/notifications/campaigns/CAMPAIGN_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Resend Failed

```bash
curl -X POST http://localhost:3000/api/v1/unified-admin/notifications/campaigns/CAMPAIGN_ID/resend-failed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Changelog

| Date | Change |
|---|---|
| 2026-02-26 | Initial implementation — campaigns, audience targeting, markdown emails, scheduling, delivery logs |

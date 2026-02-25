# Admin Support — Live Chat & Ticket Management API

## Overview

The admin support system now has **two main sections**:

1. **Conversations (Live Chat)** — Real-time chat queue where admins see incoming user messages, claim conversations, reply, transfer to other agents, and optionally create tickets
2. **Tickets** — Formal issue tracking for complex problems that need structured follow-up

**Key concepts:**
- A **conversation** is the primary entity. Users just send messages and a conversation is created automatically.
- A **ticket** is optional — created by an admin from a conversation when the issue needs formal tracking.
- Only the **assigned agent** can reply to a conversation. Other agents must request a **handover** (transfer).
- Handovers are tracked in the database with full audit trail.

---

## Base Path
`/api/v1/unified-admin/support`

**Auth:** JWT Bearer token (admin role required)

---

# PART 1: CONVERSATIONS (Live Chat)

## 1. List Conversations
**GET** `/api/v1/unified-admin/support/conversations`

Returns paginated conversation list with analytics.

### Query Params

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |
| `search` | string | — | Searches: email, phone, user name, smipay_tag, message content |
| `status` | string | — | Filter: `active`, `waiting_support`, `waiting_user`, `closed` |
| `assigned_to` | string | — | Filter by assigned admin UUID |
| `user_id` | string | — | Filter by user UUID |
| `has_ticket` | string | — | `"true"` = only conversations with tickets, `"false"` = only without |
| `date_from` | string | — | Start date (ISO 8601) |
| `date_to` | string | — | End date |
| `sort_by` | string | `last_message_at` | Sort: `createdAt`, `updatedAt`, `last_message_at`, `status` |
| `sort_order` | string | `desc` | `asc` or `desc` |

### Response
```json
{
  "success": true,
  "message": "Conversations fetched",
  "data": {
    "analytics": {
      "total_conversations": 150,
      "active": 35,
      "unassigned": 12,
      "by_status": {
        "active": 20,
        "waiting_support": 15,
        "waiting_user": 10,
        "closed": 105
      }
    },
    "conversations": [
      {
        "id": "conv-uuid",
        "user_id": "user-uuid",
        "email": "john@example.com",
        "phone_number": "+2348012345678",
        "status": "active",
        "assigned_to": "admin-uuid",
        "assigned_at": "2026-02-25T10:31:00.000Z",
        "satisfaction_rating": null,
        "last_message_at": "2026-02-25T11:00:00.000Z",
        "createdAt": "2026-02-25T10:30:00.000Z",
        "updatedAt": "2026-02-25T11:00:00.000Z",
        "user": {
          "id": "user-uuid",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com",
          "phone_number": "+2348012345678",
          "smipay_tag": "johndoe",
          "profile_image": { "secure_url": "https://..." }
        },
        "ticket": {
          "id": "ticket-uuid",
          "ticket_number": "SMI-2026-001234",
          "subject": "Failed transfer",
          "status": "in_progress",
          "priority": "medium",
          "support_type": "TRANSACTION_ISSUE"
        },
        "message_count": 8,
        "last_message": {
          "message": "I've resolved the transfer issue...",
          "is_from_user": false,
          "sender_name": "Sarah Johnson",
          "createdAt": "2026-02-25T11:00:00.000Z"
        },
        "has_unread": false,
        "assigned_admin": {
          "id": "admin-uuid",
          "first_name": "Sarah",
          "last_name": "Johnson",
          "email": "sarah@smipay.com"
        }
      }
    ],
    "meta": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "total_pages": 8
    }
  }
}
```

### Analytics — UI Suggestions

```
┌───────────────┬───────────────┬───────────────┐
│  Active Chats │  Unassigned   │  Total        │
│     35        │    12 ⚠️      │    150        │
│               │  ← needs attn│               │
└───────────────┴───────────────┴───────────────┘
```

- **Unassigned** conversations are the action queue — highlight in orange/red
- Show preset filters: "Unassigned", "My Chats" (assigned_to = me), "Active", "Closed"
- Sort by `last_message_at` desc by default (most recent activity first)

---

## 2. Get Conversation Detail
**GET** `/api/v1/unified-admin/support/conversations/:id`

Returns full conversation with all messages (including internal notes), user details, ticket info, and handover history.

### Response
```json
{
  "success": true,
  "message": "Conversation fetched",
  "data": {
    "id": "conv-uuid",
    "user_id": "user-uuid",
    "email": "john@example.com",
    "phone_number": "+2348012345678",
    "status": "active",
    "assigned_to": "admin-uuid",
    "assigned_at": "2026-02-25T10:31:00.000Z",
    "device_metadata": { "platform": "ios", "device_model": "iPhone 14 Pro", "app_version": "2.1.0" },
    "ip_address": "105.112.45.67",
    "user_agent": "SmipayApp/2.1.0 iOS",
    "satisfaction_rating": null,
    "feedback": null,
    "last_message_at": "2026-02-25T11:15:00.000Z",
    "createdAt": "2026-02-25T10:30:00.000Z",
    "updatedAt": "2026-02-25T11:15:00.000Z",
    "user": {
      "id": "user-uuid",
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
        "id": "msg-1",
        "message": "Hi, I tried sending money to @janedoe but it keeps failing.",
        "is_internal": false,
        "is_from_user": true,
        "user_id": "user-uuid",
        "sender_name": "John Doe",
        "sender_email": "john@example.com",
        "attachments": null,
        "createdAt": "2026-02-25T10:30:00.000Z"
      },
      {
        "id": "msg-2",
        "message": "Checking transaction logs now.",
        "is_internal": true,
        "is_from_user": false,
        "user_id": "admin-uuid",
        "sender_name": "Sarah Johnson",
        "sender_email": "sarah@smipay.com",
        "attachments": null,
        "createdAt": "2026-02-25T10:35:00.000Z"
      },
      {
        "id": "msg-3",
        "message": "Hi John! I'm Sarah and I'll be helping you today. Let me look into this.",
        "is_internal": false,
        "is_from_user": false,
        "user_id": "admin-uuid",
        "sender_name": "Sarah Johnson",
        "sender_email": "sarah@smipay.com",
        "attachments": null,
        "createdAt": "2026-02-25T10:36:00.000Z"
      }
    ],
    "ticket": null,
    "assigned_admin": {
      "id": "admin-uuid",
      "first_name": "Sarah",
      "last_name": "Johnson",
      "email": "sarah@smipay.com"
    },
    "handovers": [
      {
        "id": "handover-uuid",
        "from_admin_id": "admin-uuid-1",
        "to_admin_id": "admin-uuid-2",
        "from_admin_name": "Mike Admin",
        "to_admin_name": "Sarah Johnson",
        "reason": "Need someone with transaction expertise",
        "status": "accepted",
        "responded_at": "2026-02-25T10:31:00.000Z",
        "createdAt": "2026-02-25T10:30:00.000Z"
      }
    ]
  }
}
```

---

## 3. Claim Conversation
**POST** `/api/v1/unified-admin/support/conversations/:id/claim`

Admin claims an unassigned conversation. This is how a support agent "picks up" a chat.

### Payload
No body required.

### Rules
- Cannot claim if already assigned to another agent (use handover instead)
- Cannot claim a closed conversation

### Response
```json
{
  "success": true,
  "message": "Conversation claimed",
  "data": {
    "conversation_id": "conv-uuid",
    "assigned_to": "admin-uuid",
    "assigned_admin_name": "Sarah Johnson"
  }
}
```

**Real-time:** When claimed, the user instantly sees "Sarah Johnson is now helping you" via Socket.IO.

---

## 4. Reply to Conversation
**POST** `/api/v1/unified-admin/support/conversations/:id/reply`

### Payload
```json
{
  "message": "Hi John! I'm Sarah and I'll be helping you today. Let me look into this.",
  "is_internal": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | Reply content |
| `is_internal` | boolean | No | Default `false`. Set `true` for internal notes only visible to support team. |

### Rules
- **Only the assigned agent can reply.** If another agent tries, they get 403.
- If conversation is unassigned, replying auto-claims it.
- Cannot reply to closed conversations.
- Non-internal replies set conversation status to `waiting_user`.

### Response
```json
{
  "success": true,
  "message": "Reply sent",
  "data": {
    "id": "msg-uuid",
    "message": "Hi John! I'm Sarah and I'll be helping you today.",
    "is_internal": false,
    "is_from_user": false,
    "sender_name": "Sarah Johnson",
    "sender_email": "sarah@smipay.com",
    "createdAt": "2026-02-25T10:36:00.000Z"
  }
}
```

---

## 5. Create Ticket from Conversation
**POST** `/api/v1/unified-admin/support/conversations/:id/create-ticket`

Creates a formal support ticket from an existing conversation. Use this when the issue is complex and needs structured tracking.

### Payload
```json
{
  "subject": "Failed transfer to @janedoe — timeout issue",
  "description": "User reported failed transfer. Investigation shows it was a payment provider timeout during processing.",
  "support_type": "TRANSACTION_ISSUE",
  "priority": "medium",
  "related_transaction_id": "tx-uuid"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | Ticket subject |
| `description` | string | Yes | Ticket description |
| `support_type` | string | No | Default `GENERAL_INQUIRY` |
| `priority` | string | No | Default `medium` |
| `related_transaction_id` | string | No | Link to a transaction |

### Rules
- A conversation can only have ONE ticket. If already exists, returns error.
- All existing conversation messages are automatically linked to the ticket.
- The ticket inherits the conversation's user, email, phone, device metadata.

### Response
```json
{
  "success": true,
  "message": "Ticket created from conversation",
  "data": {
    "ticket": {
      "id": "ticket-uuid",
      "ticket_number": "SMI-2026-001234",
      "subject": "Failed transfer to @janedoe — timeout issue",
      "support_type": "TRANSACTION_ISSUE",
      "priority": "medium",
      "status": "in_progress",
      "conversation_id": "conv-uuid"
    }
  }
}
```

**Real-time:** User sees "A support ticket SMI-2026-001234 has been created for your issue" via Socket.IO.

---

## 6. Close Conversation
**POST** `/api/v1/unified-admin/support/conversations/:id/close`

### Payload
No body required.

### Response
```json
{
  "success": true,
  "message": "Conversation closed",
  "data": { "conversation_id": "conv-uuid" }
}
```

**Real-time:** User's message input is disabled and they see a rating prompt.

---

## 7. Initiate Handover (Transfer to Another Agent)
**POST** `/api/v1/unified-admin/support/conversations/:id/handover`

Only the currently assigned agent can initiate a transfer. The target agent must accept it.

### Payload
```json
{
  "to_admin_id": "target-admin-uuid",
  "reason": "Need someone with transaction expertise for this case"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `to_admin_id` | string | Yes | UUID of the target admin |
| `reason` | string | No | Reason for the transfer |

### Rules
- Only the currently assigned agent can initiate
- Cannot transfer to yourself
- Cannot transfer a closed conversation
- Only one pending handover at a time per conversation

### Response
```json
{
  "success": true,
  "message": "Handover requested",
  "data": {
    "handover_id": "handover-uuid",
    "conversation_id": "conv-uuid",
    "to_admin_id": "target-admin-uuid",
    "to_admin_name": "Sarah Johnson",
    "status": "pending"
  }
}
```

**Real-time:** Target admin receives a `handover_requested` event via Socket.IO.

---

## 8. Respond to Handover
**POST** `/api/v1/unified-admin/support/handovers/:id/respond`

The target admin accepts or rejects the transfer request.

### Payload
```json
{
  "status": "accepted"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | `"accepted"` or `"rejected"` |

### Behavior
- **Accepted:** Conversation assignment transfers to the new admin. User sees the new agent name.
- **Rejected:** Nothing changes. The original admin keeps the conversation.

### Response
```json
{
  "success": true,
  "message": "Handover accepted",
  "data": {
    "handover_id": "handover-uuid",
    "conversation_id": "conv-uuid",
    "status": "accepted"
  }
}
```

---

## Conversation Status Values

| Value | Meaning | Badge Color |
|---|---|---|
| `active` | Conversation is ongoing | Green |
| `waiting_support` | User sent message, waiting for agent reply | Yellow |
| `waiting_user` | Agent responded, waiting for user | Blue |
| `closed` | Conversation ended | Gray |

---

## Handover Status Values

| Value | Meaning |
|---|---|
| `pending` | Transfer requested, waiting for target admin response |
| `accepted` | Target admin accepted the transfer |
| `rejected` | Target admin declined the transfer |

---

# PART 2: TICKETS (Existing — Unchanged)

All existing ticket management endpoints work exactly the same as before. Tickets can now optionally be linked to a conversation via `conversation_id`.

## 9. List Tickets (Analytics + Table)
**GET** `/api/v1/unified-admin/support`

Same as before — returns analytics + paginated ticket list. See previous documentation for full details.

New field in ticket objects: `conversation_id` (string | null) — link to the source conversation.

---

## 10. Get Ticket Detail
**GET** `/api/v1/unified-admin/support/:id`

Same as before. New field: `conversation_id`.

---

## 11. Reply to Ticket
**POST** `/api/v1/unified-admin/support/:id/reply`

Same as before. If the ticket is linked to a conversation, the reply is also broadcast to the conversation room.

---

## 12. Update Ticket Status
**PUT** `/api/v1/unified-admin/support/:id/status`

Same as before.

---

## 13. Assign Ticket
**PUT** `/api/v1/unified-admin/support/:id/assign`

Same as before.

---

## 14. Update Ticket Priority
**PUT** `/api/v1/unified-admin/support/:id/priority`

Same as before.

---

# PART 3: Socket.IO — Real-Time Events (Admin Dashboard)

## Connection

```javascript
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1500";

const socket = io(`${SOCKET_URL}/support`, {
  auth: { token: adminJwtToken },
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on("connect", () => {
  console.log("Connected to support socket");
  if (currentConversationId) {
    socket.emit("join_conversation", { conversation_id: currentConversationId });
  }
});
```

Admin users are automatically joined to the `admins` room on connection.

---

## Events Admin Sends (Emit)

| Event | When | Payload |
|---|---|---|
| `join_conversation` | Open conversation detail | `{ conversation_id }` |
| `leave_conversation` | Leave conversation detail | `{ conversation_id }` |
| `typing` | Admin is typing | `{ conversation_id }` |
| `stop_typing` | Admin stopped typing | `{ conversation_id }` |

---

## Events Admin Receives (Listen)

### `conversation_created`
New conversation started by a user. Received by all admins.

```javascript
socket.on("conversation_created", (data) => {
  // data: { id, user_id, email, status, created_at, first_message }
  // Show toast: "New chat from john@example.com"
  // Refresh conversation list or prepend
});
```

### `conversation_updated`
General updates to conversations. Received by all admins.

```javascript
socket.on("conversation_updated", (data) => {
  // data.event can be:
  //   "new_user_message" — user sent a new message
  //   "claimed"          — conversation was claimed by an admin
  //   "closed"           — conversation was closed
  //   "handover_accepted" / "handover_rejected"

  if (data.event === "new_user_message") {
    // data: { conversation_id, message: { id, preview, sender_name, created_at } }
    highlightConversation(data.conversation_id);
  }

  if (data.event === "claimed") {
    // data: { conversation_id, assigned_to, assigned_admin_name }
    updateConversationRow(data.conversation_id, { assigned_admin_name: data.assigned_admin_name });
  }
});
```

### `new_message`
New message in a conversation you're viewing. Only received when you've joined the conversation room.

```javascript
socket.on("new_message", (data) => {
  // data: { conversation_id, message: { id, message, is_from_user, is_internal, sender_name, createdAt } }
  appendMessageToChat(data.message);
});
```

### `conversation_claimed`
Fires inside the conversation room when someone claims it.

```javascript
socket.on("conversation_claimed", (data) => {
  // data: { conversation_id, assigned_to, assigned_admin_name }
  updateAssignmentBadge(data.assigned_admin_name);
});
```

### `conversation_closed`
Fires inside the conversation room when it's closed.

```javascript
socket.on("conversation_closed", (data) => {
  // data: { conversation_id }
  disableReplyBox();
});
```

### `handover_requested`
Received by the target admin when a handover is initiated for them.

```javascript
socket.on("handover_requested", (data) => {
  // data: { handover_id, conversation_id, from_admin_id, from_admin_name, reason }
  showHandoverModal({
    handoverId: data.handover_id,
    fromAdmin: data.from_admin_name,
    reason: data.reason,
    onAccept: () => acceptHandover(data.handover_id),
    onReject: () => rejectHandover(data.handover_id),
  });
});
```

### `handover_resolved`
Received by the originating admin after the target admin responds.

```javascript
socket.on("handover_resolved", (data) => {
  // data: { handover_id, conversation_id, status: "accepted" | "rejected", to_admin_name }
  if (data.status === "accepted") {
    showToast(`${data.to_admin_name} accepted the transfer`);
  } else {
    showToast(`Transfer was declined`);
  }
});
```

### Legacy events (for ticket operations)

| Event | Description |
|---|---|
| `ticket_created` | New ticket created (from conversation or standalone) |
| `ticket_updated` | Ticket state changed |
| `ticket_assigned` | Ticket assigned to admin |
| `status_changed` | Ticket status changed (inside ticket room) |

---

## Admin Dashboard Integration Guide

### Page: Conversation Queue (Main Support Page)

**Layout suggestion:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Unassigned (12)] [My Chats (5)] [All Active] [Closed]    │
├─────────────────────────┬───────────────────────────────────┤
│  Conversation List      │  Chat Panel (selected conv)       │
│                         │                                   │
│  ● John Doe        2m   │  John: Hi, my transfer failed... │
│    "my transfer fail.." │  You: Let me check that for you  │
│    🔴 Unassigned        │  John: Thanks!                    │
│                         │                                   │
│  ● Jane Smith      15m  │  [Reply box]                      │
│    "can I increase..."  │  [Internal Note toggle]           │
│    ✅ Sarah J.          │                                   │
│                         │  [Claim] [Create Ticket] [Close]  │
│  ● Mike Brown    1h     │  [Transfer to...]                 │
│    "thanks for help"    │                                   │
│    ⚪ Closed             │                                   │
└─────────────────────────┴───────────────────────────────────┘
```

**On page load:**
1. `GET /unified-admin/support/conversations` — fetch conversation list
2. Connect to Socket.IO (already connected on dashboard load)
3. Listen for `conversation_created`, `conversation_updated`

**Opening a conversation:**
1. Click conversation row
2. `GET /unified-admin/support/conversations/:id` — full detail
3. `socket.emit("join_conversation", { conversation_id })`
4. Listen for `new_message`, `typing`, `conversation_claimed`, `conversation_closed`

**Claiming:**
- Show "Claim" button for unassigned conversations
- `POST /conversations/:id/claim`

**Replying:**
- Reply box with "Send" button and "Internal Note" toggle
- `POST /conversations/:id/reply`

**Creating a ticket:**
- "Create Ticket" button opens a form with subject, description, type, priority
- `POST /conversations/:id/create-ticket`
- After creation, show ticket badge in the conversation header

**Closing:**
- "Close" button
- `POST /conversations/:id/close`

**Transferring:**
- "Transfer" button → admin picker modal → optional reason
- `POST /conversations/:id/handover`
- Target admin sees `handover_requested` event

### Page: Tickets (Existing — for formal issue tracking)

Same as before. Use `GET /unified-admin/support` for the ticket list with analytics.

New: tickets may have a `conversation_id` linking back to the source conversation. Show a "View Chat" link if present.

---

## Enum Reference

### Conversation Status
| Value | Description | Badge |
|---|---|---|
| `active` | Ongoing | Green |
| `waiting_support` | Waiting for agent | Yellow |
| `waiting_user` | Waiting for user | Blue |
| `closed` | Ended | Gray |

### Handover Status
| Value | Description |
|---|---|
| `pending` | Awaiting target admin response |
| `accepted` | Transfer accepted |
| `rejected` | Transfer declined |

### Ticket Status (unchanged)
| Value | Description | Badge |
|---|---|---|
| `pending` | Awaiting first response | Yellow |
| `in_progress` | Being worked on | Blue |
| `waiting_user` | Waiting for user | Orange |
| `resolved` | Issue resolved | Green |
| `closed` | Ticket closed | Gray |
| `escalated` | Escalated to management | Red |

### Ticket Priority (unchanged)
| Value | Badge |
|---|---|
| `low` | Gray |
| `medium` | Blue |
| `high` | Orange |
| `urgent` | Red |

### Support Type (unchanged)
| Value | Description |
|---|---|
| `REGISTRATION_ISSUE` | Registration problems |
| `LOGIN_ISSUE` | Login problems |
| `TRANSACTION_ISSUE` | Transaction issues |
| `PAYMENT_ISSUE` | Payment processing |
| `ACCOUNT_ISSUE` | Account access |
| `WALLET_ISSUE` | Wallet issues |
| `CARD_ISSUE` | Virtual card |
| `KYC_VERIFICATION_ISSUE` | KYC problems |
| `SECURITY_ISSUE` | Security concern |
| `FEATURE_REQUEST` | Feature suggestion |
| `BUG_REPORT` | Bug report |
| `BILLING_ISSUE` | Billing dispute |
| `REFUND_REQUEST` | Refund request |
| `GENERAL_INQUIRY` | General question |
| `OTHER` | Other |

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Not connecting to Socket.IO | No real-time updates | Connect on dashboard load: `io('/support', { auth: { token } })` |
| Not emitting `join_conversation` | `conversation_updated` works but `new_message` doesn't | Emit when opening a conversation detail |
| Replying to a conversation assigned to another admin | 403 error | Use handover to transfer first |
| Trying to create ticket for a conversation that already has one | 400 error | Check `ticket` field in conversation detail |
| Not handling `handover_requested` event | Target admin never sees transfer request | Listen for this event and show a modal/notification |

# User Support API & Real-Time Chat

## Overview

This is the **user-facing** support system. Users create tickets, send messages, and receive real-time replies via Socket.IO. The admin-facing counterpart lives at `/unified-admin/support/`.

**Architecture:**

| Layer | Who | Purpose |
|---|---|---|
| REST API (`/api/v1/support/*`) | Users (mobile app) | Create tickets, view tickets, send messages, rate |
| REST API (`/api/v1/unified-admin/support/*`) | Admins (dashboard) | List, reply, assign, change status/priority |
| Socket.IO (`/support` namespace) | Both | Real-time message delivery, typing indicators, status updates |

---

## REST API Endpoints

### Base Path
`/api/v1/support`

---

### 1. Create Support Ticket
**POST** `/api/v1/support/request-support`

**Auth:** Security headers guard (no JWT required — works for unregistered users too)

Creates a new ticket OR adds a message to an existing ticket (if `ticket_number` is provided).

#### Payload
```json
{
  "subject": "I can't complete my transfer",
  "description": "I tried sending money to @janedoe but it keeps showing 'insufficient balance' even though I have ₦50,000 in my wallet.",
  "email": "john@example.com",
  "phone_number": "08012345678",
  "support_type": "TRANSACTION_ISSUE",
  "related_transaction_id": "tx-uuid-here",
  "device_metadata": {
    "device_id": "abc123",
    "device_model": "iPhone 14 Pro",
    "platform": "ios",
    "app_version": "2.1.0"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | Brief summary (5-200 chars) |
| `description` | string | Yes | Detailed description (10-5000 chars) |
| `email` | string | Yes | Contact email |
| `phone_number` | string | No | Nigerian phone number (any format) |
| `support_type` | string | No | Defaults to `GENERAL_INQUIRY`. See enum below |
| `priority` | string | No | Auto-inferred from type if not set. See enum below |
| `related_transaction_id` | string | No | Link to a specific transaction (for transaction issues) |
| `session_id` | string | No | Registration session ID (auto-sets type to `REGISTRATION_ISSUE`) |
| `ticket_number` | string | No | If provided, adds message to existing ticket instead |
| `device_metadata` | object | No | Device info (auto-extracted from headers if not provided) |

#### Response
```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "ticket": {
      "id": "uuid",
      "ticket_number": "SMI-2026-001234",
      "subject": "I can't complete my transfer",
      "description": "I tried sending money...",
      "support_type": "TRANSACTION_ISSUE",
      "status": "pending",
      "priority": "medium",
      "email": "john@example.com",
      "phone_number": "+2348012345678",
      "related_transaction_id": "tx-uuid-here",
      "created_at": "2026-02-24T10:30:00.000Z",
      "updated_at": "2026-02-24T10:30:00.000Z",
      "last_response_at": null,
      "messages": [
        {
          "id": "msg-uuid",
          "message": "I tried sending money...",
          "is_from_user": true,
          "sender_name": "John Doe",
          "sender_email": "john@example.com",
          "attachments": null,
          "created_at": "2026-02-24T10:30:00.000Z"
        }
      ],
      "total_messages": 1
    },
    "message": "Your ticket has been created. Our team will review it and respond as soon as possible."
  }
}
```

---

### 2. Get My Tickets
**GET** `/api/v1/support/my-tickets`

**Auth:** JWT Bearer token (registered users only)

Returns all tickets for the authenticated user, with the last message preview and unread indicator.

#### Response
```json
{
  "success": true,
  "message": "Tickets fetched",
  "data": {
    "tickets": [
      {
        "id": "uuid",
        "ticket_number": "SMI-2026-001234",
        "subject": "I can't complete my transfer",
        "support_type": "TRANSACTION_ISSUE",
        "status": "in_progress",
        "priority": "medium",
        "message_count": 4,
        "last_message": {
          "message": "Hi John, I've looked into this and the issue was a temporary...",
          "is_from_user": false,
          "createdAt": "2026-02-24T11:15:00.000Z"
        },
        "has_unread": true,
        "created_at": "2026-02-24T10:30:00.000Z",
        "updated_at": "2026-02-24T11:15:00.000Z",
        "last_response_at": "2026-02-24T11:15:00.000Z"
      }
    ],
    "total_tickets": 1
  }
}
```

| Field | Type | Description |
|---|---|---|
| `message_count` | number | Total visible messages (excludes internal admin notes) |
| `last_message` | object \| null | Most recent message preview |
| `has_unread` | boolean | `true` if last message is from support (not from user) — use for notification badge |

---

### 3. Get Ticket Conversation
**GET** `/api/v1/support/ticket?ticket_number=SMI-2026-001234`

**Auth:** Security headers guard

Returns the full ticket with all messages in chronological order.

#### Query Params
| Param | Type | Required | Description |
|---|---|---|---|
| `ticket_number` | string | Yes | The ticket number |

#### Response
```json
{
  "success": true,
  "message": "Ticket retrieved",
  "data": {
    "ticket": {
      "id": "uuid",
      "ticket_number": "SMI-2026-001234",
      "subject": "I can't complete my transfer",
      "description": "I tried sending money...",
      "support_type": "TRANSACTION_ISSUE",
      "status": "in_progress",
      "priority": "medium",
      "email": "john@example.com",
      "phone_number": "+2348012345678",
      "related_transaction_id": "tx-uuid",
      "created_at": "2026-02-24T10:30:00.000Z",
      "updated_at": "2026-02-24T11:15:00.000Z",
      "last_response_at": "2026-02-24T11:15:00.000Z",
      "messages": [
        {
          "id": "msg-1",
          "message": "I tried sending money to @janedoe but it keeps showing insufficient balance...",
          "is_from_user": true,
          "sender_name": "John Doe",
          "sender_email": "john@example.com",
          "attachments": null,
          "created_at": "2026-02-24T10:30:00.000Z"
        },
        {
          "id": "msg-2",
          "message": "Hi John, I've looked into this. Your transfer was held due to a daily limit check...",
          "is_from_user": false,
          "sender_name": "Admin Support",
          "sender_email": "support@smipay.com",
          "attachments": null,
          "created_at": "2026-02-24T11:15:00.000Z"
        }
      ],
      "total_messages": 2
    }
  }
}
```

---

### 4. Send Message to Ticket
**POST** `/api/v1/support/ticket/add-message`

**Auth:** Security headers guard

Adds a new message to an existing ticket. User must provide the email that matches the ticket owner.

#### Payload
```json
{
  "ticket_number": "SMI-2026-001234",
  "message": "Thanks for the info. Can you increase my daily limit?",
  "email": "john@example.com"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `ticket_number` | string | Yes | Ticket to message |
| `message` | string | Yes | Message content (10-5000 chars) |
| `email` | string | Yes | Must match ticket owner email |

#### Response
```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "ticket_number": "SMI-2026-001234",
    "ticket_id": "uuid",
    "message": {
      "id": "msg-uuid",
      "message": "Thanks for the info. Can you increase my daily limit?",
      "is_from_user": true,
      "sender_name": "John Doe",
      "sender_email": "john@example.com",
      "attachments": null,
      "createdAt": "2026-02-24T12:00:00.000Z"
    }
  }
}
```

**Important:** After sending, don't wait for the API response to show the message in the UI. Show it optimistically immediately, then confirm with the response. The Socket.IO event will also fire to update other connected clients.

---

### 5. Rate Resolved Ticket
**POST** `/api/v1/support/ticket/:ticketNumber/rate`

**Auth:** JWT Bearer token

Allows the user to submit a satisfaction rating after a ticket is resolved or closed.

#### Payload
```json
{
  "rating": 4,
  "feedback": "Quick response, issue resolved. Would be nice to have a self-service option for limit increases."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `rating` | number | Yes | 1-5 stars |
| `feedback` | string | No | Optional text feedback |

#### Rules
- Can only rate tickets you own
- Can only rate `resolved` or `closed` tickets
- Can only rate once

---

## Socket.IO — Real-Time Chat

### Connection

```
Namespace: /support
URL: wss://your-server.com/support
```

#### Authentication
Pass JWT token on connect:

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://your-api-domain.com/support', {
  auth: {
    token: 'your-jwt-token-here'
  },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected to support chat');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.log('Connection failed:', error.message);
});
```

If the token is invalid or missing, the connection will be rejected immediately.

---

### Client Events (You Emit)

#### `join_ticket`
Call this when user opens a ticket conversation. Required to receive real-time messages for that ticket.

```javascript
socket.emit('join_ticket', { ticket_id: 'uuid-of-ticket' });
```

#### `leave_ticket`
Call this when user navigates away from the conversation.

```javascript
socket.emit('leave_ticket', { ticket_id: 'uuid-of-ticket' });
```

#### `typing`
Emit while user is typing (debounce to every 2-3 seconds).

```javascript
socket.emit('typing', { ticket_id: 'uuid-of-ticket' });
```

#### `stop_typing`
Emit when user stops typing (after 3s idle or on blur).

```javascript
socket.emit('stop_typing', { ticket_id: 'uuid-of-ticket' });
```

---

### Server Events (You Listen To)

#### `new_message`
Fires when a new message is added to a ticket you've joined.

```javascript
socket.on('new_message', (data) => {
  // data.ticket_id: string
  // data.message: {
  //   id: string,
  //   message: string,
  //   is_from_user: boolean,
  //   sender_name: string | null,
  //   sender_email: string | null,
  //   attachments: any | null,
  //   createdAt: string
  // }
  
  // Append to conversation UI
  appendMessage(data.message);
});
```

#### `ticket_updated`
Fires on the user's personal room (even if not inside the ticket). Used for:
- New admin reply notification (badge on ticket list)
- Status change notification

```javascript
socket.on('ticket_updated', (data) => {
  // data.ticket_id: string
  // data.event: 'new_reply' | 'status_changed' | ...
  //
  // For 'new_reply':
  //   data.message.preview: string (first 100 chars)
  //   data.message.sender_name: string
  //   data.message.created_at: string
  //
  // For 'status_changed':
  //   data.old_status: string
  //   data.new_status: string
  //   data.ticket_number: string

  if (data.event === 'new_reply') {
    showNotificationBadge(data.ticket_id);
    showPushNotification(`New reply on your ticket: ${data.message.preview}`);
  }

  if (data.event === 'status_changed') {
    updateTicketStatus(data.ticket_id, data.new_status);
    if (data.new_status === 'resolved') {
      showRatingPrompt(data.ticket_id);
    }
  }
});
```

#### `typing` / `stop_typing`
Shows "Support is typing..." indicator in the conversation.

```javascript
socket.on('typing', (data) => {
  if (data.is_admin) {
    showTypingIndicator(data.ticket_id);
  }
});

socket.on('stop_typing', (data) => {
  hideTypingIndicator(data.ticket_id);
});
```

#### `status_changed`
Fires inside the ticket room when status changes.

```javascript
socket.on('status_changed', (data) => {
  // data.ticket_id: string
  // data.old_status: string
  // data.new_status: string
  // data.ticket_number: string
  // data.resolution_notes?: string
  
  updateConversationHeader(data.new_status);
});
```

---

## Enum Values

### Support Types
Use these in the `support_type` field when creating a ticket:

| Value | When to Use |
|---|---|
| `GENERAL_INQUIRY` | Default — general questions |
| `REGISTRATION_ISSUE` | Can't complete registration |
| `LOGIN_ISSUE` | Can't log in |
| `TRANSACTION_ISSUE` | Problem with a specific transaction |
| `PAYMENT_ISSUE` | Payment didn't go through |
| `ACCOUNT_ISSUE` | Account-related problems |
| `WALLET_ISSUE` | Wallet balance discrepancy, etc. |
| `CARD_ISSUE` | Virtual card problems |
| `KYC_VERIFICATION_ISSUE` | KYC verification problems |
| `SECURITY_ISSUE` | Suspected unauthorized access |
| `BILLING_ISSUE` | Charges or fees dispute |
| `REFUND_REQUEST` | Requesting a refund |
| `FEATURE_REQUEST` | Suggesting a new feature |
| `BUG_REPORT` | Reporting a bug |
| `OTHER` | Anything else |

### Priority (auto-inferred if not set)
| Value | Auto-Assigned For |
|---|---|
| `high` | `SECURITY_ISSUE`, `REFUND_REQUEST`, `REGISTRATION_ISSUE`, `LOGIN_ISSUE` |
| `medium` | `TRANSACTION_ISSUE`, `PAYMENT_ISSUE`, `ACCOUNT_ISSUE`, `WALLET_ISSUE`, `CARD_ISSUE`, `KYC_VERIFICATION_ISSUE`, `BILLING_ISSUE`, `BUG_REPORT` |
| `low` | `FEATURE_REQUEST`, `GENERAL_INQUIRY`, `OTHER` |
| `urgent` | Never auto-assigned — admin-only escalation |

### Ticket Status
| Value | Meaning | User-Visible |
|---|---|---|
| `pending` | Ticket created, waiting for support | "Waiting for support" |
| `in_progress` | Support is working on it | "Being handled" |
| `waiting_user` | Support asked a question, waiting for user | "Waiting for your reply" |
| `escalated` | Escalated to senior team | "Under review" |
| `resolved` | Issue resolved | "Resolved" — show rating prompt |
| `closed` | Ticket closed | "Closed" |

---

## Mobile App Integration Guide

### Screen: Help & Support (Ticket List)

**On load:**
1. Call `GET /support/my-tickets` to get all user tickets
2. Connect to Socket.IO `/support` namespace
3. Listen for `ticket_updated` events to update badges in real-time

**UI Elements:**
- Ticket cards showing: subject, status badge, support_type chip, last message preview, time ago, unread dot
- FAB / button: "New Ticket" → opens create form
- Pull to refresh

### Screen: Create Ticket

**Form fields:**
- Subject (required)
- Description (required)
- Support Type dropdown (default: `GENERAL_INQUIRY`)
- Related Transaction (optional — show picker if coming from transaction detail)

**On submit:**
1. Call `POST /support/request-support`
2. Navigate to the conversation screen for the new ticket

### Screen: Report Transaction Issue (from transaction detail)

**Pre-fill:**
- `support_type: "TRANSACTION_ISSUE"`
- `related_transaction_id: "<the-transaction-id>"`
- Subject: "Issue with transaction [ref]"
- Let user fill in description

### Screen: Conversation (Chat UI)

**On open:**
1. Call `GET /support/ticket?ticket_number=SMI-2026-XXXX` to get full conversation
2. `socket.emit('join_ticket', { ticket_id })` to join the room
3. Listen for `new_message`, `typing`, `stop_typing`, `status_changed`

**On leave:**
1. `socket.emit('leave_ticket', { ticket_id })`

**Sending a message:**
1. Show message optimistically in UI
2. Call `POST /support/ticket/add-message`
3. On success: confirm the optimistic message
4. On error: show retry button

**Receiving a message:**
1. `new_message` event fires → append to chat
2. Scroll to bottom
3. Mark as read

**Typing indicator:**
- `socket.emit('typing', { ticket_id })` on keypress (debounced)
- `socket.emit('stop_typing', { ticket_id })` on 3s idle
- Show "Support is typing..." when receiving `typing` event from admin

**When ticket is resolved:**
- Show satisfaction rating UI (1-5 stars + optional feedback)
- Call `POST /support/ticket/:ticketNumber/rate`

### Screen: Registration Support (pre-auth)

For users stuck during registration who are not yet logged in:

1. Call `POST /support/request-support` with:
   - `session_id` (from registration flow)
   - `support_type: "REGISTRATION_ISSUE"` (or omit — auto-detected from session_id)
   - No JWT needed
2. Show them the ticket number
3. They can check status later via `GET /support/ticket?ticket_number=...`

---

## Socket.IO Connection Lifecycle

```
App Launch
  │
  ├─ User logged in?
  │   ├─ YES → Connect to /support with JWT
  │   │         Listen for ticket_updated (global notifications)
  │   │
  │   └─ NO → Don't connect (use REST only for registration support)
  │
  ├─ User opens ticket list?
  │   └─ Already connected, just fetch via REST
  │
  ├─ User opens conversation?
  │   ├─ emit('join_ticket', { ticket_id })
  │   ├─ Listen: new_message, typing, stop_typing, status_changed
  │   └─ On leave: emit('leave_ticket', { ticket_id })
  │
  └─ User closes app / logs out
      └─ Socket auto-disconnects
```

---

## Error Handling

| Scenario | HTTP Code | Message |
|---|---|---|
| Ticket not found | 404 | "Ticket SMI-2026-XXXX not found" |
| Email doesn't match | 400 | "Email does not match the ticket owner" |
| Message to closed ticket | 400 | "Cannot add messages to a closed or resolved ticket" |
| Rating out of range | 400 | "Rating must be between 1 and 5" |
| Already rated | 400 | "Ticket already rated" |
| Rating wrong status | 400 | "Can only rate resolved or closed tickets" |
| Rate someone else's ticket | 400 | "You can only rate your own tickets" |
| Invalid phone | 400 | "Phone number must be in E.164 format..." |
| Invalid session | 400 | "Invalid session ID" |

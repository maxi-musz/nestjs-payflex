# User Support — Live Chat & Conversations API

## Overview

This is the **user-facing** support system, redesigned as a **live-chat-first** experience. Users can start chatting immediately — no need to create a ticket first. If the issue is complex, the support agent can optionally create a formal ticket from the conversation.

**Key changes from the old ticket-first system:**

| Before | Now |
|---|---|
| User must create a ticket (subject, description, type) before chatting | User just sends a message — conversation created automatically |
| Everything is a ticket | Conversations are the primary entity; tickets are optional |
| User sees a list of tickets | User sees a list of conversations (some may have tickets) |
| No agent identity visible | User sees the name of the support agent handling their chat |
| Anyone can respond | Exclusive ownership — only the assigned agent can reply |

**Architecture:**

| Layer | Who | Purpose |
|---|---|---|
| REST API (`/api/v1/support/*`) | Users (mobile app) | Send messages, view conversations, rate |
| REST API (`/api/v1/unified-admin/support/*`) | Admins (dashboard) | View queue, claim, reply, transfer, create tickets |
| Socket.IO (`/support` namespace) | Both | Real-time message delivery, typing indicators, status updates |

---

## REST API Endpoints

### Base Path
`/api/v1/support`

---

### 1. Send Message (Start or Continue Chat)
**POST** `/api/v1/support/chat/send`

**Auth:** JWT Bearer token (registered users)

This is the **primary endpoint**. It either:
- Creates a **new conversation** (if no `conversation_id` provided) and sends the first message
- Adds a message to an **existing conversation** (if `conversation_id` provided)

#### Payload
```json
{
  "message": "Hi, I tried sending money to @janedoe but it keeps failing. Can you help?",
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
| `message` | string | Yes | The message content (max 5000 chars) |
| `conversation_id` | string | No | If provided, adds message to existing conversation. If omitted, creates new conversation. |
| `device_metadata` | object | No | Device info (auto-extracted from headers if not provided) |

#### Response — New Conversation
```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "conversation": {
      "id": "conv-uuid",
      "status": "active",
      "email": "john@example.com",
      "phone_number": "+2348012345678",
      "assigned_admin_name": null,
      "satisfaction_rating": null,
      "feedback": null,
      "last_message_at": "2026-02-25T10:30:00.000Z",
      "created_at": "2026-02-25T10:30:00.000Z",
      "updated_at": "2026-02-25T10:30:00.000Z",
      "messages": [
        {
          "id": "msg-uuid",
          "message": "Hi, I tried sending money to @janedoe but it keeps failing. Can you help?",
          "is_from_user": true,
          "sender_name": "John Doe",
          "sender_email": "john@example.com",
          "attachments": null,
          "created_at": "2026-02-25T10:30:00.000Z"
        }
      ],
      "total_messages": 1,
      "ticket": null
    },
    "is_new": true
  }
}
```

#### Response — Existing Conversation
```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "conversation_id": "conv-uuid",
    "message": {
      "id": "msg-uuid",
      "message": "Thanks, can you also check my balance?",
      "is_from_user": true,
      "sender_name": "John Doe",
      "sender_email": "john@example.com",
      "attachments": null,
      "createdAt": "2026-02-25T10:35:00.000Z"
    },
    "is_new": false
  }
}
```

**How to use:** When the user opens the chat screen and has no conversations, just show the message input. When they hit send, call this endpoint without `conversation_id`. The response creates the conversation. From then on, pass the `conversation_id` for subsequent messages.

---

### 2. Send Message (Unauthenticated)
**POST** `/api/v1/support/chat/send-unauthenticated`

**Auth:** Security headers guard (no JWT — for pre-registration users)

Same behavior as the authenticated endpoint, but requires `email`.

#### Payload
```json
{
  "message": "I'm stuck on the registration page. It keeps saying my phone number is invalid.",
  "email": "john@example.com",
  "phone_number": "08012345678"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | The message content |
| `email` | string | Yes | Contact email |
| `conversation_id` | string | No | For continuing an existing conversation |
| `phone_number` | string | No | Contact phone |
| `device_metadata` | object | No | Device info |

---

### 3. Get My Conversations
**GET** `/api/v1/support/conversations`

**Auth:** JWT Bearer token

Returns all conversations for the authenticated user, ordered by most recently updated.

#### Response
```json
{
  "success": true,
  "message": "Conversations fetched",
  "data": {
    "conversations": [
      {
        "id": "conv-uuid-1",
        "status": "active",
        "assigned_admin_name": "Sarah Johnson",
        "message_count": 8,
        "last_message": {
          "message": "I've resolved the transfer issue. Your funds should be available now.",
          "is_from_user": false,
          "sender_name": "Sarah Johnson",
          "createdAt": "2026-02-25T11:15:00.000Z"
        },
        "has_unread": true,
        "ticket": {
          "id": "ticket-uuid",
          "ticket_number": "SMI-2026-001234",
          "subject": "Failed transfer to @janedoe",
          "status": "in_progress",
          "priority": "medium",
          "support_type": "TRANSACTION_ISSUE"
        },
        "last_message_at": "2026-02-25T11:15:00.000Z",
        "created_at": "2026-02-25T10:30:00.000Z",
        "updated_at": "2026-02-25T11:15:00.000Z",
        "satisfaction_rating": null
      },
      {
        "id": "conv-uuid-2",
        "status": "closed",
        "assigned_admin_name": "Admin Mike",
        "message_count": 3,
        "last_message": {
          "message": "Glad I could help! Anything else?",
          "is_from_user": false,
          "sender_name": "Admin Mike",
          "createdAt": "2026-02-24T14:00:00.000Z"
        },
        "has_unread": true,
        "ticket": null,
        "last_message_at": "2026-02-24T14:00:00.000Z",
        "created_at": "2026-02-24T13:00:00.000Z",
        "updated_at": "2026-02-24T14:00:00.000Z",
        "satisfaction_rating": 5
      }
    ],
    "total": 2
  }
}
```

| Field | Type | Description |
|---|---|---|
| `status` | string | `active`, `waiting_support`, `waiting_user`, `closed` |
| `assigned_admin_name` | string \| null | Name of the support agent handling this. Show to user (e.g. "Sarah is helping you") |
| `message_count` | number | Total visible messages (excludes internal notes) |
| `last_message` | object \| null | Preview of most recent message |
| `has_unread` | boolean | `true` if the last message is from support — use for notification badge |
| `ticket` | object \| null | If a ticket was created for this conversation, shows ticket details |
| `satisfaction_rating` | number \| null | User rating (1-5) if already rated |

---

### 4. Get Conversation Detail (Full Chat)
**GET** `/api/v1/support/conversations/:id`

**Auth:** JWT Bearer token

Returns the full conversation with all messages.

#### Response
```json
{
  "success": true,
  "message": "Conversation retrieved",
  "data": {
    "conversation": {
      "id": "conv-uuid",
      "status": "active",
      "assigned_admin_name": "Sarah Johnson",
      "email": "john@example.com",
      "phone_number": "+2348012345678",
      "satisfaction_rating": null,
      "feedback": null,
      "last_message_at": "2026-02-25T11:15:00.000Z",
      "created_at": "2026-02-25T10:30:00.000Z",
      "updated_at": "2026-02-25T11:15:00.000Z",
      "messages": [
        {
          "id": "msg-1",
          "message": "Hi, I tried sending money to @janedoe but it keeps failing.",
          "is_from_user": true,
          "sender_name": "John Doe",
          "sender_email": "john@example.com",
          "attachments": null,
          "created_at": "2026-02-25T10:30:00.000Z"
        },
        {
          "id": "msg-2",
          "message": "Hi John! I'm Sarah and I'll be helping you today. Let me look into this.",
          "is_from_user": false,
          "sender_name": "Sarah Johnson",
          "sender_email": "sarah@smipay.com",
          "attachments": null,
          "created_at": "2026-02-25T10:32:00.000Z"
        },
        {
          "id": "msg-3",
          "message": "I've resolved the transfer issue. Your funds should be available now.",
          "is_from_user": false,
          "sender_name": "Sarah Johnson",
          "sender_email": "sarah@smipay.com",
          "attachments": null,
          "created_at": "2026-02-25T11:15:00.000Z"
        }
      ],
      "total_messages": 3,
      "ticket": null
    }
  }
}
```

---

### 5. Rate Conversation
**POST** `/api/v1/support/conversations/:id/rate`

**Auth:** JWT Bearer token

Submit a satisfaction rating after a conversation is closed.

#### Payload
```json
{
  "rating": 5,
  "feedback": "Sarah was amazing! Very quick and helpful."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `rating` | number | Yes | 1-5 stars |
| `feedback` | string | No | Optional text feedback |

#### Rules
- Can only rate conversations you own
- Can only rate `closed` conversations
- Can only rate once

---

## Socket.IO — Real-Time Chat

### Connection

```
Namespace:  /support
Local URL:  http://localhost:1500/support
Prod URL:   https://smipay.com/support
Server:     socket.io v4.8.3
Client:     socket.io-client v4.x (npm install socket.io-client)
```

#### Authentication
```javascript
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1500';

const socket = io(`${SOCKET_URL}/support`, {
  auth: {
    token: userJwtToken,
  },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('connect', () => {
  console.log('Connected to support chat:', socket.id);
  if (currentConversationId) {
    socket.emit('join_conversation', { conversation_id: currentConversationId });
  }
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection failed:', error.message);
});
```

---

### Client Events (You Emit)

#### `join_conversation`
Call when user opens a conversation chat screen. Required to receive real-time messages.

```javascript
socket.emit('join_conversation', { conversation_id: 'conv-uuid' });
```

#### `leave_conversation`
Call when user navigates away from the conversation.

```javascript
socket.emit('leave_conversation', { conversation_id: 'conv-uuid' });
```

#### `typing`
Emit while user is typing (debounce to every 2-3 seconds).

```javascript
socket.emit('typing', { conversation_id: 'conv-uuid' });
```

#### `stop_typing`
Emit when user stops typing (after 3s idle or on blur).

```javascript
socket.emit('stop_typing', { conversation_id: 'conv-uuid' });
```

---

### Server Events (You Listen To)

#### `new_message`
Fires when a new message is added to a conversation you've joined.

```javascript
socket.on('new_message', (data) => {
  // data.conversation_id: string
  // data.message: {
  //   id: string,
  //   message: string,
  //   is_from_user: boolean,
  //   sender_name: string | null,
  //   sender_email: string | null,
  //   attachments: any | null,
  //   createdAt: string
  // }
  appendMessage(data.message);
});
```

#### `conversation_updated`
Fires on the user's personal room for notification badges and status updates.

```javascript
socket.on('conversation_updated', (data) => {
  // data.conversation_id: string
  // data.event: 'new_reply' | 'claimed' | 'closed' | 'ticket_created' | 'handover_completed'

  if (data.event === 'new_reply') {
    // data.message: { id, preview, sender_name, created_at }
    showNotificationBadge(data.conversation_id);
    showPushNotification(`${data.message.sender_name}: ${data.message.preview}`);
  }

  if (data.event === 'claimed') {
    // data.assigned_admin_name: string
    // Show: "Sarah Johnson is now helping you"
    updateAssignedAgent(data.conversation_id, data.assigned_admin_name);
  }

  if (data.event === 'closed') {
    updateConversationStatus(data.conversation_id, 'closed');
    showRatingPrompt(data.conversation_id);
  }

  if (data.event === 'ticket_created') {
    // data.ticket_number: string
    // Show: "A support ticket SMI-2026-XXXX has been created for your issue"
    showTicketCreatedNotice(data.conversation_id, data.ticket_number);
  }

  if (data.event === 'handover_completed') {
    // data.assigned_admin_name: string
    // Show: "Your conversation has been transferred to {name}"
    updateAssignedAgent(data.conversation_id, data.assigned_admin_name);
  }
});
```

#### `conversation_claimed`
Fires inside the conversation room when a support agent claims the conversation.

```javascript
socket.on('conversation_claimed', (data) => {
  // data.conversation_id: string
  // data.assigned_to: string (admin user ID)
  // data.assigned_admin_name: string
  showAgentJoined(data.assigned_admin_name);
});
```

#### `conversation_closed`
Fires inside the conversation room when the conversation is closed.

```javascript
socket.on('conversation_closed', (data) => {
  // data.conversation_id: string
  disableMessageInput();
  showRatingPrompt();
});
```

#### `ticket_created_from_conversation`
Fires when a support agent creates a formal ticket for this conversation.

```javascript
socket.on('ticket_created_from_conversation', (data) => {
  // data.conversation_id: string
  // data.ticket: { id, ticket_number, subject, support_type, priority, status }
  showTicketBadge(data.ticket);
});
```

#### `typing` / `stop_typing`
Shows "Support is typing..." indicator.

```javascript
socket.on('typing', (data) => {
  if (data.is_admin) {
    showTypingIndicator(data.conversation_id);
  }
});

socket.on('stop_typing', (data) => {
  hideTypingIndicator(data.conversation_id);
});
```

---

## Conversation Status Values

| Value | Meaning | User-Visible Text |
|---|---|---|
| `active` | Conversation is ongoing | "Active" |
| `waiting_support` | User sent a message, waiting for support | "Waiting for support" |
| `waiting_user` | Support responded, waiting for user | "Waiting for your reply" |
| `closed` | Conversation ended | "Closed" — show rating prompt |

---

## Mobile App Integration Guide

### Screen: Help & Support (Conversation List)

**On load:**
1. Call `GET /support/conversations` to get all user conversations
2. Connect to Socket.IO `/support` namespace
3. Listen for `conversation_updated` events to update badges in real-time

**UI Elements:**
- Conversation cards showing: assigned agent name (or "Waiting for support..."), last message preview, time ago, unread dot
- If conversation has a ticket, show small ticket badge (e.g. "SMI-2026-001234")
- FAB / button: "Start Chat" → navigates to empty chat screen
- Pull to refresh

**Empty state** (no conversations yet):
- Headphone icon
- "Need help? Start a chat and our team will respond."
- Button: "Start Chat"

### Screen: Chat (Conversation View)

**On open (new chat — no conversation_id):**
1. Show empty chat screen with message input at the bottom
2. When user sends first message → `POST /support/chat/send` (no `conversation_id`)
3. Response returns the new `conversation.id` — store it for subsequent messages
4. `socket.emit('join_conversation', { conversation_id })` to join the room

**On open (existing conversation):**
1. Call `GET /support/conversations/:id` to load full history
2. `socket.emit('join_conversation', { conversation_id })` to join the room
3. Listen for `new_message`, `typing`, `stop_typing`, `conversation_claimed`, `conversation_closed`, `ticket_created_from_conversation`

**On leave:**
1. `socket.emit('leave_conversation', { conversation_id })`

**Sending a message:**
1. Show message optimistically in UI
2. Call `POST /support/chat/send` with `conversation_id`
3. On success: confirm the optimistic message
4. On error: show retry button

**Agent assignment display:**
- When `assigned_admin_name` is null: show "Waiting for a support agent..."
- When assigned: show "Sarah Johnson is helping you" at the top of the chat
- When `conversation_claimed` event fires: animate the agent name appearing

**Ticket badge:**
- If `ticket` is not null in the conversation, show a small badge: "Ticket: SMI-2026-001234"
- This tells the user the issue has been formally tracked

**When conversation is closed — Rating UI:**
- Check `conversation.satisfaction_rating` from the response
- If `satisfaction_rating` is `null` AND status is `closed` → show the rating form (1-5 stars + optional feedback)
- If already rated → show "You rated this X/5" as read-only
- Call `POST /support/conversations/:id/rate` to submit

---

## Socket.IO Connection Lifecycle

```
App Launch
  │
  ├─ User logged in?
  │   ├─ YES → Connect to /support with JWT
  │   │         Listen for conversation_updated (global notifications)
  │   │
  │   └─ NO → Don't connect (use REST only via unauthenticated endpoint)
  │
  ├─ User opens conversation list?
  │   └─ Already connected, just fetch via REST
  │
  ├─ User opens chat (new or existing)?
  │   ├─ emit('join_conversation', { conversation_id })
  │   ├─ Listen: new_message, typing, stop_typing, conversation_claimed, conversation_closed
  │   └─ On leave: emit('leave_conversation', { conversation_id })
  │
  └─ User closes app / logs out
      └─ Socket auto-disconnects
```

---

## CRITICAL: Socket.IO Connection is MANDATORY for Real-Time

Without Socket.IO, users will NOT receive messages in real-time. They will only see new messages when they refresh. Typing indicators, agent claiming notifications, and live message delivery all depend on an active Socket.IO connection.

```
Admin sends reply       Backend saves to DB       User receives in real-time
via REST POST    →     + returns HTTP 201    →    via Socket.IO new_message event
                                                   (only if user is connected!)
```

### Frontend Checklist

- [ ] **Connect to `/support` namespace** with JWT on app launch (when logged in)
- [ ] **Emit `join_conversation`** when opening a chat
- [ ] **Listen for `new_message`** and append to chat UI
- [ ] **Listen for `conversation_updated`** for notification badges
- [ ] **Listen for `conversation_claimed`** to show agent name
- [ ] **Listen for `conversation_closed`** to show rating prompt
- [ ] **Listen for `ticket_created_from_conversation`** to show ticket badge
- [ ] **Listen for `typing`/`stop_typing`** and show indicator
- [ ] **Emit `typing`/`stop_typing`** when user types (debounced)
- [ ] **Emit `leave_conversation`** when navigating away
- [ ] **Handle reconnection** — re-emit `join_conversation` on reconnect

---

## Error Handling

| Scenario | HTTP Code | Message |
|---|---|---|
| Conversation not found | 404 | "Conversation not found" |
| Access denied (not your conversation) | 400 | "Access denied" |
| Conversation closed | 400 | "This conversation has been closed" |
| Email mismatch (unauthenticated) | 400 | "Email does not match the conversation owner" |
| Rating out of range | 400 | "Rating must be between 1 and 5" |
| Already rated | 400 | "Conversation already rated" |
| Rating wrong status | 400 | "Can only rate closed conversations" |
| Rate someone else's conversation | 400 | "You can only rate your own conversations" |

---

## Legacy Ticket Endpoints (Still Available)

The old ticket-based endpoints are still available for backward compatibility:

| Method | Path | Purpose |
|---|---|---|
| POST | `/support/request-support` | Create ticket (unauthenticated) |
| POST | `/support/create-ticket` | Create ticket (authenticated) |
| GET | `/support/my-tickets` | Get user's tickets |
| GET | `/support/ticket?ticket_number=...` | Get ticket by number |
| POST | `/support/ticket/add-message` | Add message to ticket |
| POST | `/support/ticket/:ticketNumber/rate` | Rate ticket |

These are deprecated for new implementations. Use the conversation-based endpoints above instead.

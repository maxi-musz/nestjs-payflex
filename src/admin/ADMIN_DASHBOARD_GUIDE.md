# Admin Dashboard Backend Implementation Guide

Base path: `/api/v1/admin`  
Guard: `AuthGuard('jwt')` + custom `RolesGuard` (admin-only)  
Response format: `ApiResponseDto`

---

## 1. Role Guard Setup

Create `src/common/guards/roles.guard.ts` and `src/common/decorators/roles.decorator.ts`.

### Roles Decorator

```ts
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### Roles Guard

```ts
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
```

### Controller-level usage

```ts
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.admin)
@Controller('admin')
```

---

## 2. Module Structure

```
src/admin/
├── admin.module.ts
├── admin.controller.ts
├── admin.service.ts
└── dto/
    ├── query-users.dto.ts
    ├── query-transactions.dto.ts
    ├── manage-ticket.dto.ts
    └── admin-dashboard.dto.ts
```

---

## 3. Endpoints

### 3A. Dashboard Overview — `GET /unified-admin/dashboard`

Returns quick stats for the admin homepage. **Reads from pre-aggregated `DailyStats` + `SystemStats` tables** (3 lightweight queries, no heavy COUNT/SUM on main tables).

**Response payload:**

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

**How it works (no heavy queries):**

| Source | What it reads |
|---|---|
| `SystemStats` (singleton row) | Running totals: total_users, active, suspended, wallet balance, open/pending/escalated tickets, pending KYC, flagged audits, pending txns, tier distribution, total active cards |
| `DailyStats` (today's row) | Today's counters: new_users, transactions, funded, KYC approved/rejected, cards issued, referrals, markup revenue, security events |
| `DailyStats` (last 7 rows) | Weekly sums: new_users, KYC approved, referrals, markup revenue |

Stats are updated incrementally by `StatsService` hooks called from existing services when events happen (user registration, transaction creation, wallet funding, ticket creation, etc.).

**Recalculate endpoint:** `POST /unified-admin/dashboard/recalculate` — re-syncs stats from actual DB data. Run once after first deploy or if stats drift.

---

### 3B. User Management

#### `GET /admin/users` — List/search users (paginated)

**Query params (DTO: `QueryUsersDto`):**

| Param | Type | Description |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: 20, max: 100 |
| `search` | string? | Search by name, email, phone, smipay_tag |
| `role` | Role? | Filter by role |
| `account_status` | AccountStatus? | Filter active/suspended |
| `tier` | string? | Filter by tier name |
| `kyc_status` | string? | Filter by KYC status (verified/unverified) |
| `date_from` | string? | Registration date range start |
| `date_to` | string? | Registration date range end |
| `sort_by` | string? | `createdAt`, `first_name`, `email` |
| `sort_order` | string? | `asc` / `desc` |

**Prisma where clause builder:**

```ts
const where: any = {};
if (search) {
  where.OR = [
    { first_name: { contains: search, mode: 'insensitive' } },
    { last_name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
    { phone_number: { contains: search } },
    { smipay_tag: { contains: search, mode: 'insensitive' } },
  ];
}
if (role) where.role = role;
if (account_status) where.account_status = account_status;
if (tier) where.tier = { tier: tier };
if (date_from || date_to) {
  where.createdAt = {};
  if (date_from) where.createdAt.gte = new Date(date_from);
  if (date_to) where.createdAt.lte = new Date(date_to);
}
```

**Include in response:**

```ts
include: {
  wallet: { select: { current_balance: true } },
  kyc_verification: { select: { is_verified: true, status: true, bvn_verified: true } },
  tier: { select: { tier: true, name: true } },
  _count: { select: { accounts: true, cards: true } },
}
```

**Response per user:**

```json
{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@email.com",
  "phone_number": "+2348012345678",
  "smipay_tag": "johndoe",
  "role": "user",
  "account_status": "active",
  "wallet_balance": 50000.00,
  "kyc_verified": true,
  "bvn_verified": true,
  "tier": "VERIFIED",
  "accounts_count": 2,
  "cards_count": 1,
  "createdAt": "2026-01-15T10:00:00Z"
}
```

**Pagination response:**

```json
{
  "data": [...],
  "meta": {
    "total": 1250,
    "page": 1,
    "limit": 20,
    "total_pages": 63
  }
}
```

---

#### `GET /admin/users/:userId` — Full user detail

**Include everything:**

```ts
include: {
  wallet: true,
  profile_image: true,
  address: true,
  kyc_verification: true,
  tier: true,
  accounts: true,
  cards: true,
  deviceTokens: true,
  userDevices: true,
  supportTickets: { orderBy: { createdAt: 'desc' }, take: 10 },
  auditLogs: { orderBy: { created_at: 'desc' }, take: 20 },
}
```

---

#### `PUT /admin/users/:userId/status` — Suspend/activate user

**Body:**

```json
{
  "account_status": "suspended",  // or "active"
  "reason": "Fraudulent activity detected"
}
```

**Logic:**

1. Update `user.account_status`
2. Log `AuditAction.USER_SUSPEND` or `AuditAction.USER_ACTIVATE`
3. Return updated user

---

#### `PUT /admin/users/:userId/role` — Change user role

**Body:**

```json
{
  "role": "support"
}
```

**Logic:**

1. Validate role is a valid `Role` enum value
2. Prevent changing own role (admin can't demote themselves)
3. Update `user.role`
4. Audit log the change with `old_values` / `new_values`

---

#### `PUT /admin/users/:userId/tier` — Change user tier

**Body:**

```json
{
  "tier_id": "uuid-of-tier"
}
```

---

### 3C. Transaction Management

#### `GET /admin/transactions` — List all transactions (paginated + filtered)

**Query params (DTO: `QueryTransactionsDto`):**

| Param | Type | Description |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: 20, max: 100 |
| `search` | string? | Search by reference, description, user phone |
| `status` | TransactionStatus? | pending / success / failed / cancelled |
| `transaction_type` | TransactionType? | transfer / deposit / airtime / data / cable / education / betting |
| `credit_debit` | CreditDebit? | credit / debit |
| `payment_channel` | PaymentChannel? | bank_transfer / smipay_tag / paystack / flutterwave |
| `date_from` | string? | Date range start |
| `date_to` | string? | Date range end |
| `min_amount` | number? | Minimum amount filter |
| `max_amount` | number? | Maximum amount filter |
| `user_id` | string? | Filter by specific user |
| `sort_by` | string? | `createdAt`, `amount` |
| `sort_order` | string? | `asc` / `desc` |

**Prisma where clause builder:**

```ts
const where: any = {};
if (search) {
  where.OR = [
    { transaction_reference: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
    { recipient_mobile: { contains: search } },
  ];
}
if (status) where.status = status;
if (transaction_type) where.transaction_type = transaction_type;
if (credit_debit) where.credit_debit = credit_debit;
if (payment_channel) where.payment_channel = payment_channel;
if (user_id) where.user_id = user_id;
if (min_amount || max_amount) {
  where.amount = {};
  if (min_amount) where.amount.gte = min_amount;
  if (max_amount) where.amount.lte = max_amount;
}
if (date_from || date_to) {
  where.createdAt = {};
  if (date_from) where.createdAt.gte = new Date(date_from);
  if (date_to) where.createdAt.lte = new Date(date_to);
}
```

**Include:**

```ts
include: {
  sender_details: true,
  icon: true,
}
```

---

#### `GET /admin/transactions/:id` — Single transaction detail

Same as user-facing but also include related user info:

```ts
// After fetching transaction, also fetch the user
const user = await prisma.user.findUnique({
  where: { id: transaction.user_id },
  select: { id: true, first_name: true, last_name: true, email: true, phone_number: true, smipay_tag: true }
});
```

---

#### `GET /admin/transactions/stats` — Transaction summary stats

**Query params:** `date_from`, `date_to`

**Response:**

```json
{
  "total_count": 5420,
  "total_volume": 125000000.00,
  "by_status": {
    "success": { "count": 5100, "volume": 120000000.00 },
    "pending": { "count": 200, "volume": 3000000.00 },
    "failed": { "count": 120, "volume": 2000000.00 }
  },
  "by_type": {
    "airtime": { "count": 2000, "volume": 5000000.00 },
    "data": { "count": 1500, "volume": 8000000.00 },
    "transfer": { "count": 800, "volume": 90000000.00 },
    "deposit": { "count": 1000, "volume": 20000000.00 },
    "cable": { "count": 100, "volume": 1500000.00 },
    "education": { "count": 20, "volume": 500000.00 }
  }
}
```

**Queries:** Use `groupBy` with `_count` and `_sum`:

```ts
const byStatus = await prisma.transactionHistory.groupBy({
  by: ['status'],
  _count: true,
  _sum: { amount: true },
  where: dateFilter,
});

const byType = await prisma.transactionHistory.groupBy({
  by: ['transaction_type'],
  _count: true,
  _sum: { amount: true },
  where: dateFilter,
});
```

---

### 3D. Support Ticket Management

#### `GET /admin/support/tickets` — List all tickets (paginated + filtered)

**Query params (DTO: `QueryTicketsDto`):**

| Param | Type | Description |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: 20 |
| `search` | string? | Search by ticket_number, email, phone, subject |
| `status` | TicketStatus? | pending / in_progress / waiting_user / resolved / closed / escalated |
| `priority` | TicketPriority? | low / medium / high / urgent |
| `support_type` | SupportType? | REGISTRATION_ISSUE, TRANSACTION_ISSUE, etc. |
| `assigned_to` | string? | Filter by assigned admin user ID |
| `date_from` | string? | Date range start |
| `date_to` | string? | Date range end |

**Include:**

```ts
include: {
  user: { select: { id: true, first_name: true, last_name: true, email: true, phone_number: true } },
  _count: { select: { messages: true } },
}
```

---

#### `GET /admin/support/tickets/:ticketId` — Full ticket with messages

```ts
include: {
  user: { select: { id: true, first_name: true, last_name: true, email: true, phone_number: true, smipay_tag: true } },
  messages: {
    orderBy: { createdAt: 'asc' },
    // Return ALL messages including internal ones (admin can see internal)
  },
}
```

---

#### `POST /admin/support/tickets/:ticketId/reply` — Reply to ticket

**Body:**

```json
{
  "message": "We've resolved your issue...",
  "is_internal": false
}
```

**Logic:**

1. Create `SupportMessage` with `is_from_user: false`, `user_id: adminUserId`, `sender_name: admin name`
2. Update ticket `last_response_at`
3. If first reply, set `first_response_at` and calculate `response_time_seconds`
4. Send email notification to user with the reply
5. Audit log `AuditAction.SUPPORT_MESSAGE_ADD`

---

#### `PUT /admin/support/tickets/:ticketId/status` — Update ticket status

**Body:**

```json
{
  "status": "resolved",
  "resolution_notes": "Wallet credited manually after payment confirmation."
}
```

**Logic:**

1. Update `supportTicket.status`
2. If resolving: set `resolved_at`, `resolved_by`, `resolution_notes`
3. If assigning: set `assigned_to`
4. Audit log `AuditAction.SUPPORT_TICKET_UPDATE`

---

#### `PUT /admin/support/tickets/:ticketId/assign` — Assign ticket

**Body:**

```json
{
  "assigned_to": "admin-user-id"
}
```

---

#### `PUT /admin/support/tickets/:ticketId/priority` — Change priority

**Body:**

```json
{
  "priority": "urgent"
}
```

---

### 3E. Audit Logs (already exists — wire into admin module)

The audit log controller already exists at `src/common/audit-log/audit-log.controller.ts`. Just ensure the admin module imports `AuditLogModule` and the existing endpoints are accessible.

**Existing endpoints (already built):**

| Method | Path | Purpose |
|---|---|---|
| GET | `/audit-logs` | Query with filters + pagination |
| GET | `/audit-logs/stats` | Summary statistics |
| GET | `/audit-logs/flagged` | Flagged entries pending review |
| GET | `/audit-logs/user/:userId` | Logs for specific user |
| GET | `/audit-logs/:id` | Single log entry |
| POST | `/audit-logs/:id/flag` | Flag for compliance review |

No new work needed — just add `RolesGuard` + `@Roles(Role.admin)` to the existing audit log controller.

---

## 4. Admin Module Registration

```ts
// src/admin/admin.module.ts
@Module({
  imports: [PrismaModule, AuditLogModule, EmailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
```

Add to `app.module.ts` imports:

```ts
imports: [
  // ... existing modules
  AdminModule,
]
```

---

## 5. DTOs

### QueryUsersDto

```ts
import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { Role, AccountStatus } from '@prisma/client';

export class QueryUsersDto {
  @IsOptional() @IsNumberString() page?: number;
  @IsOptional() @IsNumberString() limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsEnum(AccountStatus) account_status?: AccountStatus;
  @IsOptional() @IsString() tier?: string;
  @IsOptional() @IsString() kyc_status?: string;
  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;
  @IsOptional() @IsString() sort_by?: string;
  @IsOptional() @IsString() sort_order?: string;
}
```

### QueryTransactionsDto

```ts
import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { TransactionStatus, TransactionType, CreditDebit, PaymentChannel } from '@prisma/client';

export class QueryTransactionsDto {
  @IsOptional() @IsNumberString() page?: number;
  @IsOptional() @IsNumberString() limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TransactionStatus) status?: TransactionStatus;
  @IsOptional() @IsEnum(TransactionType) transaction_type?: TransactionType;
  @IsOptional() @IsEnum(CreditDebit) credit_debit?: CreditDebit;
  @IsOptional() @IsEnum(PaymentChannel) payment_channel?: PaymentChannel;
  @IsOptional() @IsString() user_id?: string;
  @IsOptional() @IsNumberString() min_amount?: number;
  @IsOptional() @IsNumberString() max_amount?: number;
  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;
  @IsOptional() @IsString() sort_by?: string;
  @IsOptional() @IsString() sort_order?: string;
}
```

### ManageTicketDto

```ts
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { TicketStatus, TicketPriority } from '@prisma/client';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus) status: TicketStatus;
  @IsOptional() @IsString() resolution_notes?: string;
}

export class ReplyToTicketDto {
  @IsString() message: string;
  @IsOptional() @IsBoolean() is_internal?: boolean;
}

export class AssignTicketDto {
  @IsString() assigned_to: string;
}

export class UpdateTicketPriorityDto {
  @IsEnum(TicketPriority) priority: TicketPriority;
}
```

---

## 6. Implementation Order

| Step | What | Depends On |
|---|---|---|
| 1 | Create `roles.decorator.ts` + `roles.guard.ts` | — |
| 2 | Create `admin.module.ts`, `admin.controller.ts`, `admin.service.ts` | Step 1 |
| 3 | Create all DTOs in `src/admin/dto/` | — |
| 4 | Implement `GET /admin/dashboard` | Step 2 |
| 5 | Implement `GET /admin/users` + `GET /admin/users/:userId` | Step 2 |
| 6 | Implement `PUT /admin/users/:userId/status` + `/role` + `/tier` | Step 5 |
| 7 | Implement `GET /admin/transactions` + `/:id` + `/stats` | Step 2 |
| 8 | Implement `GET /admin/support/tickets` + `/:ticketId` | Step 2 |
| 9 | Implement `POST /:ticketId/reply` + `PUT /:ticketId/status` + `/assign` + `/priority` | Step 8 |
| 10 | Add `@Roles(Role.admin)` guard to existing audit-log controller | Step 1 |
| 11 | Register `AdminModule` in `app.module.ts` | Step 2 |
| 12 | Run `npx prisma generate` (schema already has roles) | — |

---

## 7. Endpoint Summary

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/dashboard` | Stats overview |
| 2 | GET | `/admin/users` | List/search users |
| 3 | GET | `/admin/users/:userId` | Full user detail |
| 4 | PUT | `/admin/users/:userId/status` | Suspend/activate |
| 5 | PUT | `/admin/users/:userId/role` | Change role |
| 6 | PUT | `/admin/users/:userId/tier` | Change tier |
| 7 | GET | `/admin/transactions` | List/filter transactions |
| 8 | GET | `/admin/transactions/:id` | Transaction detail |
| 9 | GET | `/admin/transactions/stats` | Transaction statistics |
| 10 | GET | `/admin/support/tickets` | List/filter tickets |
| 11 | GET | `/admin/support/tickets/:ticketId` | Ticket detail + messages |
| 12 | POST | `/admin/support/tickets/:ticketId/reply` | Reply to ticket |
| 13 | PUT | `/admin/support/tickets/:ticketId/status` | Update ticket status |
| 14 | PUT | `/admin/support/tickets/:ticketId/assign` | Assign ticket |
| 15 | PUT | `/admin/support/tickets/:ticketId/priority` | Change priority |

All endpoints:
- Guarded with `AuthGuard('jwt')` + `RolesGuard` + `@Roles(Role.admin)`
- Return `ApiResponseDto` format
- Audit-logged via `AuditLogService`

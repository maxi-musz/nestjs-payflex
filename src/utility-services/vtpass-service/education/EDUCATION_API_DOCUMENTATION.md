# Education Service — Frontend API Documentation

> Base URL: `/api/v1/vtpass/education`
> Auth: All endpoints require `Authorization: Bearer <token>`

This service covers **3 education products**:

| Product | serviceID | Has Verify Step | Has Quantity | Credential Type |
|---------|-----------|----------------|-------------|-----------------|
| WAEC Registration PIN | `waec-registration` | No | Yes (default 1) | Token/PIN |
| WAEC Result Checker PIN | `waec` | No | Yes (default 1) | Serial + PIN (card) |
| JAMB PIN (UTME & Direct Entry) | `jamb` | **Yes** (Profile ID) | No | PIN |

---

## 1. Get Variation Codes

Returns the available plans/variations for a given education service. **All education products have fixed prices** — the amount is determined by the variation, not entered by the user.

```
GET /api/v1/vtpass/education/variations?serviceID=waec-registration
```

**Headers:** `Authorization: Bearer <token>`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceID` | query string | **Yes** | `waec-registration`, `waec`, or `jamb` |

### Success Response (200)

**WAEC Registration:**

```json
{
  "success": true,
  "message": "Variation codes retrieved successfully",
  "data": {
    "serviceName": "WAEC Registration PIN",
    "serviceID": "waec-registration",
    "convenienceFee": "N0.00",
    "variations": [
      {
        "variation_code": "waec-registraion",
        "name": "WASSCE for Private Candidates - Second Series (2019)",
        "variation_amount": "14450.00",
        "fixedPrice": "Yes"
      }
    ]
  }
}
```

**WAEC Result Checker:**

```json
{
  "success": true,
  "message": "Variation codes retrieved successfully",
  "data": {
    "serviceName": "WAEC Result Checker PIN",
    "serviceID": "waec",
    "convenienceFee": "N0.00",
    "variations": [
      {
        "variation_code": "waecdirect",
        "name": "WASSCE",
        "variation_amount": "900.00",
        "fixedPrice": "Yes"
      }
    ]
  }
}
```

**JAMB:**

```json
{
  "success": true,
  "message": "Variation codes retrieved successfully",
  "data": {
    "serviceName": "Jamb",
    "serviceID": "jamb",
    "convenienceFee": "0 %",
    "variations": [
      {
        "variation_code": "utme-mock",
        "name": "UTME PIN (with mock)",
        "variation_amount": "7700.00",
        "fixedPrice": "Yes"
      },
      {
        "variation_code": "utme-no-mock",
        "name": "UTME PIN (without mock)",
        "variation_amount": "6200.00",
        "fixedPrice": "Yes"
      }
    ]
  }
}
```

### Frontend Behaviour

| Field | Display | Notes |
|-------|---------|-------|
| `variations[].name` | Plan name / description | Show in a selectable list |
| `variations[].variation_amount` | Price tag | **This is the fixed price. User does NOT enter an amount.** |
| `variations[].variation_code` | — | Send this in the purchase request |
| `variations[].fixedPrice` | — | Always `"Yes"` for education products |

> **Important:** The amount field in the purchase request is optional and will be **ignored** — the backend resolves the correct price from the variation code automatically. Display the `variation_amount` as the price to the user.

### Error Responses

```json
{ "success": false, "message": "serviceID query parameter is required" }
```

```json
{ "success": false, "message": "Invalid serviceID. Must be waec-registration, waec, or jamb" }
```

---

## 2. Verify JAMB Profile (JAMB Only)

**This step is ONLY for JAMB.** It validates the student's Profile ID before purchase.

```
POST /api/v1/vtpass/education/verify-jamb
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `billersCode` | string | **Yes** | JAMB Profile ID (obtained from JAMB Official Website) |
| `type` | string | **Yes** | The `variation_code` from the variations endpoint (e.g., `utme-mock`) |

### Request

```json
{
  "billersCode": "0123456789",
  "type": "utme-mock"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "JAMB profile verified successfully",
  "data": {
    "code": "000",
    "content": {
      "Customer_Name": "Capital James"
    }
  }
}
```

### Frontend Behaviour After Verify

| Field | Display | Notes |
|-------|---------|-------|
| `Customer_Name` | Show prominently — user confirms this is their name | If this doesn't match, user should re-enter |

### Error Responses

```json
{ "success": false, "message": "Could not verify JAMB Profile ID. Please check the Profile ID and try again." }
```

```json
{ "success": false, "message": "billersCode (JAMB Profile ID) is required for JAMB purchases" }
```

> **WAEC Registration and WAEC Result Checker do NOT require a verify step.** Skip directly from selecting a variation to purchase for these two products.

---

## 3. Purchase Education Product

Purchases a PIN/token for any of the three education products.

```
POST /api/v1/vtpass/education/purchase
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceID` | string | **Yes** | `waec-registration`, `waec`, or `jamb` |
| `variation_code` | string | **Yes** | From the variations endpoint |
| `phone` | string | **Yes** | Customer phone number |
| `quantity` | number | No | Number of PINs to buy (1–10, default 1). Applicable to WAEC only. |
| `billersCode` | string | **JAMB only** | JAMB Profile ID (must be verified first) |
| `amount` | number | No | **Ignored** — resolved from variation. Optional for reference. |
| `request_id` | string | No | Idempotency key. Auto-generated if omitted. **Always store this — needed for query.** |
| `use_cashback` | boolean | No | If `true`, the backend deducts what it can from the user's cashback wallet first, then the remainder from the main wallet. Defaults to `false` if not sent |

### Request Examples

**WAEC Registration:**

```json
{
  "serviceID": "waec-registration",
  "variation_code": "waec-registraion",
  "phone": "08012345678"
}
```

**WAEC Result Checker (with quantity):**

```json
{
  "serviceID": "waec",
  "variation_code": "waecdirect",
  "phone": "08012345678",
  "quantity": 2
}
```

**JAMB:**

```json
{
  "serviceID": "jamb",
  "variation_code": "utme-mock",
  "phone": "08012345678",
  "billersCode": "0123456789"
}
```

### Success Response — WAEC Registration (200)

```json
{
  "success": true,
  "message": "Education purchase successful",
  "data": {
    "id": "clx123-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "202602251430abcd1234",
    "amount": 14450,
    "transaction_date": "2026-02-25T14:30:04.000000Z",
    "purchased_code": "Token: 0100070365657400875",
    "tokens": ["0100070365657400875"],
    "wallet_balance": 35550,
    "credentials": {
      "tokens": ["0100070365657400875"],
      "purchased_code": "Token: 0100070365657400875",
      "pin": "0100070365657400875"
    },
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "WAEC Registration PIN",
        "unit_price": 14450,
        "quantity": 1,
        "commission": 150,
        "transactionId": "1582290782154"
      }
    }
  }
}
```

### Success Response — WAEC Result Checker (200)

```json
{
  "success": true,
  "message": "Education purchase successful",
  "data": {
    "id": "clx456-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "202602251445efgh5678",
    "amount": 900,
    "transaction_date": "2026-02-25T14:45:20.000000Z",
    "purchased_code": "Serial No:WRN123456790, pin: 098765432112",
    "cards": [
      { "Serial": "WRN123456790", "Pin": "098765432112" }
    ],
    "wallet_balance": 49100,
    "credentials": {
      "cards": [{ "Serial": "WRN123456790", "Pin": "098765432112" }],
      "purchased_code": "Serial No:WRN123456790, pin: 098765432112",
      "serial": "WRN123456790",
      "pin": "098765432112"
    },
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "WAEC Result Checker PIN",
        "unit_price": 900,
        "quantity": 1,
        "commission": 100,
        "transactionId": "1582290782154"
      }
    }
  }
}
```

### Success Response — JAMB (200)

```json
{
  "success": true,
  "message": "Education purchase successful",
  "data": {
    "id": "clx789-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "202602251500ijkl9012",
    "amount": 7700,
    "transaction_date": "2026-02-25T15:00:21.000000Z",
    "purchased_code": "Pin : 3678251321392432",
    "Pin": "Pin : 3678251321392432",
    "wallet_balance": 42300,
    "credentials": {
      "purchased_code": "Pin : 3678251321392432",
      "pin": "3678251321392432"
    },
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "JAMB PIN VENDING (UTME & Direct Entry)",
        "unit_price": "7700.00",
        "quantity": 1,
        "commission": "100.00",
        "transactionId": "17398810413069178444218360"
      }
    }
  }
}
```

### CRITICAL: How to Display Credentials Per Product

| Product | `credentials` Fields | What to Display |
|---------|---------------------|-----------------|
| **WAEC Registration** | `pin`, `tokens[]`, `purchased_code` | Show `credentials.pin` prominently with a **copy button**. This is the registration token. |
| **WAEC Result Checker** | `serial`, `pin`, `cards[]`, `purchased_code` | Show **Serial Number** (`credentials.serial`) and **PIN** (`credentials.pin`) with copy buttons for each. If `cards[]` has multiple items (quantity > 1), loop and display all. |
| **JAMB** | `pin`, `purchased_code` | Show `credentials.pin` prominently with a **copy button**. This is the JAMB PIN. |

> **Always use the `credentials` object** for displaying PINs/tokens — it contains the cleaned, parsed values. The raw `purchased_code`, `tokens`, `cards`, and `Pin` fields at the top level are the original VTpass format and may contain prefixes like "Token:", "Pin:", "Serial No:".

### Processing Response (200)

```json
{
  "success": true,
  "message": "Transaction is being processed",
  "data": {
    "id": "clx123-uuid",
    "status": "processing",
    "message": "Transaction is being processed. Use the query endpoint with request_id to check status.",
    "wallet_balance": 35550,
    "credentials": {}
  }
}
```

### Error Responses

```json
{ "success": false, "message": "Insufficient wallet balance" }
```

```json
{ "success": false, "message": "Variation code 'xxx' not found for WAEC Registration PIN. Use the variations endpoint to get valid codes." }
```

```json
{ "success": false, "message": "billersCode (JAMB Profile ID) is required for JAMB purchases" }
```

---

## 4. Query Transaction Status

Check the status of a pending or completed transaction.

```
POST /api/v1/vtpass/education/query
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request_id` | string | **Yes** | The transaction reference from the purchase step |

### Request

```json
{
  "request_id": "202602251430abcd1234"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Transaction query successful",
  "data": {
    "code": "000",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "WAEC Registration PIN",
        "unit_price": 14450,
        "quantity": 1,
        "commission": 150,
        "transactionId": "1582290782154"
      }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "202602251430abcd1234",
    "amount": 14450,
    "transaction_date": "2026-02-25T14:30:04.000000Z",
    "purchased_code": "Token: 0100070365657400875",
    "tokens": ["0100070365657400875"]
  }
}
```

> If the transaction was pending and is now delivered, the backend auto-updates the transaction record and extracts credentials. If the transaction failed, the backend auto-refunds the wallet.

---

## 5. Transaction Detail (via History Endpoint)

When fetching a single education transaction from `GET /api/v1/history/:id`, the `meta` object contains type-specific fields:

```json
{
  "success": true,
  "message": "Single transaction retrieved",
  "data": {
    "id": "clx123-uuid",
    "amount": "₦14,450.00",
    "raw_amount": 14450,
    "type": "education",
    "credit_debit": "debit",
    "description": "WAEC Registration PIN - waec-registraion",
    "provider": "waec-registration",
    "status": "success",
    "tx_reference": "202602251430abcd1234",
    "wallet_balance": 35550,
    "meta": {
      "service_id": "waec-registration",
      "variation_code": "waec-registraion",
      "product_name": "WAEC Registration PIN",
      "phone": "08012345678",
      "quantity": 1,
      "profile_id": null,
      "pin": "0100070365657400875",
      "serial": null,
      "tokens": ["0100070365657400875"],
      "cards": null,
      "purchased_code": "Token: 0100070365657400875"
    }
  }
}
```

### Frontend `meta` Field Usage Per Product

| Product | Key `meta` Fields | Display |
|---------|-------------------|---------|
| WAEC Registration | `pin`, `tokens`, `product_name` | PIN with copy button, product name |
| WAEC Result Checker | `serial`, `pin`, `cards`, `product_name`, `quantity` | Serial + PIN with copy buttons. If `cards` has multiple items, list all. |
| JAMB | `pin`, `profile_id`, `product_name` | PIN with copy button, show Profile ID |
| All | `phone`, `variation_code`, `quantity` | Phone, plan name, quantity if > 1 |

---

## 6. Status Handling

| VTpass Code | VTpass Status | Internal Status | Action |
|-------------|--------------|-----------------|--------|
| `000` | `delivered` | `success` | Show credentials, send email |
| `000` | `pending` / `initiated` | `pending` | Poll query endpoint |
| `099` | — | `pending` | Poll query endpoint |
| `016` | — | `failed` | Auto-refund, show error |
| `040` | `reversed` | `failed` | Auto-refund, show "Transaction reversed" |
| `000` | `failed` | `failed` | Auto-refund, show error |
| Timeout / no response | — | `pending` | Treat as pending, poll query endpoint |

### Polling Strategy for Pending Transactions

```
1. Store the requestId immediately after purchase.
2. Wait 15 seconds, then call POST /query with the request_id.
3. If still pending, wait 30 seconds and retry.
4. Continue polling every 30-60 seconds for up to 5 minutes.
5. After 5 minutes with no resolution, show:
   "Your transaction is still processing. Please check back shortly."
6. Allow manual "Refresh Status" button at any time.
```

### What to Show the User

| Status | Message | UI |
|--------|---------|-----|
| Success (WAEC Reg) | "Your WAEC Registration PIN is ready!" | Success screen + **prominent PIN display with copy button** |
| Success (WAEC Result) | "Your WAEC Result Checker is ready!" | Success screen + **Serial + PIN display with copy buttons** |
| Success (JAMB) | "Your JAMB PIN is ready!" | Success screen + **prominent PIN display with copy button** |
| Processing | "Your payment is being processed. Please wait..." | Spinner / loading with auto-refresh |
| Failed | "Transaction failed. Your wallet has been refunded." | Error screen |
| Insufficient balance | "Insufficient wallet balance. Please top up." | Error with link to top-up |

---

## 7. Complete Integration Flows

### Flow A: WAEC Registration / WAEC Result Checker

```
┌──────────────────────────────┐
│  1. GET variations            │  → serviceID=waec-registration or waec
│     ?serviceID=xxx           │  → Display plans with prices
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  2. User selects plan        │  → Show variation name + fixed price
│     (no amount input needed) │  → Optional: user sets quantity (WAEC only)
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  3. User enters phone        │  → Validate phone number
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  4. Confirm & POST purchase  │  → serviceID, variation_code, phone, quantity
│                              │  → Show total = variation_amount × quantity
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  5. Handle response          │  → Success: display credentials from
│                              │    `credentials` object with copy buttons
│                              │  → Processing: poll query endpoint
│                              │  → Failed: show error, wallet refunded
└──────────────────────────────┘
```

### Flow B: JAMB PIN

```
┌──────────────────────────────┐
│  1. GET variations            │  → serviceID=jamb
│     ?serviceID=jamb          │  → Display plans (UTME with/without mock)
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  2. User selects plan        │  → Show variation name + fixed price
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  3. User enters Profile ID   │  → JAMB Profile ID from JAMB website
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  4. POST verify-jamb         │  → billersCode, type (variation_code)
│                              │  → Display Customer_Name for confirmation
│                              │  → If error, prompt to re-enter
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  5. User confirms + enters   │  → Verify name matches the student
│     phone number             │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  6. POST purchase            │  → serviceID, variation_code, phone,
│                              │    billersCode
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  7. Handle response          │  → Success: display PIN from
│                              │    `credentials.pin` with copy button
│                              │  → Processing: poll query endpoint
│                              │  → Failed: show error, wallet refunded
└──────────────────────────────┘
```

---

## 8. Rate Limiting

All endpoints are rate-limited per user and per IP to prevent abuse.

| Variable | Default | Description |
|----------|---------|-------------|
| `EDUCATION_RATE_WINDOW_SECONDS` | `60` | Rate limit window (seconds) |
| `EDUCATION_RATE_MAX_REQUESTS` | `10` | Max requests per user in rate window |
| `EDUCATION_IP_RATE_MAX_REQUESTS` | `30` | Max requests per IP in rate window |

---

## 9. Summary of All Endpoints

| Method | Endpoint | Description | Guards |
|--------|----------|-------------|--------|
| GET | `/variations?serviceID=xxx` | Get plans/prices for a service | JWT + RateLimit |
| POST | `/verify-jamb` | Verify JAMB Profile ID | JWT + RateLimit |
| POST | `/purchase` | Buy education product | JWT + Validation + RateLimit |
| POST | `/query` | Check transaction status | JWT + RateLimit |

---

## 10. Quick Reference: serviceIDs and What They Return

| serviceID | Product | Credential Fields | Notes |
|-----------|---------|-------------------|-------|
| `waec-registration` | WAEC Registration | `tokens[]`, `pin` | Single token returned per purchase |
| `waec` | WAEC Result Checker | `cards[]` with `{Serial, Pin}` | Supports quantity > 1, returns array of cards |
| `jamb` | JAMB PIN | `pin` | Requires Profile ID verification first |

---

## Wallet Balance & Rewards

- Transactions are deducted from the user's wallet (and optionally cashback wallet when `use_cashback: true`)
- The amount is determined by the fixed variation price × quantity — user does NOT enter an amount
- If `use_cashback: true` is sent and the user has a cashback balance, the backend splits the payment: cashback wallet is charged first (up to its balance), the remainder from the main wallet
- If the transaction fails or is reversed, both wallet and cashback (if any was used) are refunded automatically
- On a successful purchase, the user also **earns** cashback (if admin has enabled it for education) — separate from spending cashback
- Always check wallet balance (and optionally show cashback balance) before allowing purchase

### Rewards on Successful Purchase

On a successful education purchase, the backend automatically triggers these reward checks (all fire-and-forget — they never block or affect the purchase response):

| Reward | What happens | Notes |
|--------|-------------|-------|
| **Cashback** | User earns a % of the purchase amount into their **cashback wallet** | Only if admin has enabled cashback for `education`. Percentage and caps are managed via admin cashback config. |
| **Referral** | If the user was referred by someone, the referrer may earn a reward | Only triggers if referral program is active and conditions are met |
| **First Transaction Bonus** | If this is the user's very first successful transaction, they may earn a welcome bonus | Only triggers once per user, ever. Only if admin has enabled the first-tx program. |

These rewards also trigger on **cron requery** — if a pending education transaction is resolved to success by the background job, the same cashback/referral/first-tx checks fire at that point.

**Frontend does NOT need to do anything special for these rewards.** They happen entirely on the backend. However, you may want to:
- Show a toast/notification if the user earned cashback (listen for push notifications)
- Display the user's cashback wallet balance somewhere in the app (use the cashback balance endpoint)

---

## Changelog

- **2026-02-28**: Spend cashback support
  - Purchase request now accepts optional `use_cashback: true`; payment is split between cashback wallet and main wallet when set. Refunds on failure (including query endpoint) return amounts to both wallets.
- **2026-02-28**: Rewards integration
  - Successful education purchases now earn cashback automatically (if admin has enabled it for `education`)
  - Referral reward checks now trigger on successful education purchase
  - First transaction bonus checks now trigger on successful education purchase
  - Rewards also fire when pending transactions are resolved to success via cron requery
- **2026-02-25**: Initial documentation

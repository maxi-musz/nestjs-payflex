# Cable TV Subscription — Frontend API Documentation

> **Version:** 2.0 &nbsp;|&nbsp; **Last Updated:** Feb 25, 2026

## Overview

This API enables users to purchase and renew cable TV subscriptions (DSTV, GOTV, Startimes, Showmax) through the SmiPay platform.

**Base URL:** `/api/v1/vtpass/cable`

**Authentication:** Every request requires a JWT token:

```
Authorization: Bearer <access_token>
```

---

## Table of Contents

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | [Get Service IDs](#1-get-service-ids) | `GET` | List cable providers |
| 2 | [Get Variation Codes](#2-get-variation-codes) | `GET` | Plans / bouquets for a provider |
| 3 | [Verify Smartcard](#3-verify-smartcard) | `POST` | Validate smartcard & get customer info |
| 4 | [Purchase](#4-purchase-cable-subscription) | `POST` | Buy or renew a subscription |
| 5 | [Query Transaction](#5-query-transaction-status) | `POST` | Check status of a pending transaction |

### Provider Quick Reference

| Provider | serviceID | Verify? | subscription_type? | billersCode | Special |
|----------|-----------|---------|---------------------|-------------|---------|
| DSTV | `dstv` | Yes | **Required** (`change` or `renew`) | Smartcard number | — |
| GOTV | `gotv` | Yes | **Required** (`change` or `renew`) | Smartcard number | — |
| Startimes | `startimes` | Yes (optional) | **Do NOT send** | Smartcard or eWallet number | — |
| Showmax | `showmax` | **No** | **Do NOT send** | Phone number (11 digits) | Returns voucher code |

---

## 1. Get Service IDs

Returns available cable TV providers.

```
GET /api/v1/vtpass/cable/service-ids
```

**Headers:** `Authorization: Bearer <token>`

### Success Response (200)

```json
{
  "success": true,
  "message": "Cable service IDs retrieved successfully",
  "data": [
    {
      "name": "DSTV Subscription",
      "serviceID": "dstv",
      "identifier": "tv-subscription"
    },
    {
      "name": "GOTV Subscription",
      "serviceID": "gotv"
    },
    {
      "name": "Startimes Subscription",
      "serviceID": "startimes"
    },
    {
      "name": "ShowMax",
      "serviceID": "showmax"
    }
  ]
}
```

---

## 2. Get Variation Codes

Returns subscription plans (bouquets) for a provider.

```
GET /api/v1/vtpass/cable/variation-codes?serviceID=dstv
```

**Headers:** `Authorization: Bearer <token>`

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `serviceID` | string | Yes | `dstv`, `gotv`, `startimes`, or `showmax` |

### Success Response (200)

```json
{
  "success": true,
  "message": "Variation codes retrieved successfully for dstv",
  "data": {
    "ServiceName": "DSTV Subscription",
    "serviceID": "dstv",
    "convinience_fee": "N0",
    "variations": [
      {
        "variation_code": "dstv-padi",
        "name": "DStv Padi N1,850",
        "variation_amount": "1850.00",
        "fixedPrice": "Yes"
      },
      {
        "variation_code": "dstv-confam",
        "name": "Dstv Confam N4,615",
        "variation_amount": "4615.00",
        "fixedPrice": "Yes"
      },
      {
        "variation_code": "dstv3",
        "name": "DStv Premium N18,400",
        "variation_amount": "18400.00",
        "fixedPrice": "Yes"
      }
    ]
  }
}
```

> **Frontend tip:** Use the `variations` array (not `varations` — VTpass returns both but `variations` is canonical). Display `name` to the user and keep `variation_code` + `variation_amount` for the purchase call.

> **Startimes note:** The variation `"ewallet"` has `variation_amount: "0.00"`. For this variation, the user **must** type in a custom amount. Do not allow submitting without an amount.

---

## 3. Verify Smartcard

Validates a smartcard number and returns customer info (name, current bouquet, renewal amount).

```
POST /api/v1/vtpass/cable/verify
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `billersCode` | string | Yes | Smartcard number |
| `serviceID` | string | Yes | `dstv`, `gotv`, or `startimes` |

> **Showmax is NOT supported.** Calling verify with `serviceID: "showmax"` returns a `400` error. Skip this step for Showmax and go straight to purchase.

### Request

```json
{
  "billersCode": "7012345678",
  "serviceID": "dstv"
}
```

### Success Response (200) — DSTV / GOTV

```json
{
  "success": true,
  "message": "Smartcard verified successfully",
  "data": {
    "code": "000",
    "content": {
      "Customer_Name": "JOHN DOE",
      "Status": "ACTIVE",
      "Due_Date": "2026-04-06T00:00:00",
      "Customer_Number": "8061522780",
      "Customer_Type": "DSTV",
      "Current_Bouquet": "DStv Compact",
      "Renewal_Amount": "7900.00"
    }
  }
}
```

### Success Response (200) — Startimes

```json
{
  "success": true,
  "message": "Smartcard verified successfully",
  "data": {
    "code": "000",
    "content": {
      "Customer_Name": "JANE DOE",
      "Balance": 54.82,
      "Smartcard_Number": "1212121212"
    }
  }
}
```

### Frontend behaviour after verify

| Provider | What to display | What to do next |
|----------|----------------|-----------------|
| DSTV / GOTV | `Customer_Name`, `Current_Bouquet`, `Renewal_Amount`, `Due_Date` | Ask user: **Renew** current bouquet at `Renewal_Amount` **or** **Change** to a different bouquet (show variation list) |
| Startimes | `Customer_Name`, `Balance` | Proceed to purchase with selected variation |

> **Important:** For DSTV/GOTV renewal, always use the `Renewal_Amount` from this response — it may differ from the catalogue price due to promos.

### Error Responses

```json
{ "success": false, "message": "Showmax does not support smartcard verification. Proceed directly to purchase using the customer phone number as billersCode." }
```

```json
{ "success": false, "message": "Failed to verify smartcard" }
```

---

## 4. Purchase Cable Subscription

Purchases a new subscription or renews an existing one.

```
POST /api/v1/vtpass/cable/purchase
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceID` | string | **Yes** | `dstv`, `gotv`, `startimes`, or `showmax` |
| `billersCode` | string | **Yes** | **DSTV/GOTV/Startimes:** Smartcard number. **Showmax:** Phone number (11 digits) |
| `subscription_type` | string | **DSTV/GOTV only** | `"change"` (new/different bouquet) or `"renew"` (same bouquet). **Do NOT send for Startimes/Showmax.** |
| `variation_code` | string | Conditional | Required for `change` (DSTV/GOTV) and **always** required for Startimes/Showmax |
| `amount` | number | Conditional | Required for `renew` (DSTV/GOTV — use `Renewal_Amount` from verify). Optional otherwise (auto-resolved from variation price) |
| `phone` | string | No | Customer phone. Falls back to registered phone number if omitted |
| `quantity` | number | No | Months to subscribe (DSTV/GOTV only, default 1) |
| `request_id` | string | No | Idempotency key. Auto-generated if omitted. **Always store this — you need it for query** |
| `use_cashback` | boolean | No | If `true`, the backend deducts what it can from the user's cashback wallet first, then the remainder from the main wallet. Defaults to `false` if not sent |

---

### 4a. DSTV / GOTV — Bouquet Change

User wants a different bouquet or is a new subscriber.

```json
{
  "serviceID": "dstv",
  "billersCode": "7012345678",
  "subscription_type": "change",
  "variation_code": "dstv-confam",
  "phone": "08012345678"
}
```

### 4b. DSTV / GOTV — Bouquet Renewal

User renews their current bouquet at the price from verify.

```json
{
  "serviceID": "gotv",
  "billersCode": "7012345678",
  "subscription_type": "renew",
  "amount": 3600,
  "phone": "08012345678"
}
```

### 4c. Startimes — Purchase

No `subscription_type`. Always requires `variation_code`.

```json
{
  "serviceID": "startimes",
  "billersCode": "0212345678",
  "variation_code": "nova",
  "phone": "08012345678"
}
```

### 4d. Showmax — Purchase

No `subscription_type`. No verify step. `billersCode` is the **phone number**.

```json
{
  "serviceID": "showmax",
  "billersCode": "08012345678",
  "variation_code": "full_3",
  "phone": "08012345678"
}
```

---

### Purchase Success Response — DSTV / GOTV / Startimes (200)

```json
{
  "success": true,
  "message": "Cable purchase successful",
  "data": {
    "id": "clx123-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "202602251430abcd1234",
    "amount": 4615,
    "transaction_date": "2026-02-25T14:30:02.000000Z",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "DSTV Subscription",
        "unique_element": "7012345678",
        "unit_price": "4615",
        "quantity": 1,
        "transactionId": "17416009779459629327738818"
      }
    }
  }
}
```

### Purchase Success Response — Showmax (200)

```json
{
  "success": true,
  "message": "Cable purchase successful",
  "data": {
    "id": "clx456-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "202602251445efgh5678",
    "amount": 8400,
    "transaction_date": "2026-02-25T14:45:57.000000Z",
    "purchased_code": "SHMVHXQ9L3RXGPU",
    "Voucher": ["SHMVHXQ9L3RXGPU"],
    "voucher_code": "SHMVHXQ9L3RXGPU",
    "voucher_codes": ["SHMVHXQ9L3RXGPU"],
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "ShowMax",
        "unique_element": "08012345678",
        "unit_price": "8400",
        "quantity": 1,
        "transactionId": "17416109379361776858305486"
      }
    }
  }
}
```

> **CRITICAL (Showmax only):** The `voucher_code` field contains the activation code the user needs. **You MUST display this prominently** (e.g. in a success modal with a copy button). Without it, the user cannot activate their Showmax subscription.

### Purchase Processing Response (200 — Pending)

```json
{
  "success": true,
  "message": "Transaction is being processed",
  "data": {
    "id": "clx789-uuid",
    "code": "000",
    "requestId": "202602251500ijkl9012",
    "status": "processing",
    "message": "Transaction is being processed. Use the query endpoint with request_id to check status.",
    "content": {
      "transactions": {
        "status": "pending",
        "transactionId": "17416009779459629327738818"
      }
    }
  }
}
```

> When you receive `"status": "processing"`, store the `requestId` and poll [Query Transaction](#5-query-transaction-status) every 30–60 seconds.

### Purchase Error Responses

| HTTP | message | When |
|------|---------|------|
| 400 | `Insufficient wallet balance` | Not enough funds |
| 400 | `subscription_type must be either change or renew for DSTV/GOTV` | Missing/invalid subscription_type for DSTV/GOTV |
| 400 | `subscription_type is not used for Startimes/Showmax. Omit this field.` | subscription_type sent for Startimes/Showmax |
| 400 | `variation_code is required for subscription_type=change` | DSTV/GOTV change without variation_code |
| 400 | `amount is required for renew subscription_type (use Renewal_Amount from verify)` | DSTV/GOTV renew without amount |
| 400 | `variation_code is required for Startimes/Showmax purchases` | Missing variation_code |
| 400 | `Amount must be greater than zero...` | Startimes eWallet variation without explicit amount |
| 400 | `Invalid serviceID. Must be one of: dstv, gotv, startimes, showmax` | Bad serviceID |
| 429 | `Rate limit exceeded. Please slow down.` | Too many API calls |

---

## 5. Query Transaction Status

Check the final status of a pending transaction. Also auto-updates the transaction record and refunds the wallet if the transaction ultimately failed.

```
POST /api/v1/vtpass/cable/query
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

### Request

```json
{
  "request_id": "202602251500ijkl9012"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request_id` | string | **Yes** | The `requestId` returned from the purchase call |

### Success Response (200) — Delivered

```json
{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "data": {
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "DSTV Subscription",
        "unique_element": "7012345678",
        "unit_price": 4615,
        "quantity": 1,
        "transactionId": "17416009779459629327738818",
        "amount": 4615
      }
    },
    "requestId": "202602251500ijkl9012",
    "amount": 4615,
    "transaction_date": "2026-02-25T15:00:02.000000Z"
  }
}
```

### Success Response (200) — Still Pending

```json
{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "data": {
    "code": "099",
    "response_description": "TRANSACTION IS PROCESSING",
    "content": {
      "transactions": {
        "status": "pending"
      }
    }
  }
}
```

### Success Response (200) — Failed

```json
{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "data": {
    "code": "016",
    "response_description": "TRANSACTION FAILED",
    "content": {
      "transactions": {
        "status": "failed"
      }
    }
  }
}
```

> When the query returns `"status": "failed"`, the backend **automatically** refunds the user's wallet. You do **not** need to call a separate refund endpoint.

### Error Response

```json
{ "success": false, "message": "Transaction not found" }
```

---

## 6. Transaction Status Handling

### Status Decision Table

| `code` | `transactions.status` | Meaning | UI Action |
|--------|-----------------------|---------|-----------|
| `000` | `delivered` | **Success** | Show success screen |
| `000` | `pending` / `initiated` | Processing | Show spinner, poll query endpoint |
| `099` | any | Processing | Show spinner, poll query endpoint |
| `016` | any | **Failed** | Show error, wallet auto-refunded |
| `040` | `reversed` | **Reversed** | Show error, wallet auto-refunded |
| Timeout / no response | — | Unknown | Treat as pending, poll query endpoint |

### Polling Strategy for Pending Transactions

```
1. Store the `requestId` immediately after purchase.
2. Wait 15 seconds, then call POST /query with the request_id.
3. If still pending, wait 30 seconds and retry.
4. Continue polling every 30-60 seconds for up to 5 minutes.
5. After 5 minutes with no resolution, show:
   "Your transaction is still processing. Please check back shortly."
6. Allow manual "Refresh Status" button at any time.
```

### What to show the user

| Status | Message | UI |
|--------|---------|-----|
| Success | "Your {provider} subscription has been activated!" | Success screen with transaction details |
| Success (Showmax) | "Your Showmax subscription is ready! Use voucher code: {code}" | Success screen + prominent voucher display with copy button |
| Processing | "Your subscription is being processed. Please wait..." | Spinner / loading indicator with auto-refresh |
| Failed | "Transaction failed. Your wallet has been refunded." | Error screen |
| Insufficient balance | "Insufficient wallet balance. Please top up." | Error with link to top-up |

---

## 7. Complete Integration Flows

### Flow A: DSTV / GOTV

```
┌─────────────────────┐
│  1. GET service-ids  │  → User picks DSTV or GOTV
└──────────┬──────────┘
           ▼
┌───────────────────────────────────┐
│  2. GET variation-codes?serviceID │  → Show bouquet list
└──────────┬────────────────────────┘
           ▼
┌──────────────────────┐
│  3. POST verify      │  → Show customer name, current bouquet, renewal amount
└──────────┬───────────┘
           ▼
┌──────────────────────────────────────────────────┐
│  4. User chooses: RENEW current or CHANGE bouquet │
└──────────┬───────────────────────────────────────┘
           ▼
┌──────────────────────┐
│  5. POST purchase    │
│                      │
│  RENEW: send         │  ← subscription_type: "renew"
│    amount from       │  ← amount: Renewal_Amount
│    verify response   │
│                      │
│  CHANGE: send        │  ← subscription_type: "change"
│    variation_code    │  ← variation_code from step 2
└──────────┬───────────┘
           ▼
┌──────────────────────────┐
│  6. Handle response      │
│  - delivered → success   │
│  - pending → poll query  │
│  - failed → show error   │
└──────────────────────────┘
```

### Flow B: Startimes

```
┌─────────────────────┐
│  1. GET service-ids  │  → User picks Startimes
└──────────┬──────────┘
           ▼
┌──────────────────────────────────────────┐
│  2. GET variation-codes?serviceID=startimes │  → Show plan list
└──────────┬───────────────────────────────┘
           ▼
┌──────────────────────────────┐
│  3. POST verify (optional)   │  → Confirm smartcard / eWallet
└──────────┬───────────────────┘
           ▼
┌──────────────────────┐
│  4. POST purchase    │  ← variation_code (always required)
│  (NO subscription_   │  ← NO subscription_type field
│   type field!)       │
└──────────┬───────────┘
           ▼
┌──────────────────────────┐
│  5. Handle response      │
└──────────────────────────┘
```

> **Startimes eWallet:** If user selects the `ewallet` variation, you **must** show a text input for the amount (since the variation price is ₦0). Validate that amount > 0 before calling purchase.

### Flow C: Showmax

```
┌─────────────────────┐
│  1. GET service-ids  │  → User picks Showmax
└──────────┬──────────┘
           ▼
┌──────────────────────────────────────────┐
│  2. GET variation-codes?serviceID=showmax │  → Show plan list
└──────────┬───────────────────────────────┘
           ▼
┌──────────────────────┐
│  3. POST purchase    │  ← billersCode = PHONE NUMBER (not smartcard)
│  (NO verify step!)   │  ← variation_code (always required)
│  (NO subscription_   │  ← NO subscription_type field
│   type field!)       │
└──────────┬───────────┘
           ▼
┌──────────────────────────────────────────────┐
│  4. Handle response                          │
│  - On success: display voucher_code to user  │
│    with copy-to-clipboard button             │
└──────────────────────────────────────────────┘
```

---

## 8. Idempotency

- You can optionally provide `request_id` in the purchase payload.
- If omitted, the backend auto-generates one and returns it as `requestId`.
- If you retry with the **same** `request_id`, the backend returns the cached result instead of charging the wallet again.
- **Always store the `requestId`** from the response — you need it for the query endpoint.

**Recommended format:** `YYYYMMDDHHmm` + 8 random alphanumeric characters.

---

## 9. Product Whitelisting

If you receive `"PRODUCT IS NOT WHITELISTED ON YOUR ACCOUNT"`:

1. Log into VTpass profile:
   - Sandbox: https://sandbox.vtpass.com/profile
   - Live: https://www.vtpass.com/profile
2. Go to **Product Settings** tab
3. Enable the products you want to vend (DSTV, GOTV, Startimes, Showmax)
4. Click **Submit**

---

## 11. Error Reference

### Validation Errors (400)

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `serviceID query parameter is required` | Missing serviceID on variation-codes | Add `?serviceID=dstv` to the URL |
| `Invalid serviceID. Must be one of: dstv, gotv, startimes, showmax` | Unrecognized serviceID | Use exact lowercase IDs |
| `subscription_type must be either change or renew for DSTV/GOTV` | DSTV/GOTV purchase without subscription_type | Add `subscription_type: "change"` or `"renew"` |
| `subscription_type is not used for Startimes/Showmax. Omit this field.` | subscription_type sent for Startimes/Showmax | Remove the field entirely |
| `variation_code is required for subscription_type=change` | DSTV/GOTV bouquet change without variation_code | Include the `variation_code` from the plans list |
| `variation_code is required for Startimes/Showmax purchases` | Missing variation_code | Always include for Startimes/Showmax |
| `amount is required for renew subscription_type (use Renewal_Amount from verify)` | DSTV/GOTV renewal without amount | Use `Renewal_Amount` from verify response |
| `Amount must be greater than zero...` | Startimes eWallet variation without explicit amount | Ask user to enter amount |
| `Showmax does not support smartcard verification...` | Called verify with serviceID=showmax | Skip verify for Showmax |
| `Insufficient wallet balance` | User doesn't have enough funds | Prompt to top up wallet |

### Rate Limit Errors (429)

| Error Message | Cause |
|---------------|-------|
| `Rate limit exceeded. Please slow down.` | Too many API calls in short time |

### VTpass Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| `000` + `delivered` | Success | Show success |
| `000` + `pending`/`initiated` | Processing | Poll query endpoint |
| `099` | Processing | Poll query endpoint |
| `016` | Failed | Show error (wallet auto-refunded) |
| `040` | Reversed | Show error (wallet auto-refunded) |
| `015` | Invalid request ID (requery) | The request_id was not found |
| Timeout / No response | Unknown | Treat as pending, poll query |

---

## 12. Sample Integration (React Native / JavaScript)

```javascript
const BASE = '/api/v1/vtpass/cable';
const headers = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// ── Step 1: Get providers ──
const providers = await fetch(`${BASE}/service-ids`, { headers: headers(token) }).then(r => r.json());
// providers.data = [{ serviceID: 'dstv', name: 'DSTV Subscription' }, ...]

// ── Step 2: Get plans ──
const plans = await fetch(`${BASE}/variation-codes?serviceID=dstv`, { headers: headers(token) }).then(r => r.json());
// plans.data.variations = [{ variation_code: 'dstv-padi', name: 'DStv Padi N1,850', variation_amount: '1850.00' }, ...]

// ── Step 3: Verify smartcard (skip for Showmax) ──
const verify = await fetch(`${BASE}/verify`, {
  method: 'POST',
  headers: headers(token),
  body: JSON.stringify({ billersCode: '7012345678', serviceID: 'dstv' }),
}).then(r => r.json());
// verify.data.content = { Customer_Name, Current_Bouquet, Renewal_Amount, Due_Date }

// ── Step 4a: Purchase — DSTV/GOTV Renewal ──
const renewal = await fetch(`${BASE}/purchase`, {
  method: 'POST',
  headers: headers(token),
  body: JSON.stringify({
    serviceID: 'dstv',
    billersCode: '7012345678',
    subscription_type: 'renew',
    amount: Number(verify.data.content.Renewal_Amount),
    phone: '08012345678',
  }),
}).then(r => r.json());

// ── Step 4b: Purchase — DSTV/GOTV Change ──
const change = await fetch(`${BASE}/purchase`, {
  method: 'POST',
  headers: headers(token),
  body: JSON.stringify({
    serviceID: 'dstv',
    billersCode: '7012345678',
    subscription_type: 'change',
    variation_code: 'dstv-confam',
    phone: '08012345678',
  }),
}).then(r => r.json());

// ── Step 4c: Purchase — Startimes (no subscription_type) ──
const startimes = await fetch(`${BASE}/purchase`, {
  method: 'POST',
  headers: headers(token),
  body: JSON.stringify({
    serviceID: 'startimes',
    billersCode: '0212345678',
    variation_code: 'nova',
    phone: '08012345678',
  }),
}).then(r => r.json());

// ── Step 4d: Purchase — Showmax (no verify, no subscription_type) ──
const showmax = await fetch(`${BASE}/purchase`, {
  method: 'POST',
  headers: headers(token),
  body: JSON.stringify({
    serviceID: 'showmax',
    billersCode: '08012345678',  // phone number, NOT smartcard
    variation_code: 'full_3',
    phone: '08012345678',
  }),
}).then(r => r.json());

// ── Step 5: Handle response ──
function handlePurchaseResponse(result) {
  if (!result.success) {
    showError(result.message);
    return;
  }

  const data = result.data;

  // Check if Showmax — display voucher
  if (data.voucher_code) {
    showVoucherModal(data.voucher_code);
    return;
  }

  // Check if pending
  if (data.status === 'processing') {
    startPolling(data.requestId);
    return;
  }

  // Success
  showSuccess(data);
}

// ── Step 6: Poll pending transactions ──
async function startPolling(requestId) {
  showProcessingIndicator();

  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(attempt === 0 ? 15000 : 30000);

    const result = await fetch(`${BASE}/query`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ request_id: requestId }),
    }).then(r => r.json());

    const status = result.data?.content?.transactions?.status;
    const code = result.data?.code;

    if (code === '000' && status === 'delivered') {
      hideProcessingIndicator();
      showSuccess(result.data);
      return;
    }

    if (code === '016' || code === '040' || status === 'failed' || status === 'reversed') {
      hideProcessingIndicator();
      showError('Transaction failed. Your wallet has been refunded.');
      return;
    }

    // Still pending — continue polling
  }

  hideProcessingIndicator();
  showMessage('Transaction is still processing. Please check back shortly or contact support.');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
```

---

## Summary

| Action | Endpoint | DSTV/GOTV | Startimes | Showmax |
|--------|----------|-----------|-----------|---------|
| List providers | `GET /service-ids` | Yes | Yes | Yes |
| List plans | `GET /variation-codes` | Yes | Yes | Yes |
| Verify customer | `POST /verify` | **Required** | Optional | **Not supported** |
| Purchase | `POST /purchase` | `subscription_type` required | No `subscription_type` | No `subscription_type`, billersCode = phone |
| Check pending tx | `POST /query` | Yes | Yes | Yes |
| Voucher in response | — | No | No | **Yes** — display to user |

---

## Wallet Balance & Rewards

- Transactions are deducted from the user's wallet (and optionally cashback wallet when `use_cashback: true`)
- If `use_cashback: true` is sent and the user has a cashback balance, the backend splits the payment: cashback wallet is charged first (up to its balance), the remainder from the main wallet. Example: ₦4,615 cable with ₦500 cashback → ₦500 from cashback + ₦4,115 from wallet
- If the transaction fails or is reversed, both wallet and cashback (if any was used) are refunded automatically
- On a successful purchase, the user also **earns** cashback (if admin has enabled it for cable) — separate from spending cashback
- Always check wallet balance (and optionally show cashback balance) before allowing purchase

### Rewards on Successful Purchase

On a successful cable purchase, the backend automatically triggers these reward checks (all fire-and-forget — they never block or affect the purchase response):

| Reward | What happens | Notes |
|--------|-------------|-------|
| **Cashback** | User earns a % of the purchase amount into their **cashback wallet** | Only if admin has enabled cashback for `cable`. Percentage and caps are managed via admin cashback config. |
| **Referral** | If the user was referred by someone, the referrer may earn a reward | Only triggers if referral program is active and conditions are met |
| **First Transaction Bonus** | If this is the user's very first successful transaction, they may earn a welcome bonus | Only triggers once per user, ever. Only if admin has enabled the first-tx program. |

**Frontend does NOT need to do anything special for these rewards.** They happen entirely on the backend. However, you may want to:
- Show a toast/notification if the user earned cashback (listen for push notifications)
- Display the user's cashback wallet balance somewhere in the app (use the cashback balance endpoint)

---

## Changelog

- **2026-02-28**: Spend cashback support
  - Purchase request now accepts optional `use_cashback: true`; payment is split between cashback wallet and main wallet when set. Refunds on failure return amounts to both wallets.
- **2026-02-28**: Rewards integration
  - Successful cable purchases now earn cashback automatically (if admin has enabled it for `cable`)
  - Referral reward checks now trigger on successful cable purchase
  - First transaction bonus checks now trigger on successful cable purchase
- **2026-02-25**: Initial documentation

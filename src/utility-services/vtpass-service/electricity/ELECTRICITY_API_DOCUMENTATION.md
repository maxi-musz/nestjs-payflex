# Electricity Bill Payment — Frontend API Documentation

> **Version:** 1.0 &nbsp;|&nbsp; **Last Updated:** Feb 25, 2026

## Overview

This API enables users to purchase prepaid electricity tokens and pay postpaid electricity bills for **12 distribution companies (discos)** across Nigeria through the SmiPay platform.

**Base URL:** `/api/v1/vtpass/electricity`

**Authentication:** Every request requires a JWT token:

```
Authorization: Bearer <access_token>
```

---

## Table of Contents

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | [Get Service IDs](#1-get-service-ids) | `GET` | List electricity providers (discos) |
| 2 | [Verify Meter](#2-verify-meter) | `POST` | Validate meter number & get customer info |
| 3 | [Purchase](#3-purchase-electricity) | `POST` | Buy prepaid token or pay postpaid bill |
| 4 | [Query Transaction](#4-query-transaction-status) | `POST` | Check status of a pending transaction |

### Supported Electricity Providers

| # | Provider | serviceID | Coverage |
|---|----------|-----------|----------|
| 1 | IKEDC (Ikeja Electric) | `ikeja-electric` | Lagos: Abule Egba, Akowonjo, Ikeja, Ikorodu, Oshodi, Shomolu |
| 2 | EKEDC (Eko Electric) | `eko-electric` | Lagos: Apapa, Lekki, Ibeju, Island, Agbara, Ojo, Festac, Ijora, Mushin, Orile |
| 3 | KEDCO (Kano Electric) | `kano-electric` | Kano, Katsina, Jigawa |
| 4 | PHED (Port Harcourt Electric) | `portharcourt-electric` | Rivers, Bayelsa, Cross-River, Akwa-Ibom |
| 5 | JED (Jos Electric) | `jos-electric` | Bauchi, Benue, Gombe, Plateau |
| 6 | IBEDC (Ibadan Electric) | `ibadan-electric` | Oyo, Ogun, Osun, Kwara, parts of Niger, Ekiti, Kogi |
| 7 | KAEDCO (Kaduna Electric) | `kaduna-electric` | Kaduna, Kebbi, Sokoto, Zamfara |
| 8 | AEDC (Abuja Electric) | `abuja-electric` | FCT (Abuja), Kogi, Niger, Nassarawa |
| 9 | EEDC (Enugu Electric) | `enugu-electric` | Abia, Anambra, Ebonyi, Enugu, Imo |
| 10 | BEDC (Benin Electric) | `benin-electric` | Delta, Edo, Ekiti, Ondo |
| 11 | ABA (Aba Electric) | `aba-electric` | Abia State |
| 12 | YEDC (Yola Electric) | `yola-electric` | Adamawa, Taraba, Borno, Yobe |

### Meter Types

| Type | `variation_code` | Description | Token returned? |
|------|-----------------|-------------|-----------------|
| Prepaid | `prepaid` | Vends electricity token. **Token MUST be displayed to customer.** | **Yes** |
| Postpaid | `postpaid` | Pays outstanding electricity bill. | No |

---

## 1. Get Service IDs

Returns available electricity distribution companies.

```
GET /api/v1/vtpass/electricity/service-ids
```

**Headers:** `Authorization: Bearer <token>`

### Success Response (200)

```json
{
  "success": true,
  "message": "Electricity service IDs retrieved successfully",
  "data": [
    {
      "name": "Ikeja Electric Payment - IKEDC",
      "serviceID": "ikeja-electric",
      "identifier": "electricity-bill"
    },
    {
      "name": "Eko Electric Payment - EKEDC",
      "serviceID": "eko-electric"
    },
    {
      "name": "KEDCO - Kano Electric",
      "serviceID": "kano-electric"
    }
  ]
}
```

---

## 2. Verify Meter

Validates a meter number and returns customer info (name, address, meter type, arrears, minimum purchase amount).

**Always verify the meter before purchase.** This protects users from paying to wrong meter numbers.

```
POST /api/v1/vtpass/electricity/verify
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `billersCode` | string | **Yes** | Meter number / Account ID |
| `serviceID` | string | **Yes** | One of the 12 disco serviceIDs |
| `type` | string | **Yes** | `"prepaid"` or `"postpaid"` |

### Request

```json
{
  "billersCode": "1111111111111",
  "serviceID": "ikeja-electric",
  "type": "prepaid"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Meter verified successfully",
  "data": {
    "code": "000",
    "content": {
      "Customer_Name": "JOHN DOE",
      "Address": "21 MUYIBAT OYEFUSI STREET IKEJA",
      "Meter_Number": "1111111111111",
      "Customer_Arrears": "",
      "Minimum_Amount": "",
      "Min_Purchase_Amount": "",
      "Can_Vend": "yes",
      "Business_Unit": "",
      "Customer_Account_Type": "NMD",
      "Meter_Type": "PREPAID",
      "WrongBillersCode": false
    }
  }
}
```

### Frontend behaviour after verify

| Field | What to display | Notes |
|-------|----------------|-------|
| `Customer_Name` | Show prominently — user confirms this is their account | |
| `Address` | Show below name | |
| `Meter_Type` | Display as badge (PREPAID / POSTPAID) | Should match the `type` sent |
| `Min_Purchase_Amount` | **CRITICAL: Use as minimum in the amount input field** | **This value is MANDATORY to enforce.** Different discos and service bands have different minimums. If the user enters an amount below this, the purchase WILL fail. See table below. |
| `Service_Band` | Display as info tag (e.g., "Band A") | Determines the minimum purchase amount for the meter. Available for some discos. |
| `Customer_Arrears` | Show if non-empty | Postpaid meters may show outstanding balance |
| `Customer_Account_Type` | Display if present (`NMD` / `MD`) | MD = Maximum Demand (industrial), NMD = household |
| `WrongBillersCode` | **If `true`, show error** | "Invalid meter number. Please check and try again." |

### CRITICAL: Minimum Purchase Amounts

**Different discos enforce different minimum purchase amounts.** The verify response returns `Min_Purchase_Amount` — you **MUST** use this value to set the minimum on the amount input field. If the amount is below the minimum, VTpass will reject the purchase and the user's wallet will be debited then refunded (bad UX).

**Known minimums by disco (these can change — always use the value from verify):**

| Disco | Service Band | Minimum (₦) | Notes |
|-------|-------------|-------------|-------|
| IBEDC (ibadan-electric) | Band A (Prepaid) | 5,000 | |
| IBEDC (ibadan-electric) | Other Bands | 2,000 | |
| IKEDC (ikeja-electric) | All | 1,000 | |
| EKEDC (eko-electric) | All | 1,000 | |
| KEDCO (kano-electric) | All | 1,000 | |
| PHED (portharcourt-electric) | All | 1,000 | |
| JED (jos-electric) | All | 500 | |
| KAEDCO (kaduna-electric) | All | 1,000 | |
| AEDC (abuja-electric) | All | 1,000 | |
| EEDC (enugu-electric) | All | 1,000 | |
| BEDC (benin-electric) | All | 1,000 | |
| ABA (aba-electric) | All | 500 | |
| YEDC (yola-electric) | All | 500 | |

> **Implementation rule:** After a successful verify, read `Min_Purchase_Amount` from the response content. If it is non-empty and numeric, use it as the `min` attribute on the amount input. If it is empty or zero, fall back to ₦500 as a safe default. **Never allow the user to proceed to purchase with an amount below `Min_Purchase_Amount`.**

### Frontend Implementation for Minimum Amount

```javascript
// After verify response:
const minAmount = Number(verifyResponse.data.content.Min_Purchase_Amount) || 500;

// Set the amount input minimum
amountInput.min = minAmount;
amountInput.placeholder = `Minimum ₦${minAmount.toLocaleString()}`;

// Validate before purchase
if (enteredAmount < minAmount) {
  showError(`Minimum purchase amount for this meter is ₦${minAmount.toLocaleString()}`);
  return;
}
```

### Error Responses

```json
{ "success": false, "message": "Invalid meter number. Please check and try again." }
```

```json
{ "success": false, "message": "Failed to verify meter number" }
```

---

## 3. Purchase Electricity

Purchases a prepaid token or pays a postpaid bill.

```
POST /api/v1/vtpass/electricity/purchase
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceID` | string | **Yes** | One of the 12 disco serviceIDs (e.g., `ikeja-electric`) |
| `billersCode` | string | **Yes** | Meter number / Account ID (from verify step) |
| `variation_code` | string | **Yes** | `"prepaid"` or `"postpaid"` |
| `amount` | number | **Yes** | Amount in Naira |
| `phone` | string | **Yes** | Customer phone number |
| `request_id` | string | No | Idempotency key. Auto-generated if omitted. **Always store this — you need it for query.** |

> **WARNING:** The `amount` field MUST be >= the `Min_Purchase_Amount` returned from the verify step for this meter. If you send a lower amount, VTpass will reject it. The backend will refund the wallet, but this creates a poor user experience. **Always validate on the frontend first.**

### Request Example

```json
{
  "serviceID": "ikeja-electric",
  "billersCode": "1111111111111",
  "variation_code": "prepaid",
  "amount": 5000,
  "phone": "08012345678"
}
```

### Success Response — Prepaid (200)

```json
{
  "success": true,
  "message": "Electricity purchase successful",
  "data": {
    "id": "clx123-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "202602251430abcd1234",
    "amount": 5000,
    "transaction_date": "2026-02-25T14:30:04.000000Z",
    "purchased_code": "Token : 26362054405982757802",
    "electricity_token": "26362054405982757802",
    "token": "Token : 26362054405982757802",
    "units": "79.9 kWh",
    "customerName": "JOHN DOE",
    "customerAddress": "21 MUYIBAT OYEFUSI STREET IKEJA",
    "wallet_balance": 45000,
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "Ikeja Electric Payment - IKEDC",
        "unique_element": "1111111111111",
        "unit_price": "5000",
        "quantity": 1,
        "commission": 75,
        "transactionId": "17416102247366731230557150"
      }
    }
  }
}
```

> **CRITICAL (Prepaid):** The `electricity_token` field contains the cleaned token value. Display this prominently with a **copy button**. The user needs this token to load on their meter. Also send via email/SMS.

### Success Response — Postpaid (200)

```json
{
  "success": true,
  "message": "Electricity purchase successful",
  "data": {
    "id": "clx456-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "202602251445efgh5678",
    "amount": 5000,
    "transaction_date": "2026-02-25T14:45:35.000000Z",
    "purchased_code": "",
    "customerName": "JANE DOE",
    "customerAddress": "6 ABIODUN ODESEYE SHOMOLU",
    "wallet_balance": 45000,
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "Ikeja Electric Payment - IKEDC",
        "transactionId": "17416078554133602707537164"
      }
    }
  }
}
```

> **Postpaid:** No token is returned. The bill is paid directly. Show a success screen with the transaction reference.

### Processing Response (200 — Pending)

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
    "wallet_balance": 45000
  }
}
```

### Error Responses

| HTTP | Message | When |
|------|---------|------|
| 400 | `Insufficient wallet balance` | Not enough funds |
| 400 | `Invalid serviceID. Must be one of: ...` | Bad serviceID |
| 400 | `variation_code must be either prepaid or postpaid` | Invalid meter type |
| 400 | `amount must be greater than zero` | Zero or negative amount |
| 400 | `Amount must be between ₦500 and ₦500000` | Outside allowed range |
| 403 | `Daily electricity purchase count limit reached` | Exceeded daily tx count |
| 403 | `Daily electricity purchase amount limit exceeded` | Exceeded daily amount cap |
| 429 | `Rate limit exceeded. Please slow down.` | Too many API calls |

---

## 4. Query Transaction Status

Check the final status of a pending transaction. Auto-updates the transaction record and refunds the wallet if the transaction ultimately failed.

```
POST /api/v1/vtpass/electricity/query
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

### Success Response (200) — Delivered (Prepaid)

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
        "product_name": "Ikeja Electric Payment - IKEDC",
        "unique_element": "1111111111111",
        "unit_price": 5000,
        "quantity": 1,
        "transactionId": "17416102247366731230557150"
      }
    },
    "requestId": "202602251500ijkl9012",
    "amount": 5000,
    "purchased_code": "Token : 26362054405982757802",
    "electricity_token": "26362054405982757802",
    "units": "79.9 kWh"
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

> When the query returns `"status": "failed"`, the backend **automatically** refunds the user's wallet.

---

## 5. Transaction Status Handling

### Status Decision Table

| `code` | `transactions.status` | Meaning | UI Action |
|--------|-----------------------|---------|-----------|
| `000` | `delivered` | **Success** | Show success screen + token (if prepaid) |
| `000` | `pending` / `initiated` | Processing | Show spinner, poll query endpoint |
| `099` | any | Processing | Show spinner, poll query endpoint |
| `016` | any | **Failed** | Show error, wallet auto-refunded |
| `040` | `reversed` | **Reversed** | Show error, wallet auto-refunded |
| Timeout / no response | — | Unknown | Treat as pending, poll query endpoint |

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

### What to show the user

| Status | Message | UI |
|--------|---------|-----|
| Success (Prepaid) | "Your electricity token is ready!" | Success screen + **prominent token display with copy button** + units (kWh) |
| Success (Postpaid) | "Your electricity bill has been paid!" | Success screen with transaction details |
| Processing | "Your payment is being processed. Please wait..." | Spinner / loading indicator with auto-refresh |
| Failed | "Transaction failed. Your wallet has been refunded." | Error screen |
| Insufficient balance | "Insufficient wallet balance. Please top up." | Error with link to top-up |

---

## 6. Complete Integration Flow

```
┌──────────────────────────────┐
│  1. GET service-ids          │  → User selects their disco
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  2. User selects meter type  │  → PREPAID or POSTPAID
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  3. POST verify              │  → Show customer name, address, meter info
│     (billersCode, serviceID, │  → User confirms this is their account
│      type)                   │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  4. User enters amount       │  → Respect Min_Purchase_Amount from verify
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│  5. POST purchase            │  → serviceID, billersCode, variation_code,
│                              │    amount, phone
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────────────────────────┐
│  6. Handle response                              │
│  - delivered + prepaid → show TOKEN prominently  │
│  - delivered + postpaid → show success           │
│  - pending → poll query endpoint                 │
│  - failed → show error (wallet auto-refunded)    │
└──────────────────────────────────────────────────┘
```

---

## 7. Idempotency

- You can optionally provide `request_id` in the purchase payload.
- If omitted, the backend auto-generates one and returns it as `requestId`.
- If you retry with the **same** `request_id`, the backend returns the cached result instead of charging the wallet again.
- **Always store the `requestId`** from the response — you need it for the query endpoint.

**Recommended format:** `YYYYMMDDHHmm` + 8 random alphanumeric characters.

---

## 8. Daily Limits

| Limit | Default | Env Variable |
|-------|---------|-------------|
| Min amount per transaction | ₦500 | `ELECTRICITY_MIN_AMOUNT` |
| Max amount per transaction | ₦500,000 | `ELECTRICITY_MAX_AMOUNT` |
| Max transactions per day | 20 | `ELECTRICITY_DAILY_COUNT_LIMIT` |
| Max amount per day | ₦1,000,000 | `ELECTRICITY_DAILY_AMOUNT_LIMIT` |

Exceeding limits returns `403 Forbidden`.

---

## 9. Product Whitelisting

If you receive `"PRODUCT IS NOT WHITELISTED ON YOUR ACCOUNT"`:

1. Log into VTpass profile:
   - Sandbox: https://sandbox.vtpass.com/profile
   - Live: https://www.vtpass.com/profile
2. Go to **Product Settings** tab
3. Enable the electricity discos you want to vend
4. Click **Submit**

---

## 10. Error Reference

### Validation Errors (400)

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `Invalid serviceID. Must be one of: ...` | Unrecognized serviceID | Use exact IDs from [Provider table](#supported-electricity-providers) |
| `variation_code must be either prepaid or postpaid` | Invalid meter type | Send `"prepaid"` or `"postpaid"` |
| `amount must be greater than zero` | Zero/negative amount | Validate amount before sending |
| `Amount must be between ₦500 and ₦500000` | Outside allowed range | Respect min/max limits |
| `Invalid meter number. Please check and try again.` | WrongBillersCode from VTpass | User entered wrong meter number |
| `Insufficient wallet balance` | Not enough funds | Prompt to top up wallet |

### Rate / Limit Errors (403 / 429)

| Error Message | Cause |
|---------------|-------|
| `Daily electricity purchase count limit reached` | Exceeded daily transaction count |
| `Daily electricity purchase amount limit exceeded` | Exceeded daily amount cap |
| `Rate limit exceeded. Please slow down.` | Too many API calls in short time |

### VTpass Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| `000` + `delivered` | Success | Show success + token (prepaid) |
| `000` + `pending`/`initiated` | Processing | Poll query endpoint |
| `099` | Processing | Poll query endpoint |
| `016` | Failed | Show error (wallet auto-refunded) |
| `040` | Reversed | Show error (wallet auto-refunded) |
| `015` | Invalid request ID (requery) | The request_id was not found |
| Timeout / No response | Unknown | Treat as pending, poll query |

---

## 11. Token Handling (Prepaid Only)

### How the token is returned

Different discos return the token in slightly different response fields. The backend normalizes this into a consistent `electricity_token` field:

| Response Field | Example Value | Disco |
|---------------|---------------|-------|
| `electricity_token` | `26362054405982757802` | **All** (normalized by backend) |
| `purchased_code` | `Token : 26362054405982757802` | Most discos (raw format) |
| `token` / `Token` | `26362054405982757802` | IKEDC, PHED, KAEDCO, EEDC, BEDC |
| `mainToken` | `11786621902768210244` | EKEDC |

### Frontend must:

1. **Always use `electricity_token`** field (cleaned, no prefix)
2. Display the token in a **large, prominent font** with a **copy-to-clipboard** button
3. Show units purchased (`units` field, e.g., `"79.9 kWh"`) when available
4. Include token in the success notification (push + email is handled by backend)

---

## 12. Sample Integration (React Native / JavaScript)

```javascript
const BASE = '/api/v1/vtpass/electricity';
const headers = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// ── Step 1: Get providers ──
const providers = await fetch(`${BASE}/service-ids`, { headers: headers(token) }).then(r => r.json());
// providers.data = [{ serviceID: 'ikeja-electric', name: 'Ikeja Electric Payment - IKEDC' }, ...]

// ── Step 2: Verify meter ──
const verify = await fetch(`${BASE}/verify`, {
  method: 'POST',
  headers: headers(token),
  body: JSON.stringify({
    billersCode: '1111111111111',
    serviceID: 'ikeja-electric',
    type: 'prepaid',
  }),
}).then(r => r.json());

// verify.data.content = { Customer_Name, Address, Meter_Type, Min_Purchase_Amount, ... }

// Check for invalid meter
if (verify.data?.content?.WrongBillersCode) {
  showError('Invalid meter number');
  return;
}

// Show customer info for confirmation
showCustomerInfo({
  name: verify.data.content.Customer_Name,
  address: verify.data.content.Address,
  meterType: verify.data.content.Meter_Type,
});

// ── Step 3: Purchase ──
const purchase = await fetch(`${BASE}/purchase`, {
  method: 'POST',
  headers: headers(token),
  body: JSON.stringify({
    serviceID: 'ikeja-electric',
    billersCode: '1111111111111',
    variation_code: 'prepaid',
    amount: 5000,
    phone: '08012345678',
  }),
}).then(r => r.json());

// ── Step 4: Handle response ──
function handlePurchaseResponse(result) {
  if (!result.success) {
    showError(result.message);
    return;
  }

  const data = result.data;

  // Check if pending
  if (data.status === 'processing') {
    startPolling(data.requestId);
    return;
  }

  // Success — check for token (prepaid)
  if (data.electricity_token) {
    showTokenModal({
      token: data.electricity_token,
      units: data.units,
      customerName: data.customerName,
      amount: data.amount,
    });
    return;
  }

  // Success — postpaid (no token)
  showSuccess(data);
}

// ── Step 5: Poll pending transactions ──
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
      // Check for token in query response too
      if (result.data?.electricity_token) {
        showTokenModal({
          token: result.data.electricity_token,
          units: result.data.units,
          amount: result.data.amount,
        });
      } else {
        showSuccess(result.data);
      }
      return;
    }

    if (code === '016' || code === '040' || status === 'failed' || status === 'reversed') {
      hideProcessingIndicator();
      showError('Transaction failed. Your wallet has been refunded.');
      return;
    }
  }

  hideProcessingIndicator();
  showMessage('Transaction is still processing. Please check back shortly or contact support.');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
```

---

## Summary

| Action | Endpoint | Method | Notes |
|--------|----------|--------|-------|
| List providers | `/service-ids` | `GET` | Returns all 12 discos |
| Verify meter | `/verify` | `POST` | **Required** before purchase. Sends `type` field. |
| Purchase | `/purchase` | `POST` | `variation_code` = `prepaid` or `postpaid`. Returns token for prepaid. |
| Check pending tx | `/query` | `POST` | Auto-refunds on failure. Returns token if available. |

| Meter Type | Token returned? | Key frontend action |
|-----------|-----------------|---------------------|
| Prepaid | **Yes** (`electricity_token`) | Display token prominently with copy button |
| Postpaid | No | Show payment confirmation |

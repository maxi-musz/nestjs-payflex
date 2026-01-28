# Cable TV Subscription API Documentation

## Overview
This API enables users to purchase and renew cable TV subscriptions (DSTV, GOTV, Startimes, Showmax) through the SmiPay platform. All endpoints require JWT authentication.

**Base URL:** `/api/v1/vtpass/cable`

**Authentication:** Include JWT token in the `Authorization` header:
```
Authorization: Bearer {your_jwt_token}
```

---

## Table of Contents
1. [Get Service IDs](#1-get-service-ids)
2. [Get Variation Codes](#2-get-variation-codes)
3. [Verify Smartcard](#3-verify-smartcard)
4. [Purchase Cable Subscription](#4-purchase-cable-subscription)
5. [Transaction Status Handling](#transaction-status-handling)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## 1. Get Service IDs

Returns a list of available cable TV providers.

### Endpoint
```
GET /api/v1/vtpass/cable/service-ids
```

### Headers
```
Authorization: Bearer {jwt_token}
```

### Request
No request body required.

### Response Success (200 OK)
```json
{
  "success": true,
  "message": "Cable service IDs retrieved successfully",
  "data": [
    {
      "name": "DSTV Subscription",
      "identifier": "tv-subscription",
      "serviceID": "dstv",
      "category": "tv-subscription",
      "commission": "1.5",
      "minimum_amount": "0",
      "maximum_amount": "0"
    },
    {
      "name": "GOTV Subscription",
      "serviceID": "gotv",
      ...
    },
    {
      "name": "Startimes Subscription",
      "serviceID": "startimes",
      ...
    },
    {
      "name": "Showmax Subscription",
      "serviceID": "showmax",
      ...
    }
  ]
}
```

### Response Error (400/500)
```json
{
  "statusCode": 400,
  "message": "Failed to fetch cable service IDs",
  "error": "Bad Request"
}
```

---

## 2. Get Variation Codes

Returns available subscription plans (bouquets) for a specific provider.

### Endpoint
```
GET /api/v1/vtpass/cable/variation-codes?serviceID={serviceID}
```

### Headers
```
Authorization: Bearer {jwt_token}
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| serviceID | string | Yes | Provider ID (e.g., "dstv", "gotv", "startimes", "showmax") |

### Request Example
```
GET /api/v1/vtpass/cable/variation-codes?serviceID=dstv
```

### Response Success (200 OK)
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
    ],
    "varations": [
      // Same as variations array above
    ]
  }
}
```

### Response Error (400/500)
```json
{
  "statusCode": 400,
  "message": "Failed to fetch variation codes",
  "error": "Bad Request"
}
```

---

## 3. Verify Smartcard

Verifies a smartcard number and retrieves customer information, current bouquet, and renewal amount.

### Endpoint
```
POST /api/v1/vtpass/cable/verify
```

### Headers
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Request Body
```json
{
  "billersCode": "1212121212",
  "serviceID": "dstv"
}
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| billersCode | string | Yes | Smartcard number (10 digits for DSTV/GOTV) |
| serviceID | string | Yes | Provider ID (dstv, gotv, startimes, showmax) |

### Response Success (200 OK)
```json
{
  "success": true,
  "message": "Smartcard verified successfully",
  "data": {
    "code": "000",
    "content": {
      "Customer_Name": "JOHN DOE",
      "Status": "ACTIVE",
      "Due_Date": "2025-02-06T00:00:00",
      "Customer_Number": "8061522780",
      "Customer_Type": "DSTV",
      "Current_Bouquet": "DStv Compact",
      "Renewal_Amount": "7900.00",
      "commission_details": {
        "amount": null,
        "rate": "1.50",
        "rate_type": "percent",
        "computation_type": "default"
      }
    }
  }
}
```

### Response Error (400/500)
```json
{
  "statusCode": 400,
  "message": "Failed to verify smartcard",
  "error": "Bad Request"
}
```

### Important Notes
- **Renewal_Amount**: Use this amount when making a renewal purchase (subscription_type: "renew")
- **Current_Bouquet**: Shows the customer's current subscription plan
- **Due_Date**: Subscription expiration date
- **Provider Support**: 
  - ✅ **DSTV & GOTV**: Support verify endpoint
  - ✅ **Startimes**: Supports verify endpoint
  - ❌ **Showmax**: Does NOT support verify endpoint (skip this step for Showmax)

---

## 4. Purchase Cable Subscription

Purchases a new subscription or renews an existing one.

### ⚠️ Provider-Specific Requirements

Different providers have different requirements:

| Provider | Verify Endpoint | Subscription Types | billersCode Type |
|----------|----------------|-------------------|------------------|
| **DSTV** | ✅ Supported | `change` or `renew` | Smartcard number (10 digits) |
| **GOTV** | ✅ Supported | `change` or `renew` | Smartcard number (10 digits) |
| **Startimes** | ✅ Supported | Purchase only (no subscription_type) | Smartcard number or eWallet |
| **Showmax** | ❌ Not supported | Purchase only (no subscription_type) | Phone number (11 digits) |

### Endpoint
```
POST /api/v1/vtpass/cable/purchase
```

### Headers
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Request Body

#### For DSTV/GOTV - Bouquet Change (New Subscription)
```json
{
  "request_id": "optional-unique-id",
  "serviceID": "dstv",
  "billersCode": "1212121212",
  "variation_code": "dstv-confam",
  "phone": "08030000000",
  "subscription_type": "change",
  "quantity": 1
}
```

#### For DSTV/GOTV - Bouquet Renewal
```json
{
  "request_id": "optional-unique-id",
  "serviceID": "dstv",
  "billersCode": "1212121212",
  "amount": 4615,
  "phone": "08030000000",
  "subscription_type": "renew",
  "quantity": 1
}
```

#### For Startimes - Purchase (No subscription_type)
```json
{
  "request_id": "optional-unique-id",
  "serviceID": "startimes",
  "billersCode": "1212121212",
  "variation_code": "nova",
  "amount": 900,
  "phone": "08030000000"
}
```

#### For Showmax - Purchase (No subscription_type, uses phone as billersCode)
```json
{
  "request_id": "optional-unique-id",
  "serviceID": "showmax",
  "billersCode": "08011111111",
  "variation_code": "full_3",
  "amount": 8400,
  "phone": "08011111111"
}
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| request_id | string | No | Unique transaction ID (auto-generated if not provided) |
| serviceID | string | Yes | Provider ID (dstv, gotv, startimes, showmax) |
| billersCode | string | Yes | **DSTV/GOTV/Startimes**: Smartcard number (10 digits)<br>**Showmax**: Phone number (11 digits) |
| variation_code | string | Conditional | **DSTV/GOTV**: Required for `subscription_type: "change"`<br>**Startimes/Showmax**: Always required |
| amount | number | Conditional | **DSTV/GOTV**: Required for `subscription_type: "renew"` (use Renewal_Amount from verify)<br>**Startimes/Showmax**: Optional (will use variation_code price if not provided) |
| phone | string | No | Customer phone number. If not provided, uses user's registered phone number |
| subscription_type | string | Conditional | **DSTV/GOTV only**: Required - either "change" or "renew"<br>**Startimes/Showmax**: Not used (omit this field) |
| quantity | number | No | Number of months (default: 1). Only applicable for DSTV/GOTV |

### Response Success (200 OK)

#### Transaction Delivered (Immediate Success)

**DSTV/GOTV/Startimes:**
```json
{
  "success": true,
  "message": "Cable purchase successful",
  "data": {
    "id": "transaction_id",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031011029125930",
    "amount": 4615,
    "transaction_date": "2025-03-10T10:02:57.000000Z",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "DSTV Subscription",
        "unique_element": "1212121212",
        "unit_price": "4615",
        "quantity": 1,
        "transactionId": "17416009779459629327738818",
        "commission": 69.225,
        "total_amount": 4545.775
      }
    }
  }
}
```

**Showmax (includes voucher code):**
```json
{
  "success": true,
  "message": "Cable purchase successful",
  "data": {
    "id": "transaction_id",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031013486732084",
    "amount": 8400,
    "transaction_date": "2025-03-10T12:48:57.000000Z",
    "purchased_code": "SHMVHXQ9L3RXGPU",
    "Voucher": ["SHMVHXQ9L3RXGPU"],
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "ShowMax",
        "unique_element": "08011111111",
        "unit_price": "8400",
        "quantity": 1,
        "transactionId": "17416109379361776858305486"
      }
    }
  }
}
```

**Note:** For Showmax purchases, always display the `purchased_code` (voucher code) to the user as they need it to activate their subscription.

#### Transaction Processing (Pending)
```json
{
  "success": true,
  "message": "Transaction is being processed",
  "data": {
    "id": "transaction_id",
    "code": "000",
    "response_description": "TRANSACTION PROCESSED",
    "status": "processing",
    "message": "Transaction is being processed. Status will be updated via webhook.",
    "requestId": "2025031011029125930",
    "content": {
      "transactions": {
        "status": "pending",
        "transactionId": "17416009779459629327738818"
      }
    }
  }
}
```

### Response Error (400)
```json
{
  "statusCode": 400,
  "message": "Insufficient wallet balance",
  "error": "Bad Request"
}
```

### Other Error Examples
```json
{
  "statusCode": 400,
  "message": "variation_code is required for subscription_type=change",
  "error": "Bad Request"
}
```

**Note:** This error only applies to DSTV/GOTV. Startimes and Showmax always require `variation_code` but don't use `subscription_type`.

```json
{
  "statusCode": 400,
  "message": "amount is required for subscription_type=renew (use Renewal_Amount from verify response)",
  "error": "Bad Request"
}
```

**Note:** This error only applies to DSTV/GOTV renewals. Startimes and Showmax don't use `subscription_type`.

```json
{
  "statusCode": 400,
  "message": "Invalid serviceID. Must be one of: dstv, gotv, startimes, showmax",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "subscription_type must be either change or renew",
  "error": "Bad Request"
}
```

**Note:** This validation only applies to DSTV/GOTV. For Startimes and Showmax, omit the `subscription_type` field entirely.

---

## Transaction Status Handling

### ⚠️ CRITICAL: Understanding Pending vs Failed Transactions

**IMPORTANT:** The mobile app must NOT treat transactions as failed when they are actually pending. This is crucial for preventing incorrect refunds and user confusion.

### Transaction Status Indicators

#### ✅ Success Indicators
- `code: "000"` AND `content.transactions.status: "delivered"`
- Response message: "Cable purchase successful"
- `success: true` in response

#### ⏳ Pending Indicators (DO NOT TREAT AS FAILED)
- `code: "000"` AND `content.transactions.status: "pending"` or `"initiated"`
- `code: "099"` (TRANSACTION IS PROCESSING)
- `response_description` contains "PROCESSING" or "PENDING"
- Response message: "Transaction is being processed"
- `status: "processing"` in response data
- **Timeout or No Response**: If the API times out or returns no response, treat as pending
- **Unexpected Response**: Any response code not explicitly listed as failed should be treated as pending

#### ❌ Failed Indicators (Only these should be treated as failed)
- `code: "016"` (TRANSACTION FAILED)
- `code: "000"` AND `content.transactions.status: "failed"`
- `code: "040"` (TRANSACTION REVERSAL)
- Response message contains "failed" or "reversed" and `success: false`
- Explicit validation errors (e.g., "Insufficient wallet balance")
- `statusCode: 400` or `statusCode: 403` with error message

### Handling Pending Transactions

When a transaction is pending:

1. **Show User-Friendly Message**
   ```
   "Your subscription is being processed. Please wait a few minutes and check your decoder."
   ```

2. **Store Transaction Reference**
   - Save the `requestId` from the response
   - Store transaction status as "pending" in local database/cache

3. **Implement Polling/Requery**
   - Poll the transaction status every 30-60 seconds for up to 5 minutes
   - Or implement a webhook listener to receive status updates
   - Use the `requestId` to query status

4. **User Experience**
   - Show a "Processing" indicator
   - Allow user to check transaction history
   - Provide option to refresh status manually
   - Do NOT show as "Failed" or trigger refunds

5. **Auto-Update After Delay**
   - After 5-10 minutes, automatically refresh transaction status
   - Update UI based on final status

### Response Codes Reference

| Code | Meaning | Action Required |
|------|---------|----------------|
| 000 + status: "delivered" | Success | Show success message |
| 000 + status: "pending"/"initiated" | Processing | Wait and requery |
| 099 | Processing | Wait and requery |
| 016 | Failed | Show error, refund if needed |
| 040 | Reversed | Show error, refund issued |
| Timeout/No Response | Unknown | Treat as pending, requery |

---

## Error Handling

### Standard Error Response Format
All errors follow NestJS HttpException format:
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Common Error Scenarios

#### 1. Validation Errors (400)
```json
{
  "statusCode": 400,
  "message": "variation_code is required for subscription_type=change",
  "error": "Bad Request"
}
```

**Note:** This error only applies to DSTV/GOTV. Startimes and Showmax always require `variation_code` but don't use `subscription_type`.

#### 2. Insufficient Balance (400)
```json
{
  "statusCode": 400,
  "message": "Insufficient wallet balance",
  "error": "Bad Request"
}
```

#### 3. Rate Limiting (429)
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Too Many Requests"
}
```

#### 4. Daily Limit Exceeded (403)
```json
{
  "statusCode": 403,
  "message": "Daily cable purchase count limit reached",
  "error": "Forbidden"
}
```

```json
{
  "statusCode": 403,
  "message": "Daily cable purchase amount limit exceeded",
  "error": "Forbidden"
}
```

#### 5. Network/Server Errors (500)
```json
{
  "statusCode": 500,
  "message": "Failed to purchase cable",
  "error": "Internal Server Error"
}
```

---

## Best Practices

### 1. Transaction Flow

#### For DSTV/GOTV:
1. **Get Service IDs** → User selects provider
2. **Get Variation Codes** → Show available plans
3. **Verify Smartcard** → Validate customer info and get renewal amount
4. **Show Options**:
   - Display current bouquet and renewal amount
   - Show all available plans
   - Let user choose: Renew current or Change bouquet
5. **Purchase** → Execute transaction with appropriate `subscription_type`

#### For Startimes:
1. **Get Service IDs** → User selects provider
2. **Get Variation Codes** → Show available plans
3. **Verify Smartcard** (Optional but recommended) → Validate customer info
4. **Purchase** → Execute transaction (no `subscription_type` field)

#### For Showmax:
1. **Get Service IDs** → User selects provider
2. **Get Variation Codes** → Show available plans
3. **Purchase** → Execute transaction (no verify step, no `subscription_type` field)
   - Use phone number as `billersCode`

### 2. Idempotency
- Always provide `request_id` when retrying failed requests
- The API will return the existing transaction result if `request_id` already exists
- Generate unique IDs: `YYYYMMDDHHMMSS{random}`

### 3. Error Recovery
- For network errors: Retry up to 3 times with exponential backoff
- For validation errors: Show clear message, don't retry
- For pending transactions: Implement requery mechanism

### 4. User Experience
- Show loading states during API calls
- Display clear success/error messages
- For pending transactions: Show "Processing" status with refresh option
- Store transaction history locally for offline access

### 5. Security
- Never log or expose JWT tokens
- Validate all user inputs before sending to API
- Implement proper error logging (without sensitive data)

### 6. Testing
- Test with sufficient and insufficient wallet balance
- Test with valid and invalid smartcard numbers
- Test network timeout scenarios
- Test pending transaction handling

---

## Sample Integration Flow

```javascript
// Example 1: DSTV/GOTV Purchase Flow
// 1. Get available providers
const providers = await fetch('/api/v1/vtpass/cable/service-ids', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Get plans for selected provider
const plans = await fetch('/api/v1/vtpass/cable/variation-codes?serviceID=dstv', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Verify smartcard (for DSTV/GOTV)
const verification = await fetch('/api/v1/vtpass/cable/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    billersCode: '1212121212',
    serviceID: 'dstv'
  })
});

// 4. Purchase - Renewal (DSTV/GOTV)
const purchase = await fetch('/api/v1/vtpass/cable/purchase', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    serviceID: 'dstv',
    billersCode: '1212121212',
    amount: verification.data.content.Renewal_Amount,
    phone: '08030000000',
    subscription_type: 'renew'
  })
});

// Example 2: Startimes Purchase Flow
const startimesPurchase = await fetch('/api/v1/vtpass/cable/purchase', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    serviceID: 'startimes',
    billersCode: '1212121212',
    variation_code: 'nova',
    phone: '08030000000'
    // Note: No subscription_type field
  })
});

// Example 3: Showmax Purchase Flow
const showmaxPurchase = await fetch('/api/v1/vtpass/cable/purchase', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    serviceID: 'showmax',
    billersCode: '08011111111', // Phone number, not smartcard
    variation_code: 'full_3',
    phone: '08011111111'
    // Note: No subscription_type field, no verify step
  })
});

// 5. Handle response
const purchaseData = await purchase.json();
if (purchaseData.success) {
  if (purchaseData.data.status === 'processing') {
    // Show pending status, implement requery
    showPendingTransaction(purchaseData.data.requestId);
  } else {
    // Show success
    showSuccessMessage();
  }
} else {
  // Show error
  showErrorMessage(purchaseData.message);
}
```

---

## Support

For issues or questions:
- Check transaction status using the `requestId`
- Review error messages for specific guidance
- Contact backend team with transaction reference

---

**Last Updated:** 2026-01-27
**Version:** 1.1

## Important Notes

### Daily Limits
- **Daily transaction count limit**: Default 20 transactions per day (configurable via `CABLE_DAILY_COUNT_LIMIT`)
- **Daily transaction amount limit**: Default ₦500,000 per day (configurable via `CABLE_DAILY_AMOUNT_LIMIT`)
- Exceeding limits will return a 403 Forbidden error

### Phone Number
- The `phone` field is optional
- If not provided, the system uses the user's registered phone number
- In development environment, a test phone number may be used automatically

### Provider-Specific Details

#### DSTV & GOTV
- Use smartcard number (10 digits) as `billersCode`
- Support both `change` and `renew` subscription types
- Verify endpoint provides `Renewal_Amount` for renewals
- Example smartcard: `1212121212`

#### Startimes
- Use smartcard number or eWallet number as `billersCode`
- Only supports purchase (no `subscription_type` field)
- Verify endpoint is available but optional
- Example smartcard: `1212121212`

#### Showmax
- Use phone number (11 digits) as `billersCode`
- Only supports purchase (no `subscription_type` field)
- **No verify endpoint** - skip verification step
- Example phone: `08011111111`
- Response includes `purchased_code` (voucher code) that should be displayed to user

### Product Whitelisting
**Important:** Products must be whitelisted in the VTpass account before they can be purchased. If you receive a "PRODUCT IS NOT WHITELISTED ON YOUR ACCOUNT" error:

1. Log into your VTpass profile:
   - Sandbox: https://sandbox.vtpass.com/profile
   - Live: https://www.vtpass.com/profile
2. Go to the **Product Settings** tab
3. Select the products you want to vend (e.g., DSTV, GOTV)
4. Click **Submit**


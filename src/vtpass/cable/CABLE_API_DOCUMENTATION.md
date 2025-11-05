# Cable TV Subscription API Documentation

## Overview
This API enables users to purchase and renew cable TV subscriptions (DSTV, GOTV, Startimes, Showmax) through the SmiPay platform. All endpoints require JWT authentication.

**Base URL:** `{YOUR_API_BASE_URL}/vtpass/cable`

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
GET /vtpass/cable/service-ids
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
  "success": false,
  "message": "Failed to fetch cable service IDs",
  "data": null
}
```

---

## 2. Get Variation Codes

Returns available subscription plans (bouquets) for a specific provider.

### Endpoint
```
GET /vtpass/cable/variation-codes?serviceID={serviceID}
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
GET /vtpass/cable/variation-codes?serviceID=dstv
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
  "success": false,
  "message": "Failed to fetch variation codes",
  "data": null
}
```

---

## 3. Verify Smartcard

Verifies a smartcard number and retrieves customer information, current bouquet, and renewal amount.

### Endpoint
```
POST /vtpass/cable/verify
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
  "success": false,
  "message": "Failed to verify smartcard",
  "data": null
}
```

### Important Notes
- **Renewal_Amount**: Use this amount when making a renewal purchase (subscription_type: "renew")
- **Current_Bouquet**: Shows the customer's current subscription plan
- **Due_Date**: Subscription expiration date

---

## 4. Purchase Cable Subscription

Purchases a new subscription or renews an existing one.

### Endpoint
```
POST /vtpass/cable/purchase
```

### Headers
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Request Body

#### For Bouquet Change (New Subscription)
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

#### For Bouquet Renewal
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

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| request_id | string | No | Unique transaction ID (auto-generated if not provided) |
| serviceID | string | Yes | Provider ID (dstv, gotv, startimes, showmax) |
| billersCode | string | Yes | Smartcard number |
| variation_code | string | Conditional | Required for `subscription_type: "change"` |
| amount | number | Conditional | Required for `subscription_type: "renew"` (use Renewal_Amount from verify) |
| phone | string | Yes | Customer phone number |
| subscription_type | string | Yes | Either "change" or "renew" |
| quantity | number | No | Number of months (default: 1) |

### Response Success (200 OK)

#### Transaction Delivered (Immediate Success)
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
  "success": false,
  "message": "Insufficient wallet balance",
  "data": null
}
```

### Other Error Examples
```json
{
  "success": false,
  "message": "variation_code is required for change subscription_type",
  "data": null
}
```

```json
{
  "success": false,
  "message": "amount is required for renew subscription_type (use Renewal_Amount from verify)",
  "data": null
}
```

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
All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

### Common Error Scenarios

#### 1. Validation Errors (400)
```json
{
  "success": false,
  "message": "variation_code is required for change subscription_type",
  "data": null
}
```

#### 2. Insufficient Balance (400)
```json
{
  "success": false,
  "message": "Insufficient wallet balance",
  "data": null
}
```

#### 3. Rate Limiting (403)
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please slow down.",
  "data": null
}
```

#### 4. Daily Limit Exceeded (403)
```json
{
  "success": false,
  "message": "Daily cable purchase count limit reached",
  "data": null
}
```

#### 5. Network/Server Errors (500)
```json
{
  "success": false,
  "message": "Failed to purchase cable",
  "data": null
}
```

---

## Best Practices

### 1. Transaction Flow
1. **Get Service IDs** → User selects provider
2. **Get Variation Codes** → Show available plans
3. **Verify Smartcard** → Validate customer info and get renewal amount
4. **Show Options**:
   - Display current bouquet and renewal amount
   - Show all available plans
   - Let user choose: Renew current or Change bouquet
5. **Purchase** → Execute transaction

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
// 1. Get available providers
const providers = await fetch('/vtpass/cable/service-ids', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Get plans for selected provider
const plans = await fetch('/vtpass/cable/variation-codes?serviceID=dstv', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Verify smartcard
const verification = await fetch('/vtpass/cable/verify', {
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

// 4. Purchase (Renewal example)
const purchase = await fetch('/vtpass/cable/purchase', {
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

// 5. Handle response
if (purchase.success) {
  if (purchase.data.status === 'processing') {
    // Show pending status, implement requery
    showPendingTransaction(purchase.data.requestId);
  } else {
    // Show success
    showSuccessMessage();
  }
} else {
  // Show error
  showErrorMessage(purchase.message);
}
```

---

## Support

For issues or questions:
- Check transaction status using the `requestId`
- Review error messages for specific guidance
- Contact backend team with transaction reference

---

**Last Updated:** 2025-01-11
**Version:** 1.0


# VTpass Education Services API Documentation

This document describes the API endpoints for purchasing education-related services (WAEC Registration, WAEC Result Checker, JAMB PIN) through the VTpass integration.

## Base URL

All endpoints are prefixed with:
```
/api/v1/vtpass/education
```

## Authentication

All endpoints require JWT authentication. Include the JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Available Services

The education API supports three main services:

1. **WAEC Registration** - Purchase WAEC registration PINs
2. **WAEC Result Checker** - Purchase WAEC result checker PINs
3. **JAMB PIN Vending** - Purchase JAMB UTME/Direct Entry PINs

---

## Table of Contents

1. [Get Variation Codes](#1-get-variation-codes)
2. [Verify JAMB Profile ID](#2-verify-jamb-profile-id-jamb-only)
3. [Purchase Education Service](#3-purchase-education-service)
4. [Query Transaction Status](#4-query-transaction-status)
5. [Transaction Status Handling](#transaction-status-handling)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## 1. Get Variation Codes

Retrieves available plans/variations for a specific education service.

### Endpoint
```
GET /api/v1/vtpass/education/variation-codes?serviceID={serviceID}
```

### Headers
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceID` | string | Yes | Service ID: `waec-registration`, `waec`, or `jamb` |

### Request Examples

**WAEC Registration:**
```
GET /api/v1/vtpass/education/variation-codes?serviceID=waec-registration
```

**WAEC Result Checker:**
```
GET /api/v1/vtpass/education/variation-codes?serviceID=waec
```

**JAMB PIN:**
```
GET /api/v1/vtpass/education/variation-codes?serviceID=jamb
```

### Response Success (200 OK)

**WAEC Registration:**
```json
{
  "success": true,
  "message": "Variation codes retrieved successfully for waec-registration",
  "data": {
    "ServiceName": "WAEC Registration PIN",
    "serviceID": "waec-registration",
    "convinience_fee": "N0.00",
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
  "message": "Variation codes retrieved successfully for waec",
  "data": {
    "ServiceName": "WAEC Result Checker PIN",
    "serviceID": "waec",
    "convinience_fee": "N0.00",
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

**JAMB PIN:**
```json
{
  "success": true,
  "message": "Variation codes retrieved successfully for jamb",
  "data": {
    "ServiceName": "Jamb",
    "serviceID": "jamb",
    "convinience_fee": "0 %",
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

### Response Error (400/500)
```json
{
  "statusCode": 400,
  "message": "Failed to fetch variation codes",
  "error": "Bad Request"
}
```

---

## 2. Verify JAMB Profile ID (JAMB Only)

Verifies a JAMB Profile ID and retrieves customer information. **This endpoint is only available for JAMB services.**

### Endpoint
```
POST /api/v1/vtpass/education/verify
```

### Headers
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Request Body
```json
{
  "billersCode": "0123456789",
  "serviceID": "jamb",
  "type": "utme-mock"
}
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `billersCode` | string | Yes | JAMB Profile ID (10 digits). Sandbox: use `0123456789` |
| `serviceID` | string | Yes | Must be `jamb` |
| `type` | string | Yes | Variation code (e.g., `utme-mock`, `utme-no-mock`) |

### Response Success (200 OK)
```json
{
  "success": true,
  "message": "Profile ID verified successfully",
  "data": {
    "code": "000",
    "content": {
      "Customer_Name": "Capital James",
      "commission_details": {
        "amount": 10.22,
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
  "message": "Failed to verify profile ID",
  "error": "Bad Request"
}
```

### Important Notes
- **Only for JAMB**: This endpoint is only available for JAMB services
- **WAEC Registration & WAEC Result Checker**: Do not have a verify endpoint
- **Profile ID**: Must be obtained from the JAMB Official Website
- **Sandbox Testing**: Use `0123456789` as the Profile ID for successful verification

---

## 3. Purchase Education Service

Purchases an education service PIN (WAEC Registration, WAEC Result Checker, or JAMB PIN).

### Endpoint
```
POST /api/v1/vtpass/education/purchase
```

### Headers
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Request Body

#### WAEC Registration
```json
{
  "request_id": "optional-unique-id",
  "serviceID": "waec-registration",
  "variation_code": "waec-registraion",
  "amount": 14450,
  "quantity": 1,
  "phone": "08011111111"
}
```

#### WAEC Result Checker
```json
{
  "request_id": "optional-unique-id",
  "serviceID": "waec",
  "variation_code": "waecdirect",
  "amount": 900,
  "quantity": 1,
  "phone": "08011111111"
}
```

#### JAMB PIN
```json
{
  "request_id": "optional-unique-id",
  "serviceID": "jamb",
  "variation_code": "utme-mock",
  "billersCode": "0123456789",
  "amount": 7700,
  "phone": "08011111111"
}
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | No | Unique transaction ID (auto-generated if not provided) |
| `serviceID` | string | Yes | Service ID: `waec-registration`, `waec`, or `jamb` |
| `variation_code` | string | Yes | Variation code from the variation codes endpoint |
| `billersCode` | string | Conditional | **JAMB only**: JAMB Profile ID (10 digits) |
| `amount` | number | No | Amount in Naira. If not provided, uses variation_code price |
| `quantity` | number | No | Quantity of PINs to purchase (default: 1) |
| `phone` | string | Yes | Customer phone number |

### Response Success (200 OK)

#### WAEC Registration Success
```json
{
  "success": true,
  "message": "Education service purchase successful",
  "data": {
    "id": "transaction-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "20250218130312-78654567",
    "amount": 14450,
    "transaction_date": "2025-02-18T12:03:16.000000Z",
    "purchased_code": "Token: 0100070365657400875",
    "tokens": [
      "0100070365657400875"
    ],
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "WAEC Registration PIN",
        "unique_element": "08011111111",
        "unit_price": 14450,
        "quantity": 1,
        "transactionId": "1582290782154",
        "commission": 150,
        "total_amount": 14300
      }
    }
  }
}
```

#### WAEC Result Checker Success
```json
{
  "success": true,
  "message": "Education service purchase successful",
  "data": {
    "id": "transaction-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "20250218124018-c3pwwi49eid",
    "amount": "900.00",
    "transaction_date": "2025-02-18T11:40:20.000000Z",
    "purchased_code": "Serial No:WRN123456790, pin: 098765432112",
    "cards": [
      {
        "Serial": "WRN123456790",
        "Pin": "098765432112"
      }
    ],
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "WAEC Result Checker PIN",
        "unique_element": "08011111111",
        "unit_price": 900,
        "quantity": 1,
        "transactionId": "1582290782154"
      }
    }
  }
}
```

#### JAMB PIN Success
```json
{
  "success": true,
  "message": "Education service purchase successful",
  "data": {
    "id": "transaction-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "20250218131720-0rjx1p27xnj",
    "amount": 7700,
    "transaction_date": "2025-02-18T12:17:21.000000Z",
    "purchased_code": "Pin : 3678251321392432",
    "Pin": "Pin : 3678251321392432",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "JAMB PIN VENDING (UTME & Direct Entry)",
        "unique_element": "0123456789",
        "unit_price": "7700.00",
        "quantity": 1,
        "transactionId": "17398810413069178444218360"
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
    "id": "transaction-uuid",
    "code": "000",
    "response_description": "TRANSACTION IS PROCESSING",
    "status": "processing",
    "message": "Transaction is being processed. Status will be updated via webhook.",
    "requestId": "20250218130312-78654567",
    "amount": 14450
  }
}
```

### Error Responses

**400 Bad Request - Insufficient Balance:**
```json
{
  "statusCode": 400,
  "message": "Insufficient wallet balance",
  "error": "Bad Request"
}
```

**400 Bad Request - Missing Required Field:**
```json
{
  "statusCode": 400,
  "message": "billersCode is required for JAMB purchases",
  "error": "Bad Request"
}
```

**400 Bad Request - Product Not Whitelisted:**
```json
{
  "statusCode": 400,
  "message": "PRODUCT IS NOT WHITELISTED ON YOUR ACCOUNT",
  "error": "Bad Request"
}
```

**400 Bad Request - Transaction Failed:**
```json
{
  "statusCode": 400,
  "message": "Transaction failed with code: 016",
  "error": "Bad Request"
}
```

---

## 4. Query Transaction Status

Queries the status of a previously initiated transaction.

### Endpoint
```
POST /api/v1/vtpass/education/query
```

### Headers
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Request Body
```json
{
  "request_id": "20250218130312-78654567"
}
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | The request_id used when purchasing the transaction |

### Response Success (200 OK)
```json
{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "data": {
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "20250218130312-78654567",
    "amount": 14450,
    "transaction_date": "2025-02-18T12:03:16.000000Z",
    "purchased_code": "Token: 0100070365657400875",
    "tokens": ["0100070365657400875"],
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "WAEC Registration PIN",
        "transactionId": "1582290782154"
      }
    }
  }
}
```

### Response Error (400/500)
```json
{
  "statusCode": 400,
  "message": "Error message from VTpass API",
  "error": "Bad Request"
}
```

---

## Transaction Status Codes

The API uses the following status codes from VTpass:

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| `000` + `delivered` | Success | Transaction completed successfully | Show success message and display PIN/token |
| `000` + `pending`/`initiated` | Processing | Transaction is being processed | Show "Processing" status, will update via webhook |
| `099` | Processing | Transaction is processing | Show "Processing" status |
| `016` | Failed | Transaction failed | Show error, refund processed |
| `040` | Reversed | Transaction was reversed | Show error, refund processed |
| `087` | Invalid Credentials | API credentials are invalid | Contact support |

---

## Important Notes

### 1. Service-Specific Requirements

#### WAEC Registration
- **Service ID**: `waec-registration`
- **No verify endpoint** - Purchase directly
- **Response includes**: `tokens` array with registration token
- **Display**: Show the token to the user

#### WAEC Result Checker
- **Service ID**: `waec`
- **No verify endpoint** - Purchase directly
- **Response includes**: `cards` array with Serial and Pin
- **Display**: Show both Serial and Pin to the user

#### JAMB PIN
- **Service ID**: `jamb`
- **Has verify endpoint** - Verify Profile ID before purchase
- **Requires**: `billersCode` (JAMB Profile ID) in purchase request
- **Response includes**: `purchased_code` and `Pin` with the PIN
- **Display**: Show the PIN to the user
- **Important**: Do not sell more than the approved pricing from JAMB

### 2. PIN/Token Display

**Critical**: Always display the purchased PIN, token, or serial number to the user immediately after successful purchase:

- **WAEC Registration**: Display the `token` from the `tokens` array
- **WAEC Result Checker**: Display both `Serial` and `Pin` from the `cards` array
- **JAMB PIN**: Display the `Pin` from the response

These codes are shown only once and cannot be retrieved later.

### 3. Idempotency

- The `request_id` field is optional. If provided, the system checks for an existing transaction with the same ID.
- If a transaction with the same `request_id` already exists:
  - If status is `success`: Returns the cached successful result
  - If status is `pending`: Returns the current status without retrying
  - If status is `failed`: Returns the failed status without retrying
- If `request_id` is not provided, the system automatically generates one in the format: `YYYYMMDDHHII<random>`

### 4. Rate Limiting

- All endpoints are rate-limited to prevent abuse
- Exceeding limits will return a 429 Too Many Requests error

### 5. Wallet Balance

- Transactions are deducted from the user's wallet balance immediately
- If the transaction fails or is reversed, the amount is automatically refunded
- Always check wallet balance before allowing purchase

### 6. Product Whitelisting

**Important:** Products must be whitelisted in the VTpass account before they can be purchased. If you receive a "PRODUCT IS NOT WHITELISTED ON YOUR ACCOUNT" error:

1. Log into your VTpass profile:
   - Sandbox: https://sandbox.vtpass.com/profile
   - Live: https://www.vtpass.com/profile
2. Go to the **Product Settings** tab
3. Select the products you want to vend (e.g., WAEC Registration, WAEC Result Checker, JAMB)
4. Click **Submit**

### 7. Transaction Processing

- Some transactions may return a "processing" status
- These transactions are automatically checked by a background service
- Status updates are sent via webhook (if configured)
- Users should be informed that processing transactions may take a few minutes

### 8. Phone Number Validation

- Phone numbers should be 11 digits (e.g., "08012345678")
- Include the leading "0"
- No spaces or special characters

### 9. Quantity

- Default quantity is 1 if not specified
- You can purchase multiple PINs in a single transaction
- Each PIN will be included in the response (tokens array, cards array, etc.)

### 10. Amount

- The `amount` field is optional
- If not provided, the system uses the price from the `variation_code`
- If provided, it should match the variation amount (though VTpass may ignore it)

---

## Example Usage

### JavaScript/TypeScript Example

```typescript
// 1. Get variation codes for WAEC Registration
const getVariationCodes = async (token: string, serviceID: string) => {
  const response = await fetch(
    `/api/v1/vtpass/education/variation-codes?serviceID=${encodeURIComponent(serviceID)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return await response.json();
};

// 2. Verify JAMB Profile ID (JAMB only)
const verifyJambProfile = async (token: string, profileId: string, variationCode: string) => {
  const response = await fetch('/api/v1/vtpass/education/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      billersCode: profileId,
      serviceID: 'jamb',
      type: variationCode
    })
  });
  return await response.json();
};

// 3. Purchase WAEC Registration
const purchaseWaecRegistration = async (
  token: string,
  variationCode: string,
  phone: string,
  quantity: number = 1
) => {
  const response = await fetch('/api/v1/vtpass/education/purchase', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceID: 'waec-registration',
      variation_code: variationCode,
      phone,
      quantity
    })
  });
  return await response.json();
};

// 4. Purchase WAEC Result Checker
const purchaseWaecResultChecker = async (
  token: string,
  variationCode: string,
  phone: string,
  quantity: number = 1
) => {
  const response = await fetch('/api/v1/vtpass/education/purchase', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceID: 'waec',
      variation_code: variationCode,
      phone,
      quantity
    })
  });
  return await response.json();
};

// 5. Purchase JAMB PIN
const purchaseJambPin = async (
  token: string,
  variationCode: string,
  profileId: string,
  phone: string
) => {
  const response = await fetch('/api/v1/vtpass/education/purchase', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceID: 'jamb',
      variation_code: variationCode,
      billersCode: profileId,
      phone
    })
  });
  return await response.json();
};

// 6. Query transaction status
const queryTransaction = async (token: string, requestId: string) => {
  const response = await fetch('/api/v1/vtpass/education/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      request_id: requestId
    })
  });
  return await response.json();
};

// Usage Example: WAEC Registration Flow
try {
  // Get available plans
  const variations = await getVariationCodes(userToken, 'waec-registration');
  console.log('Available plans:', variations.data.variations);

  // Select a plan
  const selectedPlan = variations.data.variations[0];

  // Purchase
  const result = await purchaseWaecRegistration(
    userToken,
    selectedPlan.variation_code,
    '08012345678',
    1
  );

  if (result.success) {
    if (result.data.status === 'processing') {
      console.log('Transaction is processing...');
    } else {
      console.log('Purchase successful!');
      // Display token to user
      if (result.data.tokens && result.data.tokens.length > 0) {
        console.log('Registration Token:', result.data.tokens[0]);
        // Show this to the user!
      }
    }
  } else {
    console.error('Purchase failed:', result.message);
  }
} catch (error) {
  console.error('Error:', error);
}

// Usage Example: JAMB PIN Flow
try {
  // 1. Get variation codes
  const variations = await getVariationCodes(userToken, 'jamb');
  
  // 2. Verify Profile ID (recommended)
  const verification = await verifyJambProfile(
    userToken,
    '0123456789',
    'utme-mock'
  );
  console.log('Profile verified for:', verification.data.content.Customer_Name);

  // 3. Purchase
  const result = await purchaseJambPin(
    userToken,
    'utme-mock',
    '0123456789',
    '08012345678'
  );

  if (result.success && result.data.Pin) {
    console.log('JAMB PIN:', result.data.Pin);
    // Display PIN to user immediately!
  }
} catch (error) {
  console.error('Error:', error);
}
```

### cURL Examples

**Get Variation Codes (WAEC Registration):**
```bash
curl -X GET "https://your-api.com/api/v1/vtpass/education/variation-codes?serviceID=waec-registration" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Verify JAMB Profile ID:**
```bash
curl -X POST "https://your-api.com/api/v1/vtpass/education/verify" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billersCode": "0123456789",
    "serviceID": "jamb",
    "type": "utme-mock"
  }'
```

**Purchase WAEC Registration:**
```bash
curl -X POST "https://your-api.com/api/v1/vtpass/education/purchase" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceID": "waec-registration",
    "variation_code": "waec-registraion",
    "phone": "08011111111",
    "quantity": 1
  }'
```

**Purchase JAMB PIN:**
```bash
curl -X POST "https://your-api.com/api/v1/vtpass/education/purchase" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceID": "jamb",
    "variation_code": "utme-mock",
    "billersCode": "0123456789",
    "phone": "08011111111"
  }'
```

**Query Transaction:**
```bash
curl -X POST "https://your-api.com/api/v1/vtpass/education/query" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "20250218130312-78654567"
  }'
```

---

## Error Handling Best Practices

1. **Always check the `success` field** in the response
2. **Display PINs/Tokens immediately** - These are shown only once and cannot be retrieved later
3. **Handle processing status** - Show appropriate UI for transactions that are processing
4. **Check wallet balance** before allowing purchase attempts
5. **Display user-friendly error messages** based on the error type:
   - Insufficient balance → "You don't have enough balance. Please top up your wallet."
   - Product not whitelisted → "This service is temporarily unavailable. Please try again later."
   - Invalid Profile ID (JAMB) → "Invalid JAMB Profile ID. Please verify and try again."
   - Transaction failed → "Transaction failed. Your money has been refunded."
6. **Implement retry logic** for network errors, but not for business logic errors
7. **Store transaction references** for tracking and support purposes
8. **For JAMB**: Always verify Profile ID before purchase to avoid errors

---

## PIN/Token Storage and Display

### Critical: One-Time Display

Education service PINs and tokens are **shown only once** in the API response. They cannot be retrieved later through query endpoints. Therefore:

1. **Immediate Display**: Show the PIN/token to the user immediately after successful purchase
2. **Copy Functionality**: Provide a "Copy" button for easy copying
3. **Save Option**: Allow users to save a screenshot or copy to notes
4. **Email/SMS**: Consider sending the PIN/token via email or SMS as backup
5. **Transaction History**: Store the PIN/token in your transaction history for customer support

### Response Format by Service

- **WAEC Registration**: `tokens` array contains registration tokens
- **WAEC Result Checker**: `cards` array contains objects with `Serial` and `Pin`
- **JAMB PIN**: `Pin` field contains the PIN, also in `purchased_code`

---

## Support

For issues related to:
- **API Integration**: Contact backend team
- **VTpass Account/Whitelisting**: Contact VTpass support at support@vtpass.com
- **Transaction Issues**: Check transaction status using the query endpoint or contact support with the transaction reference
- **JAMB Pricing**: Ensure you're not selling above JAMB-approved pricing

---

## Changelog

- **2026-01-27**: Initial documentation
  - Added variation codes endpoint
  - Added JAMB verify endpoint
  - Added purchase endpoint for all three services
  - Added query transaction endpoint
  - Added error handling documentation
  - Added transaction status codes
  - Added PIN/token display guidelines

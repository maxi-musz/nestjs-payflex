# VTpass Airtime API Documentation

This document describes the API endpoints for purchasing airtime through the VTpass integration.

## Base URL

All endpoints are prefixed with:
```
/api/v1/vtpass/airtime
```

## Authentication

All endpoints require JWT authentication. Include the JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get Available Airtime Service IDs

Retrieves the list of available airtime providers and their service IDs.

**Endpoint:** `GET /api/v1/vtpass/airtime/service-ids`

**Headers:**
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Airtime service IDs retrieved successfully",
  "data": [
    {
      "serviceID": "mtn",
      "name": "MTN Airtime",
      "minimium_amount": "50",
      "maximum_amount": "100000",
      "convinience_fee": "0 %",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/MTN-Airtime.jpg"
    },
    {
      "serviceID": "glo",
      "name": "GLO Airtime",
      "minimium_amount": "50",
      "maximum_amount": "100000",
      "convinience_fee": "0 %",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/GLO-Airtime.jpg"
    },
    {
      "serviceID": "airtel",
      "name": "Airtel Airtime",
      "minimium_amount": "50",
      "maximum_amount": "100000",
      "convinience_fee": "0 %",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/Airtel-Airtime.jpg"
    },
    {
      "serviceID": "etisalat",
      "name": "9mobile Airtime",
      "minimium_amount": "50",
      "maximum_amount": "100000",
      "convinience_fee": "0 %",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/9mobile-Airtime.jpg"
    }
  ]
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Error message from VTpass API",
  "error": "Bad Request"
}
```

---

### 2. Purchase Airtime

Purchases airtime for a specified phone number.

**Endpoint:** `POST /api/v1/vtpass/airtime/purchase`

**Headers:**
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "serviceID": "mtn",
  "amount": 100,
  "phone": "08012345678",
  "request_id": "202601271200abc123" // Optional: for idempotency
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceID` | string | Yes | Service ID of the provider. Valid values: `mtn`, `glo`, `airtel`, `etisalat`, `9-mobile`, `foreign-airtime` |
| `amount` | number | Yes | Amount to purchase (in Naira). Must be within provider's min/max limits |
| `phone` | string | Yes | Phone number to recharge (11 digits, e.g., "08012345678") |
| `request_id` | string | No | Unique transaction reference for idempotency. If not provided, system generates one automatically |

**Success Response (200 OK):**

**Immediate Success:**
```json
{
  "success": true,
  "message": "Airtime purchase successful",
  "data": {
    "id": "transaction-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "MTN Airtime VTU",
        "unique_element": "08012345678",
        "unit_price": "100",
        "quantity": 1,
        "amount": "100",
        "commission": 0.7,
        "total_amount": 99.3,
        "transactionId": "17415980564672211596777904",
        "commission_details": {
          "amount": 0.7,
          "rate": "3.50",
          "rate_type": "percent",
          "computation_type": "default"
        }
      }
    },
    "requestId": "202601271200abc123",
    "amount": 100,
    "transaction_date": "2026-01-27T12:00:00.000000Z"
  }
}
```

**Processing Status:**
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
    "requestId": "202601271200abc123",
    "amount": 100
  }
}
```

**Error Responses:**

**400 Bad Request - Insufficient Balance:**
```json
{
  "statusCode": 400,
  "message": "Insufficient wallet balance",
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

**401 Unauthorized - Invalid Credentials:**
```json
{
  "statusCode": 401,
  "message": "INVALID CREDENTIALS: Your VTpass secret key does not match your API key. Please verify in your VTpass profile that the secret key and API key are from the same key pair. If you regenerated your keys, update your environment variables.",
  "error": "Unauthorized"
}
```

**400 Bad Request - Existing Transaction:**
```json
{
  "success": false,
  "message": "Transaction is still processing",
  "data": {
    "requestId": "202601271200abc123",
    "status": "pending",
    "transaction_number": null
  }
}
```

---

## Transaction Status Codes

The API uses the following status codes from VTpass:

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| `000` + `delivered` | Success | Transaction completed successfully | Show success message |
| `000` + `pending`/`initiated` | Processing | Transaction is being processed | Show "Processing" status, will update via webhook |
| `099` | Processing | Transaction is processing | Show "Processing" status |
| `016` | Failed | Transaction failed | Show error, refund processed |
| `040` | Reversed | Transaction was reversed | Show error, refund processed |
| `087` | Invalid Credentials | API credentials are invalid | Contact support |

---

## Important Notes

### 1. Idempotency

- The `request_id` field is optional. If provided, the system checks for an existing transaction with the same ID.
- If a transaction with the same `request_id` already exists:
  - If status is `success`: Returns the cached successful result
  - If status is `pending`: Returns the current status without retrying
  - If status is `failed`: Returns the failed status without retrying
- If `request_id` is not provided, the system automatically generates one in the format: `YYYYMMDDHHII<random>`

### 2. Rate Limiting

- All endpoints are rate-limited to prevent abuse
- The purchase endpoint has additional daily limits:
  - Daily transaction count limit
  - Daily transaction amount limit
- Exceeding limits will return a 429 Too Many Requests error

### 3. Wallet Balance

- Transactions are deducted from the user's wallet balance immediately
- If the transaction fails or is reversed, the amount is automatically refunded
- Always check wallet balance before allowing purchase

### 4. Product Whitelisting

**Important:** Products must be whitelisted in the VTpass account before they can be purchased. If you receive a "PRODUCT IS NOT WHITELISTED ON YOUR ACCOUNT" error:

1. Log into your VTpass profile:
   - Sandbox: https://sandbox.vtpass.com/profile
   - Live: https://www.vtpass.com/profile
2. Go to the **Product Settings** tab
3. Select the products you want to vend (e.g., MTN Airtime, GLO Airtime)
4. Click **Submit**

### 5. Transaction Processing

- Some transactions may return a "processing" status
- These transactions are automatically checked by a background service
- Status updates are sent via webhook (if configured)
- Users should be informed that processing transactions may take a few minutes

### 6. Phone Number Validation

- Phone numbers should be 11 digits (e.g., "08012345678")
- Include the leading "0"
- No spaces or special characters

### 7. Amount Limits

- Each provider has minimum and maximum amount limits
- Check the service IDs endpoint to get the limits for each provider
- Amounts outside these limits will be rejected

---

## Example Usage

### JavaScript/TypeScript Example

```typescript
// 1. Get available service IDs
const getServiceIds = async (token: string) => {
  const response = await fetch('/api/v1/vtpass/airtime/service-ids', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
};

// 2. Purchase airtime
const purchaseAirtime = async (
  token: string,
  serviceID: string,
  amount: number,
  phone: string
) => {
  const response = await fetch('/api/v1/vtpass/airtime/purchase', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceID,
      amount,
      phone
    })
  });
  return await response.json();
};

// Usage
try {
  // Get available providers
  const providers = await getServiceIds(userToken);
  console.log('Available providers:', providers.data);

  // Purchase MTN airtime
  const result = await purchaseAirtime(
    userToken,
    'mtn',
    100,
    '08012345678'
  );

  if (result.success) {
    if (result.data.status === 'processing') {
      console.log('Transaction is processing...');
    } else {
      console.log('Airtime purchased successfully!');
      console.log('Transaction ID:', result.data.content.transactions.transactionId);
    }
  } else {
    console.error('Purchase failed:', result.message);
  }
} catch (error) {
  console.error('Error:', error);
}
```

### cURL Examples

**Get Service IDs:**
```bash
curl -X GET "https://your-api.com/api/v1/vtpass/airtime/service-ids" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Purchase Airtime:**
```bash
curl -X POST "https://your-api.com/api/v1/vtpass/airtime/purchase" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceID": "mtn",
    "amount": 100,
    "phone": "08012345678"
  }'
```

---

## Error Handling Best Practices

1. **Always check the `success` field** in the response
2. **Handle processing status** - Show appropriate UI for transactions that are processing
3. **Check wallet balance** before allowing purchase attempts
4. **Display user-friendly error messages** based on the error type:
   - Insufficient balance → "You don't have enough balance. Please top up your wallet."
   - Product not whitelisted → "This service is temporarily unavailable. Please try again later."
   - Invalid phone number → "Please enter a valid phone number."
   - Transaction failed → "Transaction failed. Your money has been refunded."
5. **Implement retry logic** for network errors, but not for business logic errors
6. **Store transaction references** for tracking and support purposes

---

## Support

For issues related to:
- **API Integration**: Contact backend team
- **VTpass Account/Whitelisting**: Contact VTpass support at support@vtpass.com
- **Transaction Issues**: Check transaction status using the transaction reference

---

## Changelog

- **2026-01-27**: Initial documentation
  - Added service IDs endpoint
  - Added purchase endpoint
  - Added error handling documentation
  - Added transaction status codes

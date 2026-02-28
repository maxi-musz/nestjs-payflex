# VTpass Data API Documentation

This document describes the API endpoints for purchasing mobile data through the VTpass integration.

## Base URL

All endpoints are prefixed with:
```
/api/v1/vtpass/data
```

## Authentication

All endpoints require JWT authentication. Include the JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get Available Data Service IDs

Retrieves the list of available data providers and their service IDs.

**Endpoint:** `GET /api/v1/vtpass/data/service-ids`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `identifier` | string | No | `data` | Service category identifier |

**Headers:**
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Service IDs retrieved successfully",
  "data": [
    {
      "serviceID": "mtn-data",
      "name": "MTN Data",
      "minimium_amount": "1",
      "maximum_amount": "1000000",
      "convinience_fee": "0 %",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/MTN-Data.jpg"
    },
    {
      "serviceID": "airtel-data",
      "name": "Airtel Data",
      "minimium_amount": "1",
      "maximum_amount": "1000000",
      "convinience_fee": "0 %",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/Airtel-Data.jpg"
    },
    {
      "serviceID": "glo-data",
      "name": "GLO Data",
      "minimium_amount": "1",
      "maximum_amount": "200000",
      "convinience_fee": "0 %",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/GLO-Data.jpg"
    },
    {
      "serviceID": "etisalat-data",
      "name": "9mobile Data",
      "minimium_amount": "1",
      "maximum_amount": "1000000",
      "convinience_fee": "0 %",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/9mobile-Data.jpg"
    },
    {
      "serviceID": "smile-direct",
      "name": "Smile Payment",
      "minimium_amount": "100",
      "maximum_amount": "150000",
      "convinience_fee": "N0",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/Smile-Payment.jpg"
    },
    {
      "serviceID": "spectranet",
      "name": "Spectranet Internet Data",
      "minimium_amount": "1",
      "maximum_amount": "100000",
      "convinience_fee": "N0",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/Spectranet.jpg"
    },
    {
      "serviceID": "glo-sme-data",
      "name": "GLO Data (SME)",
      "minimium_amount": "1",
      "maximum_amount": "1000000",
      "convinience_fee": "0 %",
      "product_type": "fix",
      "image": "https://sandbox.vtpass.com/resources/products/200X200/GLO-Data-(SME).jpg"
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

### 2. Get Variation Codes

Retrieves available data plans (variation codes) for a specific service provider. Variations are categorized and include pricing with markup applied.

**Endpoint:** `GET /api/v1/vtpass/data/variation-codes`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceID` | string | Yes | Service ID of the provider (e.g., `mtn-data`, `glo-data`) |

**Headers:**
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Variation codes retrieved successfully for mtn-data",
  "data": {
    "ServiceName": "MTN Data",
    "serviceID": "mtn-data",
    "convinience_fee": "0 %",
    "counts": {
      "All": 50,
      "Daily": 10,
      "Weekly": 8,
      "Monthly": 15,
      "Night": 5,
      "Weekend": 4,
      "Social": 3,
      "SME": 2,
      "Hynetflex": 0,
      "Broadband router": 0,
      "Others": 3,
      "total": 50
    },
    "variations": [
      {
        "variation_code": "mtn-500mb-daily",
        "name": "MTN 500MB Daily",
        "variation_amount": "150.00",
        "vtpass_amount": "145.00",
        "fixedPrice": "Yes"
      },
      {
        "variation_code": "mtn-1gb-daily",
        "name": "MTN 1GB Daily",
        "variation_amount": "250.00",
        "vtpass_amount": "240.00",
        "fixedPrice": "Yes"
      }
    ],
    "variations_categorized": {
      "Daily": {
        "count": 10,
        "variations": [...]
      },
      "Weekly": {
        "count": 8,
        "variations": [...]
      },
      "Monthly": {
        "count": 15,
        "variations": [...]
      }
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `counts` | object | Count of variations by category |
| `variations` | array | All available variations with pricing |
| `variations_categorized` | object | Variations grouped by category (Daily, Weekly, Monthly, etc.) |
| `variation_amount` | string | Final price after markup (what user pays) |
| `vtpass_amount` | string | Original VTpass price (before markup) |

**Note:** Prices include markup. For amounts below ₦300, no markup is applied. For amounts ₦300 and above, markup percentage is applied based on user type (regular vs friendly users).

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Error message from VTpass API",
  "error": "Bad Request"
}
```

---

### 3. Purchase Data

Purchases data for a specified phone number using a variation code.

**Endpoint:** `POST /api/v1/vtpass/data/purchase`

**Headers:**
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "serviceID": "mtn-data",
  "billersCode": "08012345678",
  "variation_code": "mtn-1gb-daily",
  "amount": 250,
  "phone": "08012345678",
  "request_id": "202601271200abc123",
  "use_cashback": true
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceID` | string | Yes | Service ID of the provider. Valid values: `mtn-data`, `airtel-data`, `glo-data`, `etisalat-data`, `smile-direct`, `spectranet`, `glo-sme-data` |
| `billersCode` | string | Yes | Phone number to purchase data for (11 digits, e.g., "08012345678") |
| `variation_code` | string | Yes | Variation code from the variation codes endpoint (e.g., "mtn-1gb-daily") |
| `amount` | number | No | Amount in Naira. If not provided, will be fetched from variation code |
| `phone` | string | No | Customer phone number. If not provided, uses user's registered phone |
| `request_id` | string | No | Unique transaction reference for idempotency. If not provided, system generates one automatically |
| `use_cashback` | boolean | No | If `true`, the backend deducts what it can from the user's cashback wallet first, and only charges the remainder from the main wallet. Defaults to `false` if not sent |

**Success Response (200 OK):**

**Immediate Success:**
```json
{
  "success": true,
  "message": "Data purchase successful",
  "data": {
    "id": "transaction-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "MTN Data",
        "unique_element": "08012345678",
        "unit_price": "250",
        "quantity": 1,
        "amount": "250",
        "commission": 2.5,
        "total_amount": 247.5,
        "transactionId": "17415980564672211596777904",
        "commission_details": {
          "amount": 2.5,
          "rate": "1.00",
          "rate_type": "percent",
          "computation_type": "default"
        }
      }
    },
    "requestId": "202601271200abc123",
    "amount": 250,
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
    "amount": 250
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

**400 Bad Request - Invalid Service ID:**
```json
{
  "statusCode": 400,
  "message": "Invalid serviceID. Must be one of: mtn-data, airtel-data, glo-data, etisalat-data, smile-direct, spectranet, glo-sme-data",
  "error": "Bad Request"
}
```

**400 Bad Request - Missing Variation Code:**
```json
{
  "statusCode": 400,
  "message": "variation_code is required",
  "error": "Bad Request"
}
```

**400 Bad Request - Variation Code Not Found:**
```json
{
  "statusCode": 400,
  "message": "Variation code mtn-invalid-code not found",
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

### 4. Query Transaction Status

Queries the status of a previously initiated transaction.

**Endpoint:** `POST /api/v1/vtpass/data/query`

**Headers:**
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "request_id": "202601271200abc123"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request_id` | string | Yes | The request_id used when purchasing the transaction |

**Success Response:**
```json
{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "data": {
    "response_description": "TRANSACTION SUCCESSFUL",
    "code": "000",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "MTN Data",
        "unique_element": "08012345678",
        "unit_price": 250,
        "quantity": 1,
        "amount": 250,
        "transactionId": "17415980564672211596777904",
        "commission_details": {
          "amount": 2.5,
          "rate": "1.00",
          "rate_type": "percent",
          "computation_type": "default"
        }
      }
    },
    "requestId": "202601271200abc123",
    "amount": 250,
    "transaction_date": "2026-01-27T12:00:00.000000Z"
  }
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

- All endpoints are rate-limited per user and per IP to prevent abuse
- Exceeding rate limits returns a 429 error
- There are no daily caps — users can purchase as much as their wallet balance allows

### 3. Wallet Balance & Cashback

- Transactions are deducted from the user's wallet balance immediately
- The amount deducted includes markup (if applicable)
- If `use_cashback: true` is sent and the user has a cashback balance, the backend splits the payment automatically:
  - Cashback wallet is charged first (up to its full balance)
  - The remainder comes from the main wallet
  - Example: ₦500 data plan with ₦150 cashback balance → ₦150 from cashback + ₦350 from wallet
- If the transaction fails or is reversed, both the wallet and cashback portions are refunded automatically
- On a successful purchase, the user also **earns** cashback (if the admin has enabled it for data) — this is separate from spending cashback
- Always check wallet balance before allowing purchase

### 4. Pricing and Markup

- **Markup Calculation:**
  - For amounts **below ₦300**: No markup is applied
  - For amounts **₦300 and above**: Markup percentage is applied
  - Markup percentage varies based on user type:
    - Regular users: Uses `DATA_MARKUP_PERCENT` environment variable
    - Friendly users: Uses `DATA_MARKUP_PERCENT_FRIENDLIES` environment variable (defaults to regular markup if not set)
- **Price Display:**
  - `variation_amount`: Final price after markup (what user pays)
  - `vtpass_amount`: Original VTpass price (before markup)
- Prices are rounded down to the nearest whole number for display

### 5. Product Whitelisting

**Important:** Products must be whitelisted in the VTpass account before they can be purchased. If you receive a "PRODUCT IS NOT WHITELISTED ON YOUR ACCOUNT" error:

1. Log into your VTpass profile:
   - Sandbox: https://sandbox.vtpass.com/profile
   - Live: https://www.vtpass.com/profile
2. Go to the **Product Settings** tab
3. Select the products you want to vend (e.g., MTN Data, GLO Data)
4. Click **Submit**

### 6. Transaction Processing

- Some transactions may return a "processing" status
- These transactions are automatically checked by a background service
- Status updates are sent via webhook (if configured)
- Users should be informed that processing transactions may take a few minutes
- Use the query endpoint to manually check transaction status if needed

### 7. Phone Number Validation

- Phone numbers should be 11 digits (e.g., "08012345678")
- Include the leading "0"
- No spaces or special characters
- The `billersCode` is the phone number receiving the data
- The `phone` field (optional) is the customer's contact number

### 8. Variation Codes

- Variation codes are provider-specific
- Each variation code represents a specific data plan
- Variation codes must be obtained from the variation codes endpoint before purchase
- Variation codes are case-sensitive
- If `amount` is not provided in the purchase request, it will be automatically fetched from the variation code

### 9. Service IDs

Valid service IDs for data purchases:
- `mtn-data` - MTN Data
- `airtel-data` - Airtel Data
- `glo-data` - GLO Data
- `etisalat-data` - 9mobile Data
- `smile-direct` - Smile Payment
- `spectranet` - Spectranet Internet Data
- `glo-sme-data` - GLO Data (SME)

---

## Example Usage

### JavaScript/TypeScript Example

```typescript
// 1. Get available service IDs
const getServiceIds = async (token: string) => {
  const response = await fetch('/api/v1/vtpass/data/service-ids', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
};

// 2. Get variation codes for a provider
const getVariationCodes = async (token: string, serviceID: string) => {
  const response = await fetch(
    `/api/v1/vtpass/data/variation-codes?serviceID=${encodeURIComponent(serviceID)}`,
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

// 3. Purchase data
const purchaseData = async (
  token: string,
  serviceID: string,
  billersCode: string,
  variationCode: string,
  phone?: string,
  useCashback: boolean = false
) => {
  const response = await fetch('/api/v1/vtpass/data/purchase', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceID,
      billersCode,
      variation_code: variationCode,
      phone,
      use_cashback: useCashback
    })
  });
  return await response.json();
};

// 4. Query transaction status
const queryTransaction = async (token: string, requestId: string) => {
  const response = await fetch('/api/v1/vtpass/data/query', {
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

// Usage Flow
try {
  // Step 1: Get available providers
  const providers = await getServiceIds(userToken);
  console.log('Available providers:', providers.data);

  // Step 2: Get data plans for MTN
  const variations = await getVariationCodes(userToken, 'mtn-data');
  console.log('Available plans:', variations.data.variations);
  console.log('Categorized plans:', variations.data.variations_categorized);

  // Step 3: Select a plan (e.g., first daily plan)
  const selectedPlan = variations.data.variations_categorized.Daily?.variations[0];
  if (!selectedPlan) {
    console.error('No plans available');
    return;
  }

  // Step 4: Purchase data (with cashback toggle from UI)
  const result = await purchaseData(
    userToken,
    'mtn-data',
    '08012345678',
    selectedPlan.variation_code,
    '08012345678',
    true // user toggled "Use Cashback" on
  );

  if (result.success) {
    if (result.data.status === 'processing') {
      console.log('Transaction is processing...');
      // Optionally query status later
      setTimeout(async () => {
        const status = await queryTransaction(userToken, result.data.requestId);
        console.log('Transaction status:', status);
      }, 30000); // Check after 30 seconds
    } else {
      console.log('Data purchased successfully!');
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
curl -X GET "https://your-api.com/api/v1/vtpass/data/service-ids" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Get Variation Codes:**
```bash
curl -X GET "https://your-api.com/api/v1/vtpass/data/variation-codes?serviceID=mtn-data" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Purchase Data:**
```bash
curl -X POST "https://your-api.com/api/v1/vtpass/data/purchase" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceID": "mtn-data",
    "billersCode": "08012345678",
    "variation_code": "mtn-1gb-daily",
    "phone": "08012345678",
    "use_cashback": true
  }'
```

**Query Transaction:**
```bash
curl -X POST "https://your-api.com/api/v1/vtpass/data/query" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "202601271200abc123"
  }'
```

---

## Error Handling Best Practices

1. **Always check the `success` field** in the response
2. **Handle processing status** - Show appropriate UI for transactions that are processing
3. **Check wallet balance** before allowing purchase attempts
4. **Validate variation codes** - Ensure the variation code exists before purchase
5. **Display user-friendly error messages** based on the error type:
   - Insufficient balance → "You don't have enough balance. Please top up your wallet."
   - Product not whitelisted → "This service is temporarily unavailable. Please try again later."
   - Invalid phone number → "Please enter a valid phone number."
   - Transaction failed → "Transaction failed. Your money has been refunded."
   - Variation code not found → "Selected data plan is no longer available. Please select another plan."
   - Rate limited → "Too many requests. Please slow down."
6. **Implement retry logic** for network errors, but not for business logic errors
7. **Store transaction references** for tracking and support purposes
8. **Handle rate limiting** - Show appropriate message when rate limit is exceeded
9. **Query transaction status** - For processing transactions, allow users to manually check status

---

## Data Plan Categories

Variations are automatically categorized into the following groups:

- **Daily** - Daily data plans
- **Weekly** - Weekly data plans
- **Monthly** - Monthly data plans
- **Night** - Night-only data plans
- **Weekend** - Weekend-only data plans
- **Social** - Social media data plans
- **SME** - Small and Medium Enterprise data plans
- **Hynetflex** - Hynetflex data plans
- **Broadband router** - Broadband router data plans
- **Others** - Other data plans that don't fit the above categories

Use the `variations_categorized` field in the variation codes response to display plans grouped by category.

---

## Support

For issues related to:
- **API Integration**: Contact backend team
- **VTpass Account/Whitelisting**: Contact VTpass support at support@vtpass.com
- **Transaction Issues**: Check transaction status using the query endpoint or contact support with the transaction reference
- **Pricing Questions**: Contact backend team for markup configuration

---

## Changelog

- **2026-02-26**: Cashback integration
  - Added `use_cashback` field to purchase request
  - Backend now splits payment between cashback wallet and main wallet when `use_cashback: true`
  - Successful purchases earn cashback automatically (if admin has enabled it for data)
  - Refunds now correctly return amounts to both wallets on failure
- **2026-01-27**: Initial documentation
  - Added service IDs endpoint
  - Added variation codes endpoint
  - Added purchase endpoint
  - Added query transaction endpoint
  - Added error handling documentation
  - Added transaction status codes
  - Added pricing and markup information

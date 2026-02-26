# International Airtime API — Frontend Documentation

> Base URL: `/api/v1/vtpass/airtime/international`
> Auth: All endpoints require `Authorization: Bearer <token>`

This service covers **International Airtime/Data/Pin** purchases via VTpass `foreign-airtime`:

- Users can select:
  - Country
  - Product type (e.g. Mobile Top Up, Mobile Data)
  - Operator (e.g. Ghana MTN)
  - Plan/variation (e.g. 5GB bundle, 15 EUR top up)

---

## 1. Get Countries

Returns the list of countries for which you can purchase international airtime/data/pins.

```
GET /api/v1/vtpass/airtime/international/countries
```

**Headers:** `Authorization: Bearer <token>`

### Response

```json
{
  "success": true,
  "message": "International airtime countries retrieved successfully",
  "data": {
    "countries": [
      {
        "code": "CM",
        "flag": "https://sandbox.vtpass.com/resources/images/flags/CM.png",
        "name": "Cameroon",
        "currency": "XAF",
        "prefix": "237"
      },
      {
        "code": "GH",
        "flag": "https://sandbox.vtpass.com/resources/images/flags/GH.png",
        "name": "Ghana",
        "currency": "GHS",
        "prefix": "233"
      }
    ]
  }
}
```

### Frontend Behaviour

- **Show a country picker** with:
  - Flag
  - Country name (`name`)
  - Dial prefix (`prefix`) – useful as a hint for phone fields
- Pass the selected `code` into the next step.

---

## 2. Get Product Types

Returns the available product types for a given country (e.g. Mobile Top Up, Mobile Data).

```
GET /api/v1/vtpass/airtime/international/product-types?code=GH
```

**Headers:** `Authorization: Bearer <token>`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | **Yes** | Country code (from `/countries` response) |

### Response

```json
{
  "success": true,
  "message": "International airtime product types retrieved successfully",
  "data": [
    {
      "product_type_id": 4,
      "name": "Mobile Data"
    },
    {
      "product_type_id": 1,
      "name": "Mobile Top Up"
    }
  ]
}
```

### Frontend Behaviour

- Show product types as a second dropdown after country:
  - e.g. “Mobile Top Up”, “Mobile Data”
- Pass both `code` and the selected `product_type_id` into the next step.

---

## 3. Get Operators

Returns the service providers/operators for a given country and product type.

```
GET /api/v1/vtpass/airtime/international/operators?code=GH&product_type_id=4
```

**Headers:** `Authorization: Bearer <token>`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | **Yes** | Country code |
| `product_type_id` | string | **Yes** | Product type ID |

### Response

```json
{
  "success": true,
  "message": "International airtime operators retrieved successfully",
  "data": [
    {
      "operator_id": "5",
      "name": "Ghana MTN",
      "operator_image": "https://sandbox.vtpass.com/resources/images/operators/80.png"
    }
  ]
}
```

### Frontend Behaviour

- Show a list of operators for the chosen country and product type.
- Use:
  - `name` as the display label
  - `operator_image` as an optional logo
- Pass `operator_id`, `code` and `product_type_id` into the next step.

---

## 4. Get Variations (Plans)

Returns the available plans/variations for a given operator and product type.

```
GET /api/v1/vtpass/airtime/international/variations?operator_id=5&product_type_id=4
```

**Headers:** `Authorization: Bearer <token>`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `operator_id` | string | **Yes** | Operator ID from `/operators` |
| `product_type_id` | string | **Yes** | Product type ID from `/product-types` |

### Response

```json
{
  "success": true,
  "message": "International airtime variations retrieved successfully",
  "data": {
    "serviceName": "International Airtime",
    "serviceID": "foreign-airtime",
    "convenienceFee": "0 %",
    "variations": [
      {
        "variation_code": "4987",
        "name": "160 -2000 GMD Top Up",
        "variation_amount": "0.00",
        "fixedPrice": "Yes"
      },
      {
        "variation_code": "2470",
        "name": "15EUR Top Up",
        "variation_amount": "0.00",
        "fixedPrice": "Yes"
      }
    ]
  }
}
```

### Frontend Behaviour

- Display `variations` as selectable plans.
- **Important:** For many international products:
  - `variation_amount` may be `"0.00"` for flexible pricing.
  - VTpass documentation explains how the provider charges in the local currency using a rate.
- For now, treat:
  - `name` as the human readable label (e.g. “15EUR Top Up”, “5GB Mobile Data”).
  - `variation_code` as the code you send in the purchase request.
- If VTpass begins returning non-zero `variation_amount`, you can show it as the displayed price.

---

## 5. Purchase International Airtime

Performs the actual purchase via VTpass `foreign-airtime`.

``+
POST /api/v1/vtpass/airtime/international/purchase
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceID` | string | No (defaults to `foreign-airtime`) | VTpass service ID |
| `billersCode` | string | **Yes** | Destination phone number to top up (beneficiary number) |
| `variation_code` | string | **Yes** | Variation code from `/variations` |
| `amount` | number | No | Amount in NGN. For many plans this is optional; VTpass may compute from variation and rate. |
| `phone` | string | **Yes** | Customer phone for notifications (can be same as `billersCode`) |
| `operator_id` | string | **Yes** | Operator ID from `/operators` |
| `country_code` | string | **Yes** | Country code from `/countries` |
| `product_type_id` | string | **Yes** | Product type ID from `/product-types` |
| `request_id` | string | No | Idempotency key. Auto-generated if omitted. **Always store this — needed for query.** |

### Example Request

```json
{
  "serviceID": "foreign-airtime",
  "billersCode": "233801234567",
  "variation_code": "2470",
  "amount": 2000,
  "phone": "08012345678",
  "operator_id": "5",
  "country_code": "GH",
  "product_type_id": "4"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "International airtime purchase successful",
  "data": {
    "id": "clx123-uuid",
    "code": "000",
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2026031016099807136",
    "amount": 2,
    "transaction_date": "2026-03-10T15:09:52.000000Z",
    "purchased_code": "",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "International Airtime",
        "unique_element": "2345638473434",
        "unit_price": "2",
        "quantity": 1,
        "commission": 0.08,
        "transactionId": "17416193926764171056841998"
      }
    },
    "wallet_balance": 45000
  }
}
```

> **Note:** International airtime generally does not return a PIN/token — the value is credited directly to the destination number with the selected operator.

### Processing Response (200)

```json
{
  "success": true,
  "message": "Transaction is being processed",
  "data": {
    "id": "clx123-uuid",
    "status": "processing",
    "message": "Transaction is being processed. Use the query endpoint with request_id to check status.",
    "wallet_balance": 45000
  }
}
```

### Error Responses

```json
{ "success": false, "message": "Insufficient wallet balance" }
```

```json
{ "success": false, "message": "Invalid request payload" }
```

```json
{ "success": false, "message": "Failed to purchase international airtime" }
```

---

## 6. Query Transaction Status

Checks the status of a pending or completed international airtime transaction.

```
POST /api/v1/vtpass/airtime/international/query
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request_id` | string | **Yes** | The reference from the purchase step |

### Request

```json
{
  "request_id": "2026031016099807136"
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
        "product_name": "International Airtime",
        "unique_element": "2345638473434",
        "unit_price": 2,
        "quantity": 1,
        "commission": 0,
        "transactionId": "17416193926764171056841998"
      }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2026031016099807136",
    "amount": 2,
    "transaction_date": "2026-03-10T15:09:52.000000Z",
    "purchased_code": ""
  }
}
```

> If the transaction was pending and is now delivered, the backend auto-updates the transaction record. If it ultimately failed, the wallet is auto-refunded.

---

## 7. Status Handling

| VTpass Code | VTpass Status | Internal Status | Action |
|-------------|--------------|-----------------|--------|
| `000` | `delivered` | `success` | Show success UI |
| `000` | `pending` / `initiated` | `pending` | Poll query endpoint |
| `099` | — | `pending` | Poll query endpoint |
| `016` | — | `failed` | Auto-refund, show error |
| `040` | `reversed` | `failed` | Auto-refund, show \"Transaction reversed\" |
| Timeout / no response | — | `pending` | Treat as pending, poll query endpoint |

### Polling Strategy

Same as other VTpass utilities:

1. Store the `requestId` immediately after purchase.
2. Wait 15 seconds, then call `POST /query`.
3. If still pending, wait 30 seconds and retry.
4. Continue polling every 30–60 seconds for up to 5 minutes.
5. After 5 minutes, show: “Your transaction is still processing. Please check back shortly.”
6. Allow manual “Refresh Status” button at any time.

---

## 8. Rate Limiting

International airtime endpoints are protected by the same rate limiting as other VTpass services.

| Variable | Default | Description |
|----------|---------|-------------|
| `AIRTIME_RATE_WINDOW_SECONDS` | `60` | Rate limit window (seconds) |
| `AIRTIME_RATE_MAX_REQUESTS` | `10` | Max requests per user in rate window |
| `AIRTIME_IP_RATE_MAX_REQUESTS` | `30` | Max requests per IP in rate window |

---

## 9. Summary of Endpoints

| Method | Endpoint | Description | Guards |
|--------|----------|-------------|--------|
| GET | `/countries` | Get list of countries | JWT + RateLimit |
| GET | `/product-types?code=xxx` | Get product types for a country | JWT + RateLimit |
| GET | `/operators?code=xxx&product_type_id=yyy` | Get operators for a country + product type | JWT + RateLimit |
| GET | `/variations?operator_id=xxx&product_type_id=yyy` | Get plans for an operator | JWT + RateLimit |
| POST | `/purchase` | Purchase international airtime | JWT + RateLimit |
| POST | `/query` | Check transaction status | JWT + RateLimit |


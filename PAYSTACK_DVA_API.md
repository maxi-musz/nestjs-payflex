# Paystack Dedicated Virtual Account (DVA) API Documentation

## Overview

This document provides instructions on how to use the Paystack DVA endpoints to generate and manage dedicated virtual account numbers for your users. These accounts allow customers to fund their wallets via bank transfers.

## Base URL

```
Development: http://localhost:PORT
Production: https://yourdomain.com
```

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Endpoints

### 1. Create or Get Paystack Customer

Creates a Paystack customer record if it doesn't exist, or retrieves an existing one.

**Endpoint:** `POST /banking/paystack/create-customer`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{}
```
*Note: User information is automatically retrieved from the authenticated user's profile.*

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "email": "[email protected]",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+2348012345678",
    "customer_code": "CUS_xxxxxxxxxx",
    "integration": 123456,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/banking/paystack/create-customer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Important Notes:**
- This endpoint is usually called automatically when assigning a DVA
- The customer code is stored in the user's profile for future use
- User must have complete profile (first_name, last_name, email, phone_number)

---

### 2. Assign Dedicated Virtual Account

Assigns a dedicated virtual account number to the authenticated user.

**Endpoint:** `POST /banking/paystack/assign-dva`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "preferred_bank": "wema-bank",
  "country": "NG"
}
```

**Request Body Parameters:**
- `preferred_bank` (optional): Either `"wema-bank"` or `"paystack-titan"`. Default: `"wema-bank"`
- `country` (optional): Country code. Default: `"NG"`

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Dedicated virtual account assigned successfully",
  "data": {
    "id": "account-uuid",
    "account_number": "1234567890",
    "account_name": "John Doe",
    "bank_name": "Wema Bank",
    "bank_slug": "wema-bank",
    "currency": "NGN",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (User Already Has DVA - 200 OK):**
```json
{
  "success": true,
  "message": "User already has an active dedicated virtual account",
  "data": {
    "account_number": "1234567890",
    "account_name": "John Doe",
    "bank_name": "Wema Bank",
    "currency": "NGN",
    "isActive": true
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/banking/paystack/assign-dva \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferred_bank": "wema-bank",
    "country": "NG"
  }'
```

**Error Responses:**

**400 Bad Request - User Profile Incomplete:**
```json
{
  "success": false,
  "message": "User profile is incomplete. Please update your first name, last name, email, and phone number"
}
```

**400 Bad Request - Failed to Assign DVA:**
```json
{
  "success": false,
  "message": "Customer already has an active dedicated account"
}
```

---

### 3. Get User's Dedicated Virtual Account

Retrieves the authenticated user's dedicated virtual account details.

**Endpoint:** `GET /banking/paystack/my-dva`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Dedicated virtual account retrieved successfully",
  "data": {
    "id": "account-uuid",
    "account_number": "1234567890",
    "account_name": "John Doe",
    "bank_name": "Wema Bank",
    "currency": "NGN",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (No DVA Found - 200 OK):**
```json
{
  "success": false,
  "message": "No dedicated virtual account found. Please assign one first.",
  "data": null
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/banking/paystack/my-dva \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 4. Deactivate Dedicated Virtual Account

Deactivates the authenticated user's dedicated virtual account.

**Endpoint:** `DELETE /banking/paystack/deactivate-dva`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Dedicated virtual account deactivated successfully",
  "data": null
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "No active dedicated virtual account found"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/banking/paystack/deactivate-dva \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. List All Dedicated Virtual Accounts (Admin/Debug)

Lists all dedicated virtual accounts created on your Paystack account.

**Endpoint:** `GET /banking/paystack/list-all-dvas`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Dedicated virtual accounts retrieved successfully",
  "data": [
    {
      "bank": {
        "name": "Wema Bank",
        "id": 123,
        "slug": "wema-bank"
      },
      "account_name": "John Doe",
      "account_number": "1234567890",
      "assigned": true,
      "currency": "NGN",
      "active": true,
      "id": 123456,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/banking/paystack/list-all-dvas \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Usage Flow

### Typical User Flow

1. **User signs up and completes profile**
   - First name, last name, email, and phone number are required

2. **User requests a DVA**
   ```
   POST /banking/paystack/assign-dva
   ```
   - System automatically creates/gets Paystack customer if needed
   - System assigns a dedicated virtual account
   - User receives account number and bank details

3. **User makes payment**
   - User transfers money to their dedicated account number
   - Payment is automatically processed by Paystack
   - Webhook notifies your system (see webhook setup below)

4. **User checks their DVA details**
   ```
   GET /banking/paystack/my-dva
   ```

### Integration Example (JavaScript/Frontend)

```javascript
// Assign DVA to user
async function assignDVA(preferredBank = 'wema-bank') {
  const response = await fetch('http://localhost:3000/banking/paystack/assign-dva', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      preferred_bank: preferredBank,
      country: 'NG'
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('DVA assigned:', data.data.account_number);
    // Display account details to user
    displayAccountDetails(data.data);
  } else {
    console.error('Error:', data.message);
  }
}

// Get user's DVA
async function getMyDVA() {
  const response = await fetch('http://localhost:3000/banking/paystack/my-dva', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userToken}`,
    }
  });
  
  const data = await response.json();
  return data;
}
```

---

## Webhook Integration

When a customer makes a payment to their DVA, Paystack will send a webhook notification to your configured webhook URL.

### Webhook Setup

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **API Keys & Webhooks**
3. Add your webhook URL: `https://yourdomain.com/webhooks/paystack`
4. Select events:
   - `charge.success` (when payment is successful)

### Webhook Event: `charge.success`

When a payment is made to a DVA, you'll receive:

```json
{
  "event": "charge.success",
  "data": {
    "reference": "T1234567890",
    "amount": 1000000,
    "currency": "NGN",
    "status": "success",
    "customer": {
      "customer_code": "CUS_xxxxxxxxxx",
      "email": "[email protected]"
    },
    "authorization": {
      "receiver_bank_account_number": "1234567890",
      "receiver_bank": "Wema Bank",
      "account_name": "John Doe"
    }
  }
}
```

**Important:** You need to implement webhook handling in your `webhooks.controller.ts` or `webhooks.service.ts` to:
1. Verify the webhook signature
2. Update user's wallet balance
3. Create transaction history record
4. Handle idempotency (check if transaction already processed)

---

## Error Handling

### Common Error Codes

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 400 | User profile is incomplete | User missing required fields (name, email, phone) |
| 400 | Customer already has an active dedicated account | User already has a DVA assigned |
| 401 | Unauthorized | Invalid or missing JWT token |
| 404 | User not found | User doesn't exist in database |
| 404 | No active dedicated virtual account found | User has no active DVA |

---

## Environment Variables

Ensure these environment variables are set:

```env
# Paystack Keys
PAYSTACK_TEST_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYSTACK_LIVE_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# Node Environment
NODE_ENV=development  # or production
```

---

## Database Requirements

Before using these endpoints, ensure you've:

1. **Updated Prisma Schema:**
   - Added `paystack_customer_code` field to `User` model
   - Run migration: `npx prisma migrate dev --name add_paystack_customer_code`

2. **Run Migration:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **DVA Storage:**
   - DVA details are stored in the `Account` table
   - Metadata includes Paystack DVA ID for future reference

---

## Testing

### Test with Postman

1. **Set up environment:**
   - Base URL: `http://localhost:3000`
   - Token variable: `{{jwt_token}}`

2. **Assign DVA:**
   - Method: POST
   - URL: `{{base_url}}/banking/paystack/assign-dva`
   - Headers:
     - `Authorization: Bearer {{jwt_token}}`
     - `Content-Type: application/json`
   - Body:
     ```json
     {
       "preferred_bank": "wema-bank"
     }
     ```

3. **Get DVA:**
   - Method: GET
   - URL: `{{base_url}}/banking/paystack/my-dva`
   - Headers:
     - `Authorization: Bearer {{jwt_token}}`

---

## Support

For issues or questions:
- Check `paystack-DVA.md` for detailed integration guide
- Review Paystack API documentation: https://paystack.com/docs/api/dedicated-virtual-account/
- Contact Paystack support: https://support.paystack.com


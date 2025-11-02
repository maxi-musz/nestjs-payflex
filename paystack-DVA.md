# Paystack Dedicated Virtual Accounts (DVA) Integration Guide

## Overview

Dedicated Virtual Accounts (DVA) allow businesses to generate unique bank account numbers for their customers. Each customer gets a dedicated account number that they can use to make payments via bank transfers. When customers transfer funds to these accounts, payments are automatically processed and reflected in your Paystack dashboard.

This guide provides comprehensive instructions for integrating Paystack's Dedicated Virtual Accounts into your VTU application, enabling customers to fund their accounts for purchasing airtime, data, and other services.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Understanding DVAs](#understanding-dvas)
3. [API Endpoints](#api-endpoints)
4. [Implementation Steps](#implementation-steps)
5. [Webhook Integration](#webhook-integration)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Limitations & Considerations](#limitations--considerations)
9. [References](#references)

---

## Prerequisites

Before proceeding with the integration, ensure you have:

- ✅ A registered Paystack business account
- ✅ Your Paystack Secret Key (test or live depending on environment)
- ✅ Customer details for each user:
  - Full name (first_name and last_name)
  - Email address
  - Phone number
- ✅ Webhook endpoint configured to receive payment notifications
- ✅ Backend infrastructure to handle API calls and webhook events

### Getting Your Paystack Secret Key

1. Log in to your [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **API Keys & Webhooks**
3. Copy your **Secret Key** (use Test Secret Key for development, Live Secret Key for production)

---

## Understanding DVAs

### What is a Dedicated Virtual Account?

A Dedicated Virtual Account is a unique bank account number assigned to a specific customer. This account number:
- Is permanently assigned to the customer (until deactivated)
- Can receive payments from any bank in Nigeria
- Automatically processes incoming transfers
- Triggers webhook notifications when payments are received

### Supported Banks

Paystack currently supports DVAs from:
- **Wema Bank** (`wema-bank`)
- **Paystack Titan** (`paystack-titan`)

### Use Cases

- **VTU Services**: Allow customers to fund their accounts via bank transfer to purchase airtime, data, electricity, cable, etc.
- **Recurring Payments**: Customers can always send money to the same account number
- **Easy Fund Management**: No need for customers to generate new account numbers for each transaction

---

## API Endpoints

### Base URL

```
Production: https://api.paystack.co
Test: https://api.paystack.co (uses test keys)
```

### Authentication

All API requests require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_SECRET_KEY
```

### Headers

```
Content-Type: application/json
Authorization: Bearer YOUR_SECRET_KEY
```

---

## Implementation Steps

### Step 1: Create a Customer on Paystack

Before assigning a DVA, you need to create a customer record on Paystack. If the customer already exists, you can skip this step.

**Endpoint:** `POST /customer`

**Request:**

```bash
curl https://api.paystack.co/customer \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "[email protected]",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+2348012345678"
  }' \
  -X POST
```

**Request Body:**

```json
{
  "email": "[email protected]",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348012345678",
  "metadata": {
    "user_id": "12345",
    "custom_key": "custom_value"
  }
}
```

**Response (Success - 201 Created):**

```json
{
  "status": true,
  "message": "Customer created",
  "data": {
    "email": "[email protected]",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+2348012345678",
    "customer_code": "CUS_xxxxxxxxxx",
    "integration": 123456,
    "domain": "test",
    "identified": false,
    "identifications": null,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

**Important:** Save the `customer_code` (e.g., `CUS_xxxxxxxxxx`) as you'll need it in the next step.

**Response (Error - 400 Bad Request):**

```json
{
  "status": false,
  "message": "Customer email already exists"
}
```

---

### Step 2: Assign a Dedicated Virtual Account to the Customer

Once you have the customer_code, you can assign a DVA to the customer.

**Endpoint:** `POST /dedicated_account`

**Request:**

```bash
curl https://api.paystack.co/dedicated_account \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "CUS_xxxxxxxxxx",
    "preferred_bank": "wema-bank",
    "country": "NG"
  }' \
  -X POST
```

**Request Body:**

```json
{
  "customer": "CUS_xxxxxxxxxx",
  "preferred_bank": "wema-bank",
  "country": "NG"
}
```

**Parameters:**
- `customer` (required): The customer code obtained from Step 1
- `preferred_bank` (required): Either `"wema-bank"` or `"paystack-titan"`
- `country` (optional): Default is `"NG"` for Nigeria

**Response (Success - 200 OK):**

```json
{
  "status": true,
  "message": "Dedicated account created",
  "data": {
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
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z",
    "assignment": {
      "integration": 123456,
      "assignee_id": 789012,
      "assignee_type": "Customer",
      "expired": false,
      "account_type": "PAY-N-GO",
      "assigned_at": "2023-01-01T00:00:00.000Z",
      "expired_at": null
    }
  }
}
```

**Key Information to Store:**
- `account_number`: The virtual account number (share this with the customer)
- `account_name`: The account name (usually the customer's name)
- `bank.name`: The bank name
- `bank.slug`: The bank identifier
- `active`: Whether the account is active

**Response (Error - 400 Bad Request):**

```json
{
  "status": false,
  "message": "Customer already has an active dedicated account"
}
```

---

### Step 3: List All Dedicated Virtual Accounts

You can retrieve a list of all DVAs you've created.

**Endpoint:** `GET /dedicated_account`

**Request:**

```bash
curl https://api.paystack.co/dedicated_account \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -X GET
```

**Query Parameters:**
- `active`: Filter by active status (true/false)
- `currency`: Filter by currency (e.g., "NGN")
- `provider_slug`: Filter by bank provider (e.g., "wema-bank")
- `bank_id`: Filter by bank ID

**Example:**

```bash
curl "https://api.paystack.co/dedicated_account?active=true&currency=NGN" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -X GET
```

**Response (Success - 200 OK):**

```json
{
  "status": true,
  "message": "Dedicated accounts retrieved",
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
      "created_at": "2023-01-01T00:00:00.000Z",
      "updated_at": "2023-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "skipped": 0,
    "perPage": 50,
    "page": 1,
    "pageCount": 1
  }
}
```

---

### Step 4: Get a Specific Dedicated Virtual Account

Retrieve details for a specific DVA.

**Endpoint:** `GET /dedicated_account/:id`

**Request:**

```bash
curl https://api.paystack.co/dedicated_account/123456 \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -X GET
```

**Response (Success - 200 OK):**

```json
{
  "status": true,
  "message": "Dedicated account retrieved",
  "data": {
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
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z"
  }
}
```

---

### Step 5: Deactivate a Dedicated Virtual Account

If you need to deactivate a DVA (e.g., customer requests it or account is compromised).

**Endpoint:** `DELETE /dedicated_account/:id`

**Request:**

```bash
curl https://api.paystack.co/dedicated_account/123456 \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -X DELETE
```

**Response (Success - 200 OK):**

```json
{
  "status": true,
  "message": "Dedicated account deactivated",
  "data": null
}
```

---

### Step 6: Split Dedicated Virtual Account Payment

You can split payments received on a DVA with subaccounts.

**Endpoint:** `POST /dedicated_account/split`

**Request:**

```bash
curl https://api.paystack.co/dedicated_account/split \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "account_number": "1234567890",
    "split_code": "SPL_xxxxxxxxxx"
  }' \
  -X POST
```

---

## Webhook Integration

### Setting Up Webhooks

Webhooks notify your application when payments are made to a DVA. You need to:

1. Configure your webhook URL in the Paystack Dashboard
2. Handle incoming webhook events in your application
3. Verify webhook signatures for security

### Webhook Configuration

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **API Keys & Webhooks**
3. Add your webhook URL (e.g., `https://yourdomain.com/webhooks/paystack`)
4. Select the events you want to receive:
   - `charge.success`
   - `transfer.success`
   - `dedicatedaccount.assign` (when DVA is assigned)
   - `dedicatedaccount.update` (when DVA is updated)

### Webhook Events

#### Event: `charge.success`

Triggered when a payment is successfully made to a DVA.

**Payload:**

```json
{
  "event": "charge.success",
  "data": {
    "id": 1234567890,
    "domain": "live",
    "status": "success",
    "reference": "T1234567890",
    "amount": 1000000,
    "message": null,
    "gateway_response": "Successful",
    "paid_at": "2023-01-01T12:00:00.000Z",
    "created_at": "2023-01-01T12:00:00.000Z",
    "channel": "bank_transfer",
    "currency": "NGN",
    "ip_address": "197.210.xxx.xxx",
    "metadata": {
      "custom_fields": []
    },
    "log": null,
    "fees": null,
    "fees_split": null,
    "authorization": {
      "authorization_code": "AUTH_xxxx",
      "bin": null,
      "last4": null,
      "exp_month": null,
      "exp_year": null,
      "channel": "bank_transfer",
      "card_type": null,
      "bank": "Wema Bank",
      "country_code": "NG",
      "brand": null,
      "reusable": false,
      "signature": null,
      "account_name": "John Doe",
      "receiver_bank_account_number": "1234567890",
      "receiver_bank": "Wema Bank"
    },
    "customer": {
      "id": 123456,
      "first_name": "John",
      "last_name": "Doe",
      "email": "[email protected]",
      "customer_code": "CUS_xxxxxxxxxx",
      "phone": "+2348012345678",
      "metadata": null,
      "risk_action": "default"
    },
    "plan": {},
    "split": {},
    "order_id": null,
    "paidAt": "2023-01-01T12:00:00.000Z",
    "createdAt": "2023-01-01T12:00:00.000Z",
    "requested_amount": 1000000,
    "pos_transaction_data": null,
    "source": null,
    "fees_breakdown": null
  }
}
```

**Key Fields to Extract:**
- `data.reference`: Transaction reference
- `data.amount`: Amount in kobo (divide by 100 to get NGN)
- `data.customer.customer_code`: Customer code
- `data.authorization.receiver_bank_account_number`: DVA account number
- `data.status`: Transaction status

### Verifying Webhook Signatures

Always verify webhook signatures to ensure requests are from Paystack.

**Implementation Example:**

```javascript
const crypto = require('crypto');

function verifyPaystackSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}

// In your webhook handler
const signature = req.headers['x-paystack-signature'];
const isValid = verifyPaystackSignature(req.body, signature, process.env.PAYSTACK_SECRET_KEY);

if (!isValid) {
  return res.status(400).send('Invalid signature');
}
```

---

## Error Handling

### Common Error Codes

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 400 | Customer email already exists | Customer with this email already exists |
| 400 | Customer already has an active dedicated account | Customer already has a DVA assigned |
| 401 | Invalid API key | Secret key is invalid or expired |
| 404 | Dedicated account not found | DVA with specified ID doesn't exist |
| 422 | Validation error | Request body validation failed |

### Error Response Format

```json
{
  "status": false,
  "message": "Error description"
}
```

### Best Practices for Error Handling

1. **Always check response status**: Verify `status: true` before processing
2. **Handle duplicate customer errors**: Check if customer exists before creating
3. **Retry logic**: Implement retry for network errors (with exponential backoff)
4. **Logging**: Log all errors for debugging and monitoring
5. **User-friendly messages**: Translate API errors to user-friendly messages

---

## Best Practices

### 1. Customer Management

- **Reuse customers**: Check if a customer exists before creating a new one
- **Store customer codes**: Save Paystack customer codes in your database
- **Update customer info**: Keep customer information synchronized

### 2. DVA Management

- **One DVA per customer**: Paystack allows one active DVA per customer
- **Store DVA details**: Save account numbers, bank names, and status in your database
- **Handle deactivation**: Properly handle DVA deactivation requests

### 3. Payment Processing

- **Verify webhook signatures**: Always verify webhook requests are from Paystack
- **Handle idempotency**: Use transaction references to prevent duplicate processing
- **Update balances promptly**: Update customer balances immediately when payment is confirmed

### 4. Security

- **Never expose secret keys**: Keep secret keys in environment variables
- **Use HTTPS**: Always use HTTPS for webhook endpoints
- **Validate webhooks**: Verify all webhook requests before processing
- **Rate limiting**: Implement rate limiting on API endpoints

### 5. Database Design

Store the following information:
- Customer Paystack code (`CUS_xxxxxxxxxx`)
- DVA account number
- DVA bank name
- DVA active status
- DVA creation date
- Last payment date

---

## Limitations & Considerations

### Transaction Fees

- **Fee Structure**: Paystack charges **1% per transaction** to a DVA, **capped at NGN 300**
- **Example**: 
  - Transaction of NGN 1,000 = NGN 10 fee
  - Transaction of NGN 50,000 = NGN 300 fee (capped)
- **Settlement**: Amount minus fees is settled to your account

### Account Limits

- **Default Limit**: You can create up to **1,000 DVAs** by default
- **Increasing Limit**: Contact Paystack support to increase this limit
- **Deactivation**: Deactivated accounts still count towards your limit

### Processing Times

- **Instant**: Most DVA payments are processed instantly
- **Delayed**: Some payments may take a few minutes to reflect
- **Webhook Delivery**: Webhooks are usually delivered within seconds of payment

### Supported Banks

Currently, Paystack supports DVAs from:
- **Wema Bank** (`wema-bank`)
- **Paystack Titan** (`paystack-titan`)

### Currency

- Currently supports **NGN (Nigerian Naira)** only

### Customer Requirements

Each customer must have:
- Valid email address
- Full name (first_name and last_name)
- Phone number (format: +234xxxxxxxxxx)

---

## Implementation Checklist

Use this checklist when implementing DVA integration:

- [ ] Obtain Paystack Secret Key (test and live)
- [ ] Set up environment variables for API keys
- [ ] Create customer creation endpoint/service
- [ ] Implement DVA assignment endpoint/service
- [ ] Store customer codes and DVA details in database
- [ ] Set up webhook endpoint
- [ ] Implement webhook signature verification
- [ ] Handle `charge.success` webhook events
- [ ] Update customer balances on successful payment
- [ ] Implement error handling and logging
- [ ] Create API to retrieve customer's DVA details
- [ ] Implement DVA deactivation functionality
- [ ] Add transaction history logging
- [ ] Test with Paystack test keys
- [ ] Configure production webhook URL
- [ ] Monitor webhook delivery and errors

---

## Code Examples

### TypeScript/NestJS Example

```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class PaystackDvaService {
  private readonly paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(private prisma: PrismaService) {}

  async createCustomer(email: string, firstName: string, lastName: string, phone: string) {
    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/customer`,
        {
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        return response.data.data;
      }
      throw new HttpException(response.data.message, HttpStatus.BAD_REQUEST);
    } catch (error: any) {
      if (error.response?.data) {
        throw new HttpException(error.response.data.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to create customer', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async assignDva(customerCode: string, preferredBank: 'wema-bank' | 'paystack-titan' = 'wema-bank') {
    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/dedicated_account`,
        {
          customer: customerCode,
          preferred_bank: preferredBank,
          country: 'NG',
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        return response.data.data;
      }
      throw new HttpException(response.data.message, HttpStatus.BAD_REQUEST);
    } catch (error: any) {
      if (error.response?.data) {
        throw new HttpException(error.response.data.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to assign DVA', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleWebhook(payload: any, signature: string) {
    // Verify signature
    const isValid = this.verifySignature(payload, signature);
    if (!isValid) {
      throw new HttpException('Invalid webhook signature', HttpStatus.BAD_REQUEST);
    }

    // Handle charge.success event
    if (payload.event === 'charge.success') {
      const transaction = payload.data;
      const amount = transaction.amount / 100; // Convert from kobo to NGN
      const customerCode = transaction.customer.customer_code;
      const reference = transaction.reference;

      // Update customer balance in database
      await this.updateCustomerBalance(customerCode, amount, reference);
    }
  }

  private verifySignature(payload: any, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    return hash === signature;
  }

  private async updateCustomerBalance(customerCode: string, amount: number, reference: string) {
    // Find user by Paystack customer code
    const user = await this.prisma.user.findFirst({
      where: { paystack_customer_code: customerCode },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Update wallet balance
    await this.prisma.wallet.update({
      where: { user_id: user.id },
      data: {
        current_balance: { increment: amount },
        all_time_fuunding: { increment: amount },
      },
    });

    // Create transaction history
    await this.prisma.transactionHistory.create({
      data: {
        user_id: user.id,
        amount,
        transaction_type: 'deposit',
        description: 'DVA Payment',
        payment_method: 'bank_transfer',
        payment_channel: 'paystack_dva',
        status: 'success',
        transaction_reference: reference,
        createdAt: new Date(),
      },
    });
  }
}
```

---

## References

### Official Documentation

- [Paystack Dedicated Virtual Accounts Documentation](https://paystack.com/docs/payments/dedicated-virtual-accounts/)
- [Paystack API Reference - Dedicated Virtual Accounts](https://paystack.com/docs/api/dedicated-virtual-account/)
- [Paystack Customer API](https://paystack.com/docs/api/customer/)
- [Paystack Webhooks Documentation](https://paystack.com/docs/payments/webhooks/)

### Support Resources

- [Paystack Support Center](https://support.paystack.com)
- [Paystack Developer Community](https://developers.paystack.com)

### Related Features

- [Paystack Virtual Accounts (General)](https://paystack.com/docs/payments/virtual-accounts/)
- [Paystack Split Payments](https://paystack.com/docs/payments/split-payments/)

---

## Support

For issues or questions:

1. Check the [Paystack Documentation](https://paystack.com/docs)
2. Contact [Paystack Support](https://support.paystack.com)
3. Review API status at [Paystack Status Page](https://status.paystack.com)

---

**Last Updated:** 2024
**Documentation Version:** 1.0


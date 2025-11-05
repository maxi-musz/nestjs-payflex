# VTpass Webhook Setup Guide

## Overview

This guide explains how to properly set up VTpass webhooks for transaction status updates. VTpass sends webhooks when transactions that were initially "pending" get resolved (delivered, failed, or reversed).

## What Was Fixed

### Problem
The backend was treating **"TRANSACTION PROCESSING - PENDING"** responses as failures, when they should be treated as **intermediate processing states**. This caused:
- Premature refunds to users
- Transactions marked as failed when they were still processing
- Poor user experience

### Solution
Updated the status handling logic to properly recognize VTpass transaction states:

1. **Processing States** (keep as `pending`, don't refund):
   - Code `000` with status `pending` or `initiated`
   - Code `099` (TRANSACTION IS PROCESSING)
   - Response descriptions containing "PROCESSING" or "PENDING"

2. **Success State** (mark as `success`):
   - Code `000` with status `delivered`

3. **Failure States** (mark as `failed`, refund user):
   - Code `016` (TRANSACTION FAILED)
   - Code `000` with status `failed`

4. **Reversal States** (mark as `failed`, refund user):
   - Code `040` (TRANSACTION REVERSAL)
   - Status `reversed`

## VTpass Transaction Statuses

Based on VTpass documentation, here are all possible transaction statuses:

### Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| `000` | TRANSACTION PROCESSED | Check inner status (`pending`, `initiated`, `delivered`, `failed`) |
| `099` | TRANSACTION IS PROCESSING | Keep as pending, requery recommended |
| `016` | TRANSACTION FAILED | Mark as failed, refund user |
| `040` | TRANSACTION REVERSAL | Mark as failed, refund user |
| `001` | TRANSACTION QUERY | Status check result |
| `044` | TRANSACTION RESOLVED | Contact support for details |
| `091` | TRANSACTION NOT PROCESSED | Not charged, treat as no-op |

### Inner Status (when code is `000`)

| Status | Meaning | Action |
|--------|---------|--------|
| `initiated` | Transaction has been initiated | Keep as pending |
| `pending` | Transaction is pending | Keep as pending, requery or wait for webhook |
| `delivered` | Transaction successful | Mark as success |
| `failed` | Transaction failed | Mark as failed, refund user |
| `reversed` | Transaction reversed | Mark as failed, refund user |

## Webhook Setup

### 1. Configure Webhook URL in VTpass Dashboard

1. Log in to your VTpass dashboard at https://vtpass.com
2. Navigate to **Settings** → **API Settings** (or similar)
3. Set your **Callback URL** to:
   ```
   https://your-domain.com/webhook/vtpass
   ```
   For development:
   ```
   http://localhost:3000/webhook/vtpass
   ```

### 2. Webhook Endpoint Details

**Endpoint**: `POST /webhook/vtpass`

**Expected Response**: VTpass requires a JSON response with the key `response` and value `success`:
```json
{
  "response": "success"
}
```

**Retry Behavior**: VTpass will retry up to 5 times if they don't receive the expected response.

### 3. Webhook Payload Structure

VTpass sends webhooks with this structure:

```json
{
  "type": "transaction-update",
  "data": {
    "code": "000",
    "content": {
      "transactions": {
        "status": "delivered",
        "product_name": "MTN Data",
        "unique_element": "08146694787",
        "unit_price": 100,
        "quantity": 1,
        "transactionId": "17622706472916302778910890",
        "commission": 4,
        "total_amount": 96,
        "amount": 100
      }
    },
    "response_description": "TRANSACTION DELIVERED",
    "requestId": "202511041537t87w19vh",
    "amount": 100,
    "transaction_date": "2025-11-04T15:37:27.000000Z",
    "purchased_code": ""
  }
}
```

### 4. Webhook Types

Currently supported:
- `transaction-update`: Updates transaction status when pending transactions are resolved
- `variation-update`: Variation code updates (logged but not processed)

## Implementation Details

### Files Modified/Created

1. **`src/vtpass/data/data.service.ts`**
   - Fixed status handling for data purchases
   - Now properly handles pending/initiated states

2. **`src/vtpass/airtime/airtime.service.ts`**
   - Fixed status handling for airtime purchases
   - Same logic as data service

3. **`src/webhooks/vtpass-webhook/vtpass-webhook.service.ts`** (NEW)
   - Handles VTpass webhook events
   - Updates transaction status in database
   - Refunds users on failure/reversal

4. **`src/webhooks/vtpass-webhook/vtpass-webhook.module.ts`** (NEW)
   - Module for VTpass webhook service

5. **`src/webhooks/webhooks.controller.ts`**
   - Added `/webhook/vtpass` endpoint

6. **`src/webhooks/webhooks.service.ts`**
   - Added `handleVtpassEvent` method

7. **`src/webhooks/webhooks.module.ts`**
   - Added `VtpassWebhookModule` import

## Testing

### Test Pending Transaction Flow

1. Make a data/airtime purchase request
2. If VTpass returns `pending` status, the transaction should:
   - Be saved with status `pending` in database
   - NOT refund the user
   - Return a success response indicating transaction is processing
   - Wait for webhook to update final status

### Test Webhook

You can test the webhook endpoint using a tool like Postman or curl:

```bash
curl -X POST http://localhost:3000/webhook/vtpass \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transaction-update",
    "data": {
      "code": "000",
      "content": {
        "transactions": {
          "status": "delivered",
          "transactionId": "test123",
          "commission": 4,
          "amount": 100
        }
      },
      "response_description": "TRANSACTION DELIVERED",
      "requestId": "YOUR_REQUEST_ID_HERE",
      "amount": 100
    }
  }'
```

**Important**: Replace `YOUR_REQUEST_ID_HERE` with an actual `request_id` from a pending transaction in your database.

## Transaction Requery

For pending transactions, you can manually requery using the existing endpoint:

**Endpoint**: `POST /vtpass/data/requery` or `POST /vtpass/airtime/requery`

**Body**:
```json
{
  "request_id": "202511041537t87w19vh"
}
```

This is useful if:
- Webhook hasn't arrived after a reasonable time
- You need to check status manually
- Testing purposes

## Best Practices

1. **Always wait for webhooks**: Don't immediately requery after receiving a pending status. Give VTpass time to process.

2. **Handle timeouts gracefully**: If a transaction stays pending for too long (e.g., 24 hours), consider:
   - Requerying the transaction
   - Contacting VTpass support
   - Manually resolving based on your business logic

3. **Monitor webhook logs**: Check logs regularly to ensure webhooks are being received and processed correctly.

4. **Idempotency**: The webhook handler is idempotent - it's safe to receive the same webhook multiple times.

5. **Error handling**: If webhook processing fails, VTpass will retry. Make sure your endpoint is robust and returns the expected response format.

## Environment Variables

No additional environment variables are required for webhook functionality. The webhook endpoint uses the same VTpass credentials as the API calls.

## Troubleshooting

### Webhook not being received

1. Check that your callback URL is correctly configured in VTpass dashboard
2. Ensure your server is accessible from the internet (use ngrok for local testing)
3. Check firewall/security group settings
4. Verify the endpoint returns `{ "response": "success" }`

### Transactions stuck in pending

1. Use the requery endpoint to check current status
2. Check VTpass dashboard for transaction status
3. Contact VTpass support if transaction is stuck

### Webhook received but transaction not updated

1. Check application logs for errors
2. Verify the `requestId` in webhook matches a transaction in your database
3. Check database connection and transaction logs

## Support

For issues with:
- **VTpass API**: Contact VTpass support
- **Integration**: Check this documentation and code comments
- **Webhook issues**: Check VTpass dashboard webhook logs and your application logs


# Paystack Webhook Setup Guide

## 📍 Question 1: What is Your Webhook URL?

### Your Webhook Endpoint Path
Based on your code structure:
- **Base Path**: `/api/v1/webhook/paystack`
- **Method**: `POST`
- **Full Endpoint**: `POST /api/v1/webhook/paystack`

### Webhook URL Format

Your webhook URL will be:
```
https://yourdomain.com/api/v1/webhook/paystack
```

### Examples by Environment:

#### Development (Local):
```
http://localhost:3000/api/v1/webhook/paystack
```

#### Development (with ngrok):
```
https://your-ngrok-url.ngrok.io/api/v1/webhook/paystack
```

#### Staging:
```
https://staging.yourdomain.com/api/v1/webhook/paystack
```

#### Production:
```
https://api.yourdomain.com/api/v1/webhook/paystack
```
or
```
https://yourdomain.com/api/v1/webhook/paystack
```

---

## 🧪 Question 2: How to Test the Webhook?

### Option 1: Using ngrok (Recommended for Local Development)

#### Step 1: Install ngrok
```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

#### Step 2: Start your application
```bash
# Run your app locally (default port 3000)
npm run start:dev

# Or with Docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

#### Step 3: Start ngrok tunnel
```bash
ngrok http 3000
```

You'll get output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

#### Step 4: Use the ngrok URL
Your webhook URL will be:
```
https://abc123.ngrok.io/api/v1/webhook/paystack
```

**⚠️ Important:** Every time you restart ngrok, you'll get a new URL. For a permanent URL, use ngrok's paid plan.

### Option 2: Using Paystack Test Mode

#### Step 1: Get Test Webhook URL
1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **API Keys & Webhooks**
3. Scroll to **Test Webhooks** section
4. Use the webhook URL provided there for testing

#### Step 2: Test with Paystack Webhook Simulator
1. In Paystack Dashboard → **Settings** → **API Keys & Webhooks**
2. Scroll to **Test Webhooks**
3. Click **Send Test Event**
4. Select event type: `charge.success`
5. Paystack will send a test webhook to your URL

### Option 3: Manual Testing with cURL

```bash
# Test webhook locally
curl -X POST http://localhost:3000/api/v1/webhook/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: test-signature" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "TEST_REF_123",
      "amount": 100000,
      "status": "success",
      "customer": {
        "customer_code": "CUS_test123",
        "email": "[email protected]"
      },
      "channel": "bank_transfer",
      "authorization": {
        "receiver_bank_account_number": "1234567890",
        "receiver_bank": "Wema Bank",
        "account_name": "Test User"
      },
      "paid_at": "2024-01-01T12:00:00.000Z"
    }
  }'
```

### Option 4: Using Postman

1. **Method**: POST
2. **URL**: `http://localhost:3000/api/v1/webhook/paystack`
3. **Headers**:
   - `Content-Type: application/json`
   - `x-paystack-signature: test-signature`
4. **Body** (raw JSON):
```json
{
  "event": "charge.success",
  "data": {
    "reference": "TEST_REF_123",
    "amount": 100000,
    "status": "success",
    "customer": {
      "customer_code": "CUS_test123",
      "email": "[email protected]"
    },
    "channel": "bank_transfer",
    "authorization": {
      "receiver_bank_account_number": "1234567890",
      "receiver_bank": "Wema Bank",
      "account_name": "Test User"
    }
  }
}
```

### Check Logs

After sending a test webhook, check your application logs:
```bash
# Docker logs
docker compose logs -f api

# Or if running locally
# Check console output
```

You should see:
```
Processing Paystack event: charge.success
Processing DVA payment for reference: TEST_REF_123
✅ Successfully processed DVA payment
```

---

## 🔧 Question 3: Where to Configure Webhook URL in Paystack?

### Step-by-Step Configuration

#### Step 1: Log in to Paystack Dashboard
1. Go to [https://dashboard.paystack.com](https://dashboard.paystack.com)
2. Log in with your Paystack account credentials

#### Step 2: Navigate to Webhook Settings
1. Click on **Settings** in the left sidebar
2. Click on **API Keys & Webhooks**
3. Scroll down to the **Webhooks** section

#### Step 3: Add Webhook URL

##### For Test Mode:
1. In the **Test Webhooks** section
2. Click **Add Webhook URL**
3. Enter your webhook URL:
   ```
   https://yourdomain.com/api/v1/webhook/paystack
   ```
4. Select events you want to receive:
   - ✅ `charge.success` (Required for DVA payments)
   - ✅ `charge.failed`
   - ✅ `transfer.success`
   - ✅ `transfer.failed`
5. Click **Save**

##### For Live Mode:
1. In the **Live Webhooks** section
2. Click **Add Webhook URL**
3. Enter your production webhook URL:
   ```
   https://api.yourdomain.com/api/v1/webhook/paystack
   ```
4. Select the same events as above
5. Click **Save**

### Important Notes:

1. **HTTPS Required**: Paystack requires HTTPS for webhook URLs (except localhost for testing)
2. **Test vs Live**: Configure separate webhooks for test and live modes
3. **Multiple Webhooks**: You can add multiple webhook URLs
4. **Event Selection**: Make sure `charge.success` is selected for DVA payments

### Webhook Events You Need:

For DVA payments, you need at minimum:
- **`charge.success`** - When money is received in the DVA account
- **`charge.failed`** - If payment fails (optional but recommended)

---

## 🚀 Quick Setup Checklist

### Development Setup:
- [ ] Start your application locally (port 3000)
- [ ] Install and start ngrok: `ngrok http 3000`
- [ ] Copy ngrok URL: `https://abc123.ngrok.io`
- [ ] Add webhook in Paystack Test mode: `https://abc123.ngrok.io/api/v1/webhook/paystack`
- [ ] Select `charge.success` event
- [ ] Test with Paystack webhook simulator
- [ ] Check application logs for success

### Production Setup:
- [ ] Deploy your application to production
- [ ] Ensure HTTPS is enabled
- [ ] Get your production domain: `https://api.yourdomain.com`
- [ ] Add webhook in Paystack Live mode: `https://api.yourdomain.com/api/v1/webhook/paystack`
- [ ] Select all required events
- [ ] Test with a small real transaction
- [ ] Monitor logs and database

---

## 📝 Example Webhook Payload (DVA Payment)

When a customer sends money to their DVA account, Paystack will send:

```json
{
  "event": "charge.success",
  "data": {
    "id": 1234567890,
    "domain": "test",
    "status": "success",
    "reference": "T1234567890",
    "amount": 100000,
    "message": null,
    "gateway_response": "Successful",
    "paid_at": "2024-01-01T12:00:00.000Z",
    "created_at": "2024-01-01T12:00:00.000Z",
    "channel": "bank_transfer",
    "currency": "NGN",
    "ip_address": "197.210.xxx.xxx",
    "authorization": {
      "authorization_code": "AUTH_xxxx",
      "channel": "bank_transfer",
      "bank": "Wema Bank",
      "country_code": "NG",
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
      "phone": "+2348012345678"
    }
  }
}
```

Your webhook handler will:
1. ✅ Verify signature
2. ✅ Detect it's a DVA payment
3. ✅ Find user by customer_code
4. ✅ Update wallet balance
5. ✅ Create transaction record
6. ✅ Log success

---

## 🔍 Troubleshooting

### Webhook Not Received?

1. **Check ngrok is running**: `ngrok http 3000`
2. **Verify URL in Paystack**: Must match exactly
3. **Check HTTPS**: Production requires HTTPS
4. **Check logs**: `docker compose logs -f api`
5. **Test with curl**: See Option 3 above

### Signature Verification Failed?

1. **Check secret key**: Environment variable must be set
2. **Verify raw body**: Middleware preserves raw body for signature
3. **Check logs**: Should show signature verification status

### Payment Not Processing?

1. **Check customer_code**: User must have `paystack_customer_code` set
2. **Check wallet exists**: User must have a wallet
3. **Check logs**: Look for error messages
4. **Check database**: Verify transaction was created

---

## 📞 Support

For issues:
1. Check application logs
2. Check Paystack Dashboard → **Webhooks** → **Event Logs**
3. Verify webhook URL is accessible
4. Test with Paystack webhook simulator

---

**Last Updated**: 2024


# Paystack DVA Setup Summary

## ✅ What Has Been Implemented

1. **Service Layer** (`src/banking/paystack/paystack.service.ts`)
   - Create/Get Paystack customer
   - Assign Dedicated Virtual Account (DVA)
   - Get user's DVA
   - List all DVAs
   - Deactivate DVA

2. **Controller Layer** (`src/banking/paystack/paystack.controller.ts`)
   - 5 endpoints for DVA management

3. **DTOs** (`src/banking/paystack/dto/dva.dto.ts`)
   - Request validation for DVA operations

4. **Database Schema Update**
   - Added `paystack_customer_code` field to User model

## 🚀 Quick Start

### Step 1: Run Database Migration

```bash
npx prisma migrate dev --name add_paystack_customer_code
npx prisma generate
```

### Step 2: Set Environment Variables

Make sure these are in your `.env` file:

```env
PAYSTACK_TEST_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYSTACK_LIVE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NODE_ENV=development
```

### Step 3: Test the Endpoints

**Assign a DVA to a user:**
```bash
POST /banking/paystack/assign-dva
Headers: Authorization: Bearer JWT_TOKEN
Body: {
  "preferred_bank": "wema-bank",
  "country": "NG"
}
```

**Get user's DVA:**
```bash
GET /banking/paystack/my-dva
Headers: Authorization: Bearer JWT_TOKEN
```

## 📚 Documentation Files

1. **`PAYSTACK_DVA_API.md`** - Complete API documentation with examples
2. **`paystack-DVA.md`** - Detailed Paystack integration guide
3. **`PRISMA_SCHEMA_UPDATE.md`** - Schema migration instructions

## 🎯 Main Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/banking/paystack/create-customer` | POST | Create/Get Paystack customer |
| `/banking/paystack/assign-dva` | POST | Assign DVA to user |
| `/banking/paystack/my-dva` | GET | Get user's DVA |
| `/banking/paystack/deactivate-dva` | DELETE | Deactivate user's DVA |
| `/banking/paystack/list-all-dvas` | GET | List all DVAs (admin) |

## 🔄 Typical Usage Flow

1. User completes profile (name, email, phone)
2. Call `POST /banking/paystack/assign-dva` - System automatically creates customer if needed
3. User receives account number and bank details
4. User transfers money to the account
5. Webhook receives payment notification (you need to set this up)
6. User wallet is updated automatically

## ⚠️ Important Notes

- **User must have complete profile** (first_name, last_name, email, phone_number)
- **Each user can only have ONE active DVA** at a time
- **Webhook handling** needs to be implemented separately (see `PAYSTACK_DVA_API.md`)
- **DVA details** are stored in the `Account` table with `provider: 'paystack'` in metadata

## 📞 Next Steps

1. Run the Prisma migration
2. Test endpoints with Postman/Thunder Client
3. Implement webhook handler for `charge.success` events
4. Update user wallet balance when payment is received
5. Add transaction history records

For detailed API documentation, see `PAYSTACK_DVA_API.md`


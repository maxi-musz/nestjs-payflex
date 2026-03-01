# Wallet Funding (Paystack) — Frontend API Documentation

> **Version:** 1.0 &nbsp;|&nbsp; **Last Updated:** Feb 28, 2026

## Overview

This API enables users to fund their SmiPay wallet using Paystack (card payments). The flow is:

1. Frontend tells the backend how much the user wants to fund
2. Backend creates a pending transaction and returns a Paystack payment URL
3. Frontend redirects the user to Paystack to complete payment
4. User either **completes**, **cancels**, or **abandons** the payment
5. Frontend calls the appropriate backend endpoint to finalize the transaction status

**Base URL:** `/api/v1/banking`

**Authentication:** Every request requires a JWT token:

```
Authorization: Bearer <access_token>
```

---

## READ THIS FIRST — How Wallet Funding Works (Plain English)

### The happy path (user completes payment)

1. User taps "Fund Wallet" and enters ₦5,000
2. Your app calls `POST /banking/initialise-paystack-funding` with the amount
3. Backend creates a **pending** transaction in the DB and returns a Paystack `authorization_url`
4. Your app opens this URL (in a WebView, browser, or Paystack SDK)
5. User enters their card details on Paystack's page and pays
6. Paystack redirects the user back to your `callback_url`
7. Your app calls `POST /banking/verify-paystack-funding` with the `reference`
8. Backend verifies with Paystack API, credits the wallet, returns the new balance
9. You show "Wallet funded successfully!" with the new balance

### The cancel path (user clicks cancel on Paystack)

1. Steps 1–4 same as above
2. User clicks **"Cancel Payment"** on Paystack's page, or presses back
3. Paystack redirects back to your `callback_url` (or the WebView closes)
4. Your app detects the user came back without completing payment
5. Your app calls `POST /banking/verify-paystack-funding` with the `reference`
   - Backend checks with Paystack → status is `abandoned` → marks tx as `cancelled`
   - Returns `{ success: false, data: { status: "cancelled" } }`
6. You show "Payment cancelled" and dismiss the modal. **Done.**

**Alternative:** If you can detect the cancel immediately (e.g. WebView `onDismiss`, Paystack SDK `onCancel` callback), you can call `POST /banking/cancel-paystack-funding` directly — it's faster because it doesn't hit the Paystack API.

### The abandon path (user closes the app / loses network)

1. Steps 1–4 same as above
2. User closes the browser / app crashes / network drops
3. Frontend never calls verify or cancel
4. **No problem** — a background cron job runs every hour and cleans up stale pending transactions older than 2 hours by verifying them with Paystack. The transaction will be marked as `cancelled` automatically.

### Why do pending transactions matter?

A pending transaction means "we created a record that the user wants to fund, but we don't know if they paid yet." If it stays pending forever:
- The user sees a "processing" state that never resolves (bad UX)
- Transaction history is cluttered with ghost transactions
- It can confuse the user into thinking money was taken

That's why we have **three safety nets**: the verify endpoint (frontend-driven), the cancel endpoint (frontend-driven), and the hourly cron (backend-driven).

---

## Table of Contents

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | [Initialise Funding](#1-initialise-paystack-funding) | `POST` | Start a new wallet funding — get Paystack payment URL |
| 2 | [Verify Funding](#2-verify-paystack-funding) | `POST` | Check payment status and credit wallet if successful |
| 3 | [Cancel Funding](#3-cancel-paystack-funding) | `POST` | Mark a pending payment as cancelled |

---

## 1. Initialise Paystack Funding

Creates a pending transaction and returns a Paystack authorization URL for the user to complete payment.

```
POST /api/v1/banking/initialise-paystack-funding
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | **Yes** | Amount in Naira (e.g. `5000` for ₦5,000). Must be greater than 0. |
| `callback_url` | string | **Yes** | The URL Paystack should redirect to after payment (your app's deep link or web URL) |

### Request Example

```json
{
  "amount": 5000,
  "callback_url": "https://yourapp.com/wallet/funding/callback"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "New paystack wallet funding successfully initiated",
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123xyz",
    "reference": "7x8k2m9p4q",
    "amount": 5000,
    "email": "john@example.com"
  }
}
```

### Response Fields

| Field | Type | What to do with it |
|-------|------|--------------------|
| `authorization_url` | string | **Open this URL** — redirect the user here to complete payment. Use a WebView, Paystack SDK, or external browser. |
| `reference` | string | **Store this immediately.** You need it for verify and cancel. This is the Paystack transaction reference. |
| `amount` | number | The amount in ₦ — display as confirmation |
| `email` | string | The user's email — display as confirmation |

### Error Responses

```json
{ "success": false, "message": "User not found" }
```

```json
{ "success": false, "message": "Failed to initialize transaction" }
```

### Frontend Implementation

```javascript
async function initiateWalletFunding(token, amount, callbackUrl) {
  const response = await fetch('/api/v1/banking/initialise-paystack-funding', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, callback_url: callbackUrl }),
  });
  return await response.json();
}

// Usage:
const result = await initiateWalletFunding(userToken, 5000, 'yourapp://wallet/callback');

if (result.success) {
  // CRITICAL: Store the reference before redirecting
  await AsyncStorage.setItem('pending_funding_ref', result.data.reference);

  // Open Paystack payment page
  openPaystackUrl(result.data.authorization_url);
} else {
  showError(result.message);
}
```

> **CRITICAL:** Always store the `reference` before opening the Paystack URL. If the app crashes or the user navigates away, you need this reference to verify or cancel the payment later.

---

## 2. Verify Paystack Funding

Checks the payment status with Paystack and takes action:
- If **successful** → credits the user's wallet, returns the new balance
- If **abandoned** (user cancelled on Paystack) → marks the transaction as `cancelled`
- If **failed** → marks the transaction as `failed`
- If **already processed** → returns the existing result (idempotent)

**This is the primary endpoint to call when the user returns from Paystack, regardless of whether they completed or cancelled.**

```
POST /api/v1/banking/verify-paystack-funding
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reference` | string | **Yes** | The Paystack reference from the initialise response |

### Request Example

```json
{
  "reference": "7x8k2m9p4q"
}
```

### Success Response — Payment Completed (200)

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "id": "clx123-uuid",
    "amount": "₦5,000.00",
    "transaction_type": "deposit",
    "credit_debit": "credit",
    "description": "wallet funding",
    "status": "success",
    "payment_method": "paystack",
    "date": "28 Feb 2026",
    "balance_after": "₦15,000.00"
  }
}
```

### Response — Payment Already Processed (200)

If the payment was already verified (e.g. webhook beat you to it), you still get a success response:

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "id": "clx123-uuid",
    "amount": "₦5,000.00",
    "transaction_type": "deposit",
    "credit_debit": "credit",
    "description": "wallet funding",
    "status": "success",
    "payment_method": "paystack",
    "date": "28 Feb 2026",
    "balance_after": "₦15,000.00"
  }
}
```

### Response — Payment Cancelled / Abandoned (200)

When the user clicked "Cancel" on Paystack's page:

```json
{
  "success": false,
  "message": "Payment was cancelled.",
  "data": {
    "status": "cancelled"
  }
}
```

### Response — Payment Failed (200)

When Paystack reports a payment failure (card declined, etc.):

```json
{
  "success": false,
  "message": "Payment failed. Status: failed",
  "data": {
    "status": "failed"
  }
}
```

### Response — Transaction Already Verified as Success

```json
{
  "success": true,
  "message": "Transaction already verified",
  "data": {
    "id": "clx123-uuid",
    "amount": "₦5,000.00",
    "transaction_type": "deposit",
    "credit_debit": "credit",
    "description": "wallet funding",
    "status": "success",
    "payment_method": "paystack",
    "date": "28 Feb 2026"
  }
}
```

### Error Responses

```json
{ "success": false, "message": "Transaction reference is required" }
```

```json
{ "success": false, "message": "Transaction not found. Please check the reference and try again." }
```

```json
{ "success": false, "message": "Payment amount does not match transaction amount. Please contact support." }
```

### How to Handle Each Response

| `success` | `data.status` | What happened | Frontend action |
|-----------|---------------|---------------|-----------------|
| `true` | `"success"` | Payment completed, wallet credited | Show success screen with new `balance_after`, dismiss modal, refresh homepage |
| `false` | `"cancelled"` | User cancelled on Paystack | Show "Payment cancelled" message, dismiss modal, no balance change |
| `false` | `"failed"` | Payment failed (card issue, etc.) | Show "Payment failed" message, offer retry option |
| `false` | *(no data)* | Validation error | Show the `message` string to the user |

### Frontend Implementation

```javascript
async function verifyWalletFunding(token, reference) {
  const response = await fetch('/api/v1/banking/verify-paystack-funding', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reference }),
  });
  return await response.json();
}
```

---

## 3. Cancel Paystack Funding

Explicitly marks a pending payment as cancelled. Use this when you **know** the user cancelled without needing to check with Paystack (e.g. WebView dismissed, Paystack SDK `onCancel` fired).

This is **faster** than verify because it doesn't call Paystack's API — it just updates the DB directly.

**Idempotent** — safe to call multiple times for the same reference.

```
POST /api/v1/banking/cancel-paystack-funding
```

**Headers:** `Authorization: Bearer <token>` &nbsp;|&nbsp; `Content-Type: application/json`

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reference` | string | **Yes** | The Paystack reference from the initialise response |

### Request Example

```json
{
  "reference": "7x8k2m9p4q"
}
```

### Response — Successfully Cancelled (200)

```json
{
  "success": true,
  "message": "Payment cancelled successfully.",
  "data": {
    "status": "cancelled"
  }
}
```

### Response — Already Cancelled (200)

```json
{
  "success": true,
  "message": "Payment already cancelled.",
  "data": {
    "status": "cancelled"
  }
}
```

### Response — Already Completed (200)

If the user actually paid but your app thinks they cancelled (race condition with webhook):

```json
{
  "success": false,
  "message": "This payment has already been completed and cannot be cancelled."
}
```

> **Important:** If cancel returns this, you should call verify to get the full success response and update your UI accordingly.

### Response — Already Failed (200)

```json
{
  "success": true,
  "message": "Payment already failed.",
  "data": {
    "status": "failed"
  }
}
```

### Error Responses

```json
{ "success": false, "message": "Transaction reference is required." }
```

```json
{ "success": false, "message": "Transaction not found." }
```

### When to Use Cancel vs Verify

| Scenario | Use which endpoint | Why |
|----------|-------------------|-----|
| User returns from Paystack (any outcome) | **Verify** | Verify checks with Paystack API to know the real status — use this as your default |
| Paystack SDK fires `onCancel` callback | **Cancel** | You know for sure they cancelled — no need to call Paystack API |
| WebView `onDismiss` / `onClose` without callback URL hit | **Cancel** | User closed the payment page without completing |
| User taps "X" / back button on your funding modal BEFORE payment page loads | **Cancel** | Transaction was created but user never went to Paystack |
| Edge case: cancel returns "already completed" | **Verify** (as follow-up) | Webhook may have processed the payment — call verify to get the full details |

### Frontend Implementation

```javascript
async function cancelWalletFunding(token, reference) {
  const response = await fetch('/api/v1/banking/cancel-paystack-funding', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reference }),
  });
  return await response.json();
}
```

---

## 4. Complete Integration Flow

```
┌─────────────────────────────────────────┐
│  1. User taps "Fund Wallet"             │
│     Enters amount (e.g. ₦5,000)        │
│     Taps "Continue"                     │
└──────────┬──────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│  2. POST /initialise-paystack-funding   │
│     { amount: 5000,                     │
│       callback_url: "yourapp://cb" }    │
│                                         │
│     ← Store reference from response     │
│     ← Open authorization_url            │
└──────────┬──────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│  3. USER IS ON PAYSTACK PAGE            │
│     (You have NO control here)          │
│                                         │
│     Three possible outcomes:            │
│     A) User completes payment ──────────┼──→ Paystack redirects to callback_url
│     B) User clicks "Cancel" ────────────┼──→ Paystack redirects to callback_url
│     C) User closes browser/app ─────────┼──→ Nothing happens (cron cleans up)
└──────────┬──────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│  4. User returns to your app            │
│     (via callback_url or app resume)    │
│                                         │
│     POST /verify-paystack-funding       │
│     { reference: "stored_reference" }   │
└──────────┬──────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Handle verify response                                   │
│                                                              │
│  success: true, status: "success"                            │
│    → Show "Wallet funded! New balance: ₦15,000"             │
│    → Dismiss funding modal                                   │
│    → Refresh homepage data                                   │
│                                                              │
│  success: false, data.status: "cancelled"                    │
│    → Show "Payment cancelled"                                │
│    → Dismiss funding modal                                   │
│    → No balance change                                       │
│                                                              │
│  success: false, data.status: "failed"                       │
│    → Show "Payment failed"                                   │
│    → Offer "Try Again" button                                │
│                                                              │
│  success: false, no data.status                              │
│    → Show error message from response                        │
└─────────────────────────────────────────────────────────────┘
```

### Alternative Flow: Using Paystack SDK / WebView with Cancel Detection

If you're using the Paystack mobile SDK or a WebView that gives you `onCancel` / `onDismiss` callbacks:

```
┌─────────────────────────────────────────┐
│  Paystack SDK / WebView callbacks:      │
│                                         │
│  onSuccess(reference) ──────────────────┼──→ POST /verify-paystack-funding
│                                         │
│  onCancel() ────────────────────────────┼──→ POST /cancel-paystack-funding
│                                         │    (faster — skips Paystack API call)
│  onDismiss() / onClose() ──────────────┼──→ POST /cancel-paystack-funding
│                                         │
│  onError(error) ────────────────────────┼──→ POST /verify-paystack-funding
│                                         │    (let backend determine real status)
└─────────────────────────────────────────┘
```

---

## 5. Full Sample Integration (React Native / JavaScript)

```javascript
const BANKING_BASE = '/api/v1/banking';

const headers = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// ── Step 1: Initialise funding ──
async function startFunding(token, amount) {
  const callbackUrl = 'yourapp://wallet/funding/callback';

  const result = await fetch(`${BANKING_BASE}/initialise-paystack-funding`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ amount, callback_url: callbackUrl }),
  }).then(r => r.json());

  if (!result.success) {
    showError(result.message);
    return null;
  }

  // CRITICAL: Store reference before opening payment page
  savePendingReference(result.data.reference);

  return result.data;
}

// ── Step 2: Open Paystack payment page ──
// Option A: External browser / WebView
function openPaystackPage(authorizationUrl) {
  // React Native: use Linking or WebView
  // Web: window.location.href = authorizationUrl
  openUrl(authorizationUrl);
}

// Option B: Paystack SDK (recommended for mobile)
function openPaystackSDK(amount, email, reference, token) {
  PaystackSDK.open({
    amount: amount * 100, // Paystack SDK expects kobo
    email: email,
    reference: reference,
    onSuccess: async (ref) => {
      const result = await verifyFunding(token, ref.reference);
      handleVerifyResult(result);
    },
    onCancel: async () => {
      await cancelFunding(token, reference);
      showMessage('Payment cancelled');
      dismissFundingModal();
    },
  });
}

// ── Step 3: Verify payment (call when user returns) ──
async function verifyFunding(token, reference) {
  return await fetch(`${BANKING_BASE}/verify-paystack-funding`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ reference }),
  }).then(r => r.json());
}

// ── Step 4: Cancel payment (call on explicit cancel) ──
async function cancelFunding(token, reference) {
  return await fetch(`${BANKING_BASE}/cancel-paystack-funding`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ reference }),
  }).then(r => r.json());
}

// ── Step 5: Handle verify result ──
function handleVerifyResult(result) {
  clearPendingReference();

  if (result.success) {
    // Payment successful — wallet has been credited
    showSuccess({
      title: 'Wallet Funded!',
      message: `Your wallet has been credited. New balance: ${result.data.balance_after}`,
      amount: result.data.amount,
    });
    dismissFundingModal();
    refreshHomepage(); // Refresh to show new balance
    return;
  }

  // Payment not successful — check why
  const status = result.data?.status;

  if (status === 'cancelled') {
    showMessage('Payment cancelled');
    dismissFundingModal();
    return;
  }

  if (status === 'failed') {
    showError('Payment failed. Please try again.');
    // Optionally offer a "Try Again" button
    return;
  }

  // Other error (validation, not found, etc.)
  showError(result.message);
}

// ── Step 6: Handle app resume (catch edge cases) ──
// Call this when the app comes back to foreground
async function handleAppResume(token) {
  const pendingRef = getPendingReference();
  if (!pendingRef) return;

  // We have a pending funding — verify it
  const result = await verifyFunding(token, pendingRef);
  handleVerifyResult(result);
}
```

---

## 6. Edge Cases & What to Watch Out For

### Q: What if the user pays but the verify call fails (network error)?

Call verify again. It's idempotent — if the wallet was already credited (by webhook or a previous verify call), it returns the existing success result without double-crediting.

### Q: What if I call cancel but the user actually paid?

The cancel endpoint checks the current status. If the transaction is already `success`, it returns `{ success: false, message: "This payment has already been completed and cannot be cancelled." }`. If you get this, call verify to get the full details.

### Q: What if the user closes the app and never comes back?

The backend runs a cron job every hour that finds all pending Paystack deposits older than 2 hours, verifies them with Paystack's API, and marks them as `cancelled`/`failed`/`success` accordingly. No transaction stays pending forever.

### Q: Can I call verify multiple times?

Yes. It's fully idempotent. The first call that finds a `success` status will credit the wallet. All subsequent calls return the already-processed result.

### Q: What about the Paystack webhook — doesn't that also process payments?

Yes. The backend also has a Paystack webhook (`/webhooks/paystack`) that processes payments when Paystack sends a notification. The verify endpoint and webhook are both safe to run — they use an atomic compare-and-swap pattern that prevents double crediting. Think of verify as the frontend safety net, and the webhook as the backend safety net.

### Q: The user sees "Processing..." forever — how to fix?

This was the old bug. Now:
1. **On return from Paystack:** Always call verify — it will return `cancelled` or `failed` instead of leaving it as pending
2. **On explicit cancel:** Call cancel — it marks the tx as `cancelled` immediately
3. **As last resort:** The hourly cron catches anything that slipped through

---

## 7. Transaction Status Reference

| Status | Meaning | How it gets set |
|--------|---------|-----------------|
| `pending` | Transaction created, waiting for payment | Set on initialise |
| `success` | Payment completed, wallet credited | Set by verify, webhook, or cron |
| `cancelled` | User cancelled / abandoned the payment | Set by verify (Paystack `abandoned`), cancel endpoint, or cron |
| `failed` | Payment failed (card declined, etc.) | Set by verify (Paystack `failed`) or cron |

---

## Summary: All Endpoints

| Action | Endpoint | Method | When to call |
|--------|----------|--------|-------------|
| **Start funding** | `/banking/initialise-paystack-funding` | POST | User taps "Fund Wallet" and enters amount |
| **Verify funding** | `/banking/verify-paystack-funding` | POST | User returns from Paystack (any outcome), or on app resume with pending reference |
| **Cancel funding** | `/banking/cancel-paystack-funding` | POST | Paystack SDK `onCancel`, WebView dismissed, or user backs out before payment |

## Rate Limits

| Endpoint | IP Limit | Device Limit | Window |
|----------|----------|--------------|--------|
| Initialise | 10 req | 5 req | 1 hour |
| Verify | 20 req | 10 req | 1 hour |
| Cancel | 20 req | 10 req | 1 hour |

## Changelog

- **2026-02-28**: Full payment lifecycle support
  - Verify endpoint now handles Paystack `abandoned` status → marks tx as `cancelled` in DB
  - Verify endpoint now handles Paystack `failed` status → marks tx as `failed` in DB
  - New `POST /cancel-paystack-funding` endpoint for explicit cancellation
  - Hourly cron job cleans up stale pending deposits older than 2 hours
  - No Paystack deposit will remain `pending` forever, regardless of frontend behaviour

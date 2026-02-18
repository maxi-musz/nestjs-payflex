# PSS License Documentation for Smipay

> **Note:** This document outlines the capabilities, requirements, and roadmap for Smipay under a Payment Solution Service (PSS) license issued by the Central Bank of Nigeria (CBN).

---

## Section 1: What is a PSS License?

### Overview

A **Payment Solution Service (PSS) license** is a regulatory license issued by the Central Bank of Nigeria (CBN) that allows a company to operate as a full digital payment provider, similar to Paystack, Flutterwave, Moniepoint, and Interswitch.

### What a PSS License Permits

A PSS license gives permission to:

- Process electronic payments
- Connect directly to the banking system (NIBSS)
- Provide wallets and virtual accounts
- Power transfers, payouts, and collections
- Offer payment APIs to businesses
- Integrate with POS, billers, and merchants
- Provide value-added services (airtime, data, cable, etc.)

### Key Limitation

> **Important:** A PSS license does not allow you to hold customer deposits like a bank, but it allows you to move money and process payments safely and legally.

### Analogy

**PSS = "The engine behind Paystack/Flutterwave"** — It makes you an infrastructure company in the payment industry.

---

## Section 2: What Smipay Becomes With a Full PSS License

### Transformation

With a PSS license, Smipay transforms from a fintech startup into a fully regulated payment infrastructure company — similar to Paystack, Flutterwave, or Moniepoint's payment arm.

### What Smipay Becomes

#### 1. A Legally Recognized Payment Provider

- Approved by CBN
- Trusted by banks, partners, and merchants
- Able to operate nationally without restrictions

#### 2. A Wallet + Payment Infrastructure Company

- Can create wallets for users
- Can power transfers, payouts, and collections
- Can issue virtual accounts (via partner bank)

#### 3. A Bill Payment Aggregator

Smipay becomes a central platform for:

- Airtime & Data (all networks)
- Electricity (all DISCOs)
- Cable TV (DSTV, GOTV, Startimes, etc.)
- Betting top-up
- Government payments

#### 4. A Merchant Payment Platform

- Accept card payments
- Accept bank transfers
- Collect recurring payments
- Provide APIs for businesses

#### 5. A Fintech-as-a-Service Provider

You can expose APIs so other fintechs and apps can:

- Create wallets
- Send/receive money
- Buy utilities
- Build custom payment solutions

#### 6. A POS Network Operator (Optional but allowed)

Like Moniepoint or Opay, Smipay can operate POS terminals and agent banking.

### Summary

> **A PSS license positions Smipay as a full payment ecosystem, not just an app.**

---

## Section 3: What Smipay Can Do and Cannot Do With a PSS License

### ✅ What Smipay CAN Do

#### 1. Create Wallets for Users
- Store money, track balances, handle inflows/outflows

#### 2. Issue Virtual Accounts
- Through any partner bank (Providus, Wema, Sterling, etc.)

#### 3. Process Transfers & Payouts
- Send and receive money through NIBSS

#### 4. Power POS Terminals
- Run agents like Opay, Moniepoint, Baxi

#### 5. Offer Utility Bills & Digital Payments
- Airtime, data, electricity, cable TV, betting, education, taxes

#### 6. Provide Merchant Payment Services
Just like Paystack/Flutterwave:
- Accept card payments
- Accept bank transfers
- Accept USSD payments
- Provide payment links & checkout

#### 7. Integrate Directly With Companies
- Telcos, DISCOs, DSTV, Government bodies, Betting providers

#### 8. Expose APIs for Developers
- Fintech-as-a-service offering (FaaS)

#### 9. Operate Nationally Without Another License
- Except where CBN specifically requires more (e.g., Microfinance banking)

### ❌ What Smipay CANNOT Do (Even with Full PSS)

#### 1. Cannot Hold Deposits as a Bank
- You cannot be called a "bank" or treat wallets like bank accounts

#### 2. Cannot Issue Bank Cards Independently
- You must partner with a bank or card issuer (Visa/Mastercard/Verve)

#### 3. Cannot Offer Loans on Your Own Balance Sheet
You need:
- Microfinance license OR
- Lender partnership

#### 4. Cannot Take Customer Savings
- No savings interest products without additional licenses

#### 5. Cannot Create NUBAN Account Numbers Yourself
- You still need a partner bank for actual bank accounts

#### 6. Cannot Guarantee Funds Like NDIC
- You are not NDIC-insured

### Summary

> **A full PSS license gives Smipay full payment power, but not banking power.**

---

## Section 4: How Smipay Will Send & Receive Money + Best Banks to Partner With

### What Smipay Needs to Send & Receive Money

With a Full PSS License, Smipay must connect to the banking system through a **Settlement Bank + NIBSS connection**.

#### 1️⃣ Settlement Bank (MANDATORY)

This is the bank that will give Smipay:

- ✔ NUBAN virtual account issuance
- ✔ Settlement account (where all money flows in/out)
- ✔ NIP (transfer) credentials
- ✔ Compliance & reconciliations
- ✔ Support for virtual accounts per user

> **Without a settlement bank → you cannot run transfers or issue account numbers.**

#### 2️⃣ NIBSS Integration (MANDATORY)

NIBSS provides:

- ✔ Transfer rails (NIP)
- ✔ Name enquiry
- ✔ Transaction validation
- ✔ Dispute handling
- ✔ Bank code lookups

This is how Smipay connects to all Nigerian banks.

> **Note:** NIBSS does NOT give you account numbers; the bank does.

#### 3️⃣ Wallet Ledger System (YOUR BACKEND)

This is Smipay's internal engine:

- Tracks user balances
- Tracks inflows, outflows
- Handles hold, freeze, reverse
- Syncs with partner bank and NIBSS

This is fully built by your engineering team.

#### 4️⃣ Compliance Setup

Includes:

- KYC levels
- Transaction monitoring
- Fraud detection
- AML/CFT processes

You already cover this under PSS obligations.

### 🏦 Banks Smipay Can Partner With

These are all strong partners for:

- Virtual accounts
- NIP transfers
- Settlements
- POS
- Collections

#### All Partner Banks Smipay Can Use

1. Providus Bank
2. Wema Bank
3. Sterling Bank
4. Globus Bank
5. Zenith Bank
6. Access Bank
7. Fidelity Bank
8. FCMB
9. Keystone Bank
10. Unity Bank
11. Moniepoint MFB
12. VFD MFB
13. Rubies MFB

### 🥇 Top 5 Best Banks (Ranked)

#### 1. Providus Bank — BEST Overall

- Fastest settlement
- Very stable APIs
- Used by Opay, Chipper, Flutterwave, Brass
- Best for virtual accounts
- Strong support

#### 2. Wema Bank — BEST For Scale

- Very stable NIP
- Strong fintech partnerships
- Used by Kuda, Eyowo, Moniepoint (old days)

#### 3. Sterling Bank — BEST Compliance & Support

- Excellent documentation
- Strong engineering team
- Fast onboarding

#### 4. Globus Bank — BEST New Fintech-Friendly Bank

- Fast integration
- Good for startups
- Very responsive

#### 5. Fidelity Bank — Very Good

- Stable NIP
- Good for settlements
- Friendly to fintechs
- Medium-fast onboarding

### Summary

> **To send and receive money, Smipay needs: Settlement Bank + NIBSS Integration + Wallet Ledger. Top partner banks: Providus, Wema, Sterling, Globus, Fidelity.**

---

## Section 5: How Smipay User Account Details Will Look

### Important Clarification

With a PSS License, Smipay is **not a bank**, so users will receive virtual accounts issued by your partner bank, not Smipay directly.

> **User account details will always reflect the partner bank, not "Smipay".**

### How User Account Details Will Appear

#### 1️⃣ Account Name

- The user's real name
- Example: "John Emmanuel"
- No "Smipay" prefix
- No "Company Name / User Name" format

> **Note:** This only happens when using a VAS provider like Paystack or Moniepoint. But since Smipay has a PSS license, your users get direct accounts — fully in their own names.

#### 2️⃣ Account Number

- A standard NUBAN (10-digit number) issued by your partner bank
- Example: `0123456789`
- Every user gets a unique NUBAN

#### 3️⃣ Bank Name

This is always the partner settlement bank, not Smipay.

Examples:
- Providus Bank
- Wema Bank
- Sterling Bank
- Fidelity Bank
- Globus Bank

> **Your app will show:** Bank: Providus Bank (powered by Smipay) – optional subtitle.

### Summary

**Smipay user account details will be:**

- **Account Name:** User's real name
- **Account Number:** Bank-issued NUBAN
- **Bank Name:** Partner bank (e.g., Providus, Wema)

> **Smipay ≠ the bank.** Smipay provides the wallet + payment infrastructure, while the partner bank issues the NUBAN.

---

## Section 6: Direct Partnerships for Airtime, Data, Cable TV, Electricity, Betting, etc.

### The Power of a Full PSS License

A full PSS license gives Smipay the legal authority to integrate directly with:

- All Mobile Networks (MTN, Airtel, Glo, 9mobile)
- All Electricity DISCOs (Ikeja Electric, Eko, Abuja, Kaduna, etc.)
- All Cable TV providers (DSTV, GOTV, Startimes)
- All Betting companies (Bet9ja, SportyBet, BetKing, etc.)
- Government agencies (Remita-style integrations)

> **This is EXACTLY how Paystack, Flutterwave, Opay, and Moniepoint do it.**

### What Smipay Can Do Without Extra Licenses

#### 1️⃣ Airtime + Data (Telcos)

- Smipay can connect directly to MTN, Airtel, Glo, and 9mobile
- **No NCC license needed** because you are not becoming a telco
- You are only reselling airtime/data — fully covered under PSS

#### 2️⃣ Electricity (DISCOs)

Smipay can integrate with:

- Ikeja Electric
- Eko Electric
- AEDC
- KEDCO
- BEDC
- PHEDC
- And all DISCOs nationwide

You can sell tokens, receive meter info, validate meter numbers, etc.

#### 3️⃣ Cable TV

Smipay can integrate with:

- DSTV
- GOTV
- Startimes

You can validate smart cards, vend subscriptions, and check balances.

#### 4️⃣ Betting Companies

You can integrate directly with all betting platforms:

- Bet9ja
- SportyBet
- BetKing
- NairaBet
- BangBet
- MSport
- etc.

You can do:

- Wallet top-up
- Bet account validation
- Bonus awards
- Transaction confirmations

### Why This Is Possible

**Smipay's PSS license = Payment Switching + Processing + Solutions**

This gives the authority to:

- Move funds
- Collect funds
- Process merchant payments
- Integrate with financial & utility providers
- Act as a payment aggregator

> **You become the "Paystack" or "Flutterwave" for all service categories.**

### Summary

**With a PSS license, Smipay can directly partner with:**

- Telcos (Airtime, Data)
- DISCOs (Electricity)
- Cable TV providers
- Betting companies
- Government agencies

> **No additional NCC or industry licenses are required. Your PSS license covers all digital payment integrations.**

---

## Section 7: Smipay Priority Roadmap (What to Build First)

### The Simple, Professional Roadmap for Smipay

This is the exact sequence Paystack, Flutterwave, Opay, and Moniepoint followed.

### 🥇 1. Partner Bank + NUBAN Setup (Top Priority)

This is your foundation. You must:

- Pick your partner bank
- Sign settlement + virtual account agreement
- Get NIP/NIBSS credentials
- Receive API access
- Start issuing NUBAN accounts to users

> **Nothing else works without this step.**

### 🥈 2. Build the Wallet Ledger System (Your Core Engine)

This is Smipay's "internal bank".

Your team must build:

- User wallet balances
- Inflow posting
- Outflow posting
- Wallet → partner bank synchronization
- Freeze, hold, reverse, dispute functions
- KYC tier limits

> **All fintech operations depend on this wallet engine.**

### 🥉 3. Build Transfers & Payout Engine

This connects the wallet with the real banking world.

Includes:

- Send money (NIP)
- Receive money (virtual account deposits)
- Transaction monitoring
- Fraud checks
- Reconciliation with partner bank

> **This is what makes Smipay "move money."**

### 🏅 4. Build Bill Payments Hub (Airtime, Data, Electricity, Cable, Betting)

This turns Smipay into a real "utility super app".

Integrate with:

- Telcos
- DISCOs
- Cable TV platforms
- Betting companies

> **This step brings huge revenue & user engagement.**

### 🏅 5. Build Merchant Payment Infrastructure

Add:

- Payment links
- In-app checkout
- Card payments
- Bank transfer checkout
- Webhooks
- Merchant dashboard

> **This turns Smipay into: "The next Paystack."**

### 🏆 6. Build POS Network (Optional, but massive revenue)

If Smipay wants to compete like Opay or Moniepoint:

- Deploy POS terminals
- Build agent network
- Create agent wallet tiers
- Commission engine
- Settlement timeline engine

> **This step is optional but extremely profitable.**

### 🧱 7. Developer API Platform

This makes Smipay a fintech-as-a-service (FaaS) provider.

Provide:

- APIs for transfers
- Virtual accounts
- Bill pay
- Collections
- Webhooks
- API keys
- Portal for developers

> **This makes Smipay a platform, not just an app.**

### Summary

**Smipay Roadmap (Clear 7-Step Plan):**

1. Partner Bank + NUBAN
2. Wallet Ledger System
3. Transfers & Payout Engine
4. Bill Payments Hub
5. Merchant Payments
6. POS Network
7. Developer APIs

> **This roadmap guarantees Smipay becomes a full super-app + payment infrastructure provider.**

---

## Section 8: What Makes PSS License Powerful (Benefit Summary)

### The Core Benefits of PSS License

These are the exact reasons companies like Paystack, Flutterwave, Opay, and Interswitch run with the PSS license structure.

### 1️⃣ Direct NIBSS Access

Smipay can now:

- Send money
- Receive money
- Validate accounts (Name Enquiry)
- Do reversals
- Handle disputes
- Access all banks through switching

> **This is the backbone of Nigerian fintech.**

### 2️⃣ Work With ALL Telcos (Airtime + Data)

Your PSS license allows Smipay to directly integrate with:

- MTN
- Airtel
- Glo
- 9mobile

> **No NCC license needed.**

### 3️⃣ Work With ALL Electricity Companies (DISCOs)

Smipay can integrate with every electricity provider:

- Ikeja Electric
- Eko Electric
- AEDC
- BEDC
- KEDCO
- PHEDC
- Jos Electric
- Kano Electric

> **Just like BuyPower, Flutterwave, Opay, VTU apps.**

### 4️⃣ Work With ALL Cable TV Providers

Including:

- DSTV
- GOTV
- Startimes

You can validate decoder numbers, renew subscriptions, check balances, etc.

### 5️⃣ Work With ALL Betting Platforms

Smipay can integrate directly with:

- Bet9ja
- SportyBet
- BetKing
- NairaBet
- MSport

> **Just like Paystack does for betting merchants.**

### 6️⃣ Power POS Terminals

PSS allows Smipay to operate:

- POS terminals
- Agents
- Transaction switching
- Settlements
- POS reconciliation engine

> **This is how Moniepoint, Opay, Palmpay operate.**

### 7️⃣ Act as a Payment Switch

Smipay becomes a "mini Interswitch".

You can:

- Route transactions
- Process merchant payments
- Provide services to third-party apps
- Connect banks, fintechs, and merchants together

### 8️⃣ Offer Full Fintech APIs

Just like Paystack, Flutterwave, Moniepoint, Interswitch.

Smipay can expose:

- Wallet APIs
- Transfer APIs
- Virtual account APIs
- Bill pay APIs
- Merchant APIs

### Summary

**WHAT MAKES PSS LICENSE POWERFUL?**

- Direct NIBSS access
- Direct Telco integrations
- Direct DISCO access
- Direct Cable TV integrations
- Direct Betting integrations
- Ability to run POS network
- Ability to act as a payment switch
- Ability to offer fintech APIs
- CBN-approved trust + compliance

> **Smipay becomes a full payment infrastructure provider.**

---

## Section 9: Final Overview (Executive Summary)

### What Smipay Becomes

A CBN-licensed Payment Infrastructure Provider, capable of powering:

- Wallets
- Virtual accounts
- Transfers & payouts
- POS terminals
- Merchant payments
- Bill payments
- APIs for developers

> **Smipay becomes a Paystack + Opay + Flutterwave–level payment company.**

### What Smipay Can Do

- Process payments nationwide
- Integrate with banks through NIBSS
- Issue virtual account numbers via partner banks
- Provide utilities (airtime, data, electricity, cable TV, betting)
- Operate and manage POS terminals
- Serve merchants and agents
- Offer APIs to businesses

### What Smipay Cannot Do

- Cannot call itself a bank
- Cannot issue NUBAN accounts on its own
- Cannot take customer deposits like banks
- Cannot provide loans without extra licensing
- Cannot operate NDIC-insured accounts

### What Is Needed for Sending & Receiving Money

- One or more partner banks
- NUBAN issuance
- NIP/NIBSS integration
- Settlement accounts
- Reconciliation engine

**Top 3 partner banks:**

1. Providus Bank
2. Wema Bank
3. Sterling Bank

### What User Account Details Look Like

- **Account Name:** User's real name
- **Account Number:** NUBAN from partner bank
- **Bank Name:** Partner bank (e.g., Providus, Wema)

> **Smipay powers the infrastructure, but the bank provides the NUBAN.**

### Why PSS Is Powerful

- No NCC license needed for telcos
- No extra license for bills, cable, betting
- Full nationwide authority to process payments
- Allows Smipay to act like a switching company
- Business is legally backed by CBN
- High merchant trust
- Very high revenue potential

### Final Executive Summary

> **Smipay is now positioned to become a national payment infrastructure provider — like Paystack, Moniepoint, and Flutterwave — with full authority to power wallets, merchants, POS, APIs, and nationwide payments.**

---

## Section 10: KYC Verifications — What Smipay Can Access & How

### Overview

With a Full PSS License, Smipay is fully authorized to handle KYC and identity verification for its users. This is essential for compliance, fraud prevention, and regulatory requirements.

### 1️⃣ Direct KYC via Partner Bank / NIBSS

Smipay can directly verify bank account details for transfers and payouts:

- Account Name Enquiry (ANE)
- Bank Account Validation
- Transaction Verification

**How:** Through your partner bank's NIP API + NIBSS connection.

### 2️⃣ KYC via Licensed Aggregators

For all other identity verifications, Smipay integrates with licensed KYC providers:

| Verification Type | Aggregator / Provider Examples |
|------------------|--------------------------------|
| BVN | Dojah, Seamfix, SmileID, Youverify |
| NIN | SmileID, Dojah, Seamfix |
| V-NIN | SmileID, Dojah |
| TIN | Dojah, Prembly, Harmonize |
| Driver's License | Dojah, Youverify |
| Passport | Dojah, Youverify |
| CAC Lookup | CAC portal via Dojah, Prembly |
| FRSC / Vehicle Info | Dojah, Youverify |
| Address Verification | Dojah, Prembly |

> **Note:** Even top fintechs like Paystack, Moniepoint, Opay use aggregators for BVN, NIN, TIN, and other IDs.

### Key Takeaways

**Direct KYC:**
- Bank account verification is fully in-house via NIBSS and partner bank

**Aggregator KYC:**
- BVN, NIN, V-NIN, TIN, Passport, Driver's license, and CAC are handled through licensed third-party aggregators

**PSS License Advantage:**
- Smipay is recognized and trusted by banks and aggregators
- Easier onboarding with KYC providers
- Full compliance with CBN regulations

### Summary

**Smipay KYC Coverage:**

- **Direct:** Bank account verification (NIBSS + partner bank)
- **Via Aggregators:** BVN, NIN, V-NIN, TIN, CAC, Passport, Driver's License, Address

> **Result:** Smipay can securely onboard users and comply with all regulatory KYC requirements.

---

## Document Notes

### Changes Made During Formatting

1. **Removed duplicate Section 2** — The original document had Section 2 duplicated (lines 37-101 and 105-169). Kept only one version.

2. **Improved markdown structure:**
   - Converted all section headers to proper markdown headers (`#`, `##`, `###`)
   - Formatted lists with proper markdown syntax
   - Added proper spacing and line breaks
   - Converted emoji indicators to proper markdown formatting

3. **Enhanced readability:**
   - Added blockquotes for important notes and summaries
   - Formatted tables properly (Section 10)
   - Added horizontal rules (`---`) between major sections
   - Improved list formatting with proper indentation

4. **Content organization:**
   - Maintained all original content
   - Improved section flow and hierarchy
   - Added consistent formatting throughout

5. **Added document header:**
   - Added a title and description at the top
   - Added a "Document Notes" section at the end explaining changes

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-15  
**Status:** Formatted and ready for use

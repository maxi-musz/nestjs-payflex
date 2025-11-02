# Prisma Schema Update for Paystack DVA Integration

## Required Schema Changes

Add the following field to the `User` model in `prisma/schema.prisma`:

```prisma
model User {
  id String @id @default(uuid())

  first_name        String?
  last_name         String?
  cardholder_id     String?
  email             String           @unique
  smipay_tag        String?          @unique
  fourDigitPin      String?
  hash              String?
  phone_number      String?
  middle_name       String?
  referral_code     String?
  password          String?
  otp               String?
  otp_expires_at    DateTime?
  role              Role?            @default(user)
  gender            Gender?
  date_of_birth     DateTime?
  profile_image     ProfileImage?
  address           Address?
  is_email_verified Boolean          @default(false)
  agree_to_terms    Boolean          @default(false)
  updates_opt_in    Boolean          @default(false)
  is_phone_verified Boolean          @default(false)
  kyc_verification  KycVerification?
  wallet            Wallet?
  refreshToken      RefreshToken?
  paystack_customer_code String?     @unique  // ADD THIS LINE
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  accounts Account[] @relation("UserAccounts")
  cards    Card[]

  temp_flw_accts FlwTempAcctNumber[] @relation("generatedFlwAccts")
}
```

## Migration Steps

1. Add the field to the schema as shown above
2. Run the migration:
   ```bash
   npx prisma migrate dev --name add_paystack_customer_code
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

## Note

The `paystack_customer_code` field stores the Paystack customer code (e.g., `CUS_xxxxxxxxxx`) which is used to identify customers on Paystack's platform. This allows us to assign Dedicated Virtual Accounts to users without recreating customer records on each request.


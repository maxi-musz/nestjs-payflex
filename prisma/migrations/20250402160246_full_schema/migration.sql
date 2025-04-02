-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('transfer', 'deposit', 'airtime', 'data', 'cable', 'education', 'betting');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'success', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('ngn', 'usd', 'gbp', 'eur');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('paystack', 'card', 'bank_transfer', 'wallet', 'ussd');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('savings', 'current', 'investment');

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT NOT NULL,
    "hash" TEXT,
    "phone_number" TEXT,
    "password" TEXT,
    "otp" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "role" "Role" DEFAULT 'user',
    "gender" "Gender",
    "date_of_birth" TIMESTAMP(3),
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secure_url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,

    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "home_address" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionHistory" (
    "id" TEXT NOT NULL,
    "account_id" TEXT,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "transaction_type" "TransactionType",
    "description" TEXT,
    "status" "TransactionStatus" DEFAULT 'pending',
    "recipient_mobile" TEXT,
    "currency_type" "CurrencyType" DEFAULT 'ngn',
    "payment_method" "PaymentMethod" DEFAULT 'paystack',
    "fee" DOUBLE PRECISION DEFAULT 0.0,
    "transaction_number" TEXT,
    "transaction_reference" TEXT,
    "session_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SenderDetails" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_bank" TEXT NOT NULL,
    "sender_account_number" TEXT NOT NULL,

    CONSTRAINT "SenderDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionIcon" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "secure_url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,

    CONSTRAINT "TransactionIcon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "currency" "CurrencyType" NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileImage_userId_key" ON "ProfileImage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_key" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_userId_key" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "expires_at_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionHistory_transaction_reference_key" ON "TransactionHistory"("transaction_reference");

-- CreateIndex
CREATE UNIQUE INDEX "SenderDetails_transaction_id_key" ON "SenderDetails"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionIcon_transaction_id_key" ON "TransactionIcon"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "Account_account_number_key" ON "Account"("account_number");

-- AddForeignKey
ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenderDetails" ADD CONSTRAINT "SenderDetails_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "TransactionHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionIcon" ADD CONSTRAINT "TransactionIcon_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "TransactionHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


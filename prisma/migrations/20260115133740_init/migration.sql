-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "KycIdStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "KycIdType" AS ENUM ('NIGERIAN_BVN_VERIFICATION', 'NIGERIAN_NIN', 'NIGERIAN_INTERNATIONAL_PASSPORT', 'NIGERIAN_PVC', 'NIGERIAN_DRIVERS_LICENSE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'failed', 'rejected');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('not_started', 'pending', 'completed');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('transfer', 'deposit', 'airtime', 'data', 'cable', 'education', 'betting');

-- CreateEnum
CREATE TYPE "CreditDebit" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'success', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('ngn', 'usd', 'gbp', 'eur');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('paystack', 'card', 'bank_transfer', 'wallet', 'ussd');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('bank_transfer', 'smipay_tag', 'paystack', 'flutterwave', 'other');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('savings', 'current', 'investment');

-- CreateEnum
CREATE TYPE "BridgeCurrencyType" AS ENUM ('NGN', 'USD', 'GBP', 'EUR');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ios', 'android');

-- CreateEnum
CREATE TYPE "SupportType" AS ENUM ('REGISTRATION_ISSUE', 'LOGIN_ISSUE', 'TRANSACTION_ISSUE', 'PAYMENT_ISSUE', 'ACCOUNT_ISSUE', 'WALLET_ISSUE', 'CARD_ISSUE', 'KYC_VERIFICATION_ISSUE', 'SECURITY_ISSUE', 'FEATURE_REQUEST', 'BUG_REPORT', 'BILLING_ISSUE', 'REFUND_REQUEST', 'GENERAL_INQUIRY', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('pending', 'in_progress', 'waiting_user', 'resolved', 'closed', 'escalated');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

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
    "cardholder_id" TEXT,
    "email" TEXT,
    "smipay_tag" TEXT,
    "fourDigitPin" TEXT,
    "transactionPinHash" TEXT,
    "hash" TEXT,
    "phone_number" TEXT NOT NULL,
    "middle_name" TEXT,
    "is_friendly" BOOLEAN NOT NULL DEFAULT false,
    "referral_code" TEXT,
    "password" TEXT,
    "otp" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "role" "Role" DEFAULT 'user',
    "gender" "Gender",
    "date_of_birth" TIMESTAMP(3),
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "agree_to_terms" BOOLEAN NOT NULL DEFAULT false,
    "updates_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "paystack_customer_code" TEXT,
    "account_status" "AccountStatus" DEFAULT 'active',
    "password_attempts" INTEGER NOT NULL DEFAULT 0,
    "password_attempts_started_at" TIMESTAMP(3),
    "tier_id" TEXT,
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
    "house_number" TEXT,
    "postal_code" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "middle_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "nin" TEXT,
    "state_of_origin" TEXT,
    "lga_of_origin" TEXT,
    "state_of_residence" TEXT,
    "lga_of_residence" TEXT,
    "watchlisted" BOOLEAN NOT NULL DEFAULT false,
    "face_image" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "id_type" "KycIdType",
    "id_no" TEXT NOT NULL,
    "bvn" TEXT,
    "bvn_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "KycIdStatus",
    "bvn_verification_url" TEXT,
    "bvn_flw_reference" TEXT,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "failure_reason" TEXT,

    CONSTRAINT "KycVerification_pkey" PRIMARY KEY ("id")
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
    "vtpass_amount" DOUBLE PRECISION,
    "smipay_amount" DOUBLE PRECISION,
    "markup_percent" DOUBLE PRECISION,
    "markup_value" DOUBLE PRECISION,
    "transaction_type" "TransactionType",
    "credit_debit" "CreditDebit",
    "description" TEXT,
    "status" "TransactionStatus" DEFAULT 'pending',
    "recipient_mobile" TEXT,
    "currency_type" "CurrencyType" DEFAULT 'ngn',
    "payment_method" "PaymentMethod" DEFAULT 'paystack',
    "payment_channel" "PaymentChannel",
    "fee" DOUBLE PRECISION DEFAULT 0.0,
    "balance_before" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance_after" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transaction_number" TEXT,
    "transaction_reference" TEXT,
    "authorization_url" TEXT,
    "session_id" TEXT,
    "meta_data" JSONB DEFAULT '{}',
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
    "flw_response_code" TEXT,
    "flw_response_message" TEXT,
    "account_number" TEXT,
    "frequency" INTEGER,
    "note" TEXT,
    "accountType" "AccountType" DEFAULT 'savings',
    "currency" "CurrencyType",
    "bank_name" TEXT,
    "sort_code" TEXT,
    "routing_number" TEXT,
    "swift_code" TEXT,
    "country" TEXT,
    "iban" TEXT,
    "account_name" TEXT,
    "reference" TEXT,
    "order_ref" TEXT,
    "flutterwave_id" TEXT,
    "bank_code" TEXT,
    "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance_before" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance_after" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "account_status" TEXT DEFAULT 'active',
    "meta_data" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance_before" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance_after" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "all_time_fuunding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "all_time_withdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bridge_card_id" TEXT,
    "bridge_cardholder_id" TEXT DEFAULT 'null',
    "card_currency" "BridgeCurrencyType",
    "masked_pan" TEXT,
    "expiry_month" TEXT,
    "expiry_year" TEXT,
    "card_type" TEXT,
    "first_funding_amount" DOUBLE PRECISION,
    "card_limit" DOUBLE PRECISION,
    "current_balance" DOUBLE PRECISION,
    "balance_before" DOUBLE PRECISION,
    "transaction_reference" TEXT,
    "balance_after" DOUBLE PRECISION,
    "card_name" TEXT,
    "card_brand" TEXT,
    "card_last4" TEXT,
    "status" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlwTempAcctNumber" (
    "id" TEXT NOT NULL,
    "response_code" TEXT,
    "flw_ref" TEXT,
    "order_ref" TEXT,
    "order_no" TEXT,
    "account_number" TEXT,
    "accountStatus" TEXT,
    "frequency" INTEGER,
    "bank_name" TEXT,
    "note" TEXT,
    "amount" DOUBLE PRECISION,
    "status" TEXT,
    "meta_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "FlwTempAcctNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "device_id" TEXT,
    "app_version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "device_fingerprint" TEXT,
    "device_name" TEXT,
    "device_model" TEXT,
    "platform" "Platform" NOT NULL,
    "os_name" TEXT,
    "os_version" TEXT,
    "app_version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "is_current_device" BOOLEAN NOT NULL DEFAULT false,
    "last_ip_address" TEXT,
    "last_location" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restricted_at" TIMESTAMP(3),
    "restricted_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationProgress" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "total_steps" INTEGER NOT NULL DEFAULT 9,
    "step_1_status" "StepStatus" NOT NULL DEFAULT 'not_started',
    "step_2_status" "StepStatus" NOT NULL DEFAULT 'not_started',
    "step_3_status" "StepStatus" NOT NULL DEFAULT 'not_started',
    "step_4_status" "StepStatus" NOT NULL DEFAULT 'not_started',
    "step_5_status" "StepStatus" NOT NULL DEFAULT 'not_started',
    "step_6_status" "StepStatus" NOT NULL DEFAULT 'not_started',
    "step_7_status" "StepStatus" NOT NULL DEFAULT 'not_started',
    "step_8_status" "StepStatus" NOT NULL DEFAULT 'not_started',
    "step_9_status" "StepStatus" NOT NULL DEFAULT 'not_started',
    "registration_data" JSONB NOT NULL DEFAULT '{}',
    "referral_code" TEXT,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "id_verification_status" "VerificationStatus",
    "face_verification_status" "VerificationStatus",
    "otp" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "verification_attempts" INTEGER NOT NULL DEFAULT 0,
    "device_metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referee_phone_number" TEXT NOT NULL,
    "referee_user_id" TEXT,
    "referral_code_used" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reward_given" BOOLEAN NOT NULL DEFAULT false,
    "reward_amount" DECIMAL(10,2),
    "reward_given_at" TIMESTAMP(3),
    "registration_progress_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "phone_number" TEXT,
    "user_id" TEXT,
    "registration_progress_id" TEXT,
    "device_id" TEXT,
    "device_fingerprint" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution_notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "user_id" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "support_type" "SupportType" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'pending',
    "priority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "assigned_to" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution_notes" TEXT,
    "related_transaction_id" TEXT,
    "related_registration_progress_id" TEXT,
    "device_metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "tags" JSONB,
    "internal_notes" TEXT,
    "attachments" JSONB,
    "first_response_at" TIMESTAMP(3),
    "last_response_at" TIMESTAMP(3),
    "response_time_seconds" INTEGER,
    "satisfaction_rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "is_from_user" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT,
    "sender_name" TEXT,
    "sender_email" TEXT,
    "attachments" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tier" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "single_transaction_limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "daily_limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthly_limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "airtime_daily_limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaystackTransferRecipient" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipient_code" TEXT NOT NULL,
    "paystack_id" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'nuban',
    "name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "paystack_details" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaystackTransferRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_smipay_tag_key" ON "User"("smipay_tag");

-- CreateIndex
CREATE UNIQUE INDEX "User_paystack_customer_code_key" ON "User"("paystack_customer_code");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileImage_userId_key" ON "ProfileImage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_key" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KycVerification_userId_key" ON "KycVerification"("userId");

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
CREATE UNIQUE INDEX "Wallet_user_id_key" ON "Wallet"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_user_id_idx" ON "DeviceToken"("user_id");

-- CreateIndex
CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "UserDevice_user_id_idx" ON "UserDevice"("user_id");

-- CreateIndex
CREATE INDEX "UserDevice_device_id_idx" ON "UserDevice"("device_id");

-- CreateIndex
CREATE INDEX "UserDevice_is_active_idx" ON "UserDevice"("is_active");

-- CreateIndex
CREATE INDEX "UserDevice_is_restricted_idx" ON "UserDevice"("is_restricted");

-- CreateIndex
CREATE INDEX "UserDevice_last_seen_at_idx" ON "UserDevice"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_user_id_device_id_key" ON "UserDevice"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationProgress_phone_number_key" ON "RegistrationProgress"("phone_number");

-- CreateIndex
CREATE INDEX "RegistrationProgress_phone_number_idx" ON "RegistrationProgress"("phone_number");

-- CreateIndex
CREATE INDEX "RegistrationProgress_is_complete_idx" ON "RegistrationProgress"("is_complete");

-- CreateIndex
CREATE INDEX "RegistrationProgress_is_phone_verified_idx" ON "RegistrationProgress"("is_phone_verified");

-- CreateIndex
CREATE INDEX "Referral_referrer_id_idx" ON "Referral"("referrer_id");

-- CreateIndex
CREATE INDEX "Referral_referee_user_id_idx" ON "Referral"("referee_user_id");

-- CreateIndex
CREATE INDEX "Referral_referee_phone_number_idx" ON "Referral"("referee_phone_number");

-- CreateIndex
CREATE INDEX "Referral_is_active_idx" ON "Referral"("is_active");

-- CreateIndex
CREATE INDEX "Referral_reward_given_idx" ON "Referral"("reward_given");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referee_phone_number_referrer_id_key" ON "Referral"("referee_phone_number", "referrer_id");

-- CreateIndex
CREATE INDEX "SecurityEvent_event_type_idx" ON "SecurityEvent"("event_type");

-- CreateIndex
CREATE INDEX "SecurityEvent_event_category_idx" ON "SecurityEvent"("event_category");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_phone_number_idx" ON "SecurityEvent"("phone_number");

-- CreateIndex
CREATE INDEX "SecurityEvent_user_id_idx" ON "SecurityEvent"("user_id");

-- CreateIndex
CREATE INDEX "SecurityEvent_registration_progress_id_idx" ON "SecurityEvent"("registration_progress_id");

-- CreateIndex
CREATE INDEX "SecurityEvent_device_id_idx" ON "SecurityEvent"("device_id");

-- CreateIndex
CREATE INDEX "SecurityEvent_ip_address_idx" ON "SecurityEvent"("ip_address");

-- CreateIndex
CREATE INDEX "SecurityEvent_is_resolved_idx" ON "SecurityEvent"("is_resolved");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticket_number_key" ON "SupportTicket"("ticket_number");

-- CreateIndex
CREATE INDEX "SupportTicket_ticket_number_idx" ON "SupportTicket"("ticket_number");

-- CreateIndex
CREATE INDEX "SupportTicket_user_id_idx" ON "SupportTicket"("user_id");

-- CreateIndex
CREATE INDEX "SupportTicket_phone_number_idx" ON "SupportTicket"("phone_number");

-- CreateIndex
CREATE INDEX "SupportTicket_email_idx" ON "SupportTicket"("email");

-- CreateIndex
CREATE INDEX "SupportTicket_support_type_idx" ON "SupportTicket"("support_type");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_assigned_to_idx" ON "SupportTicket"("assigned_to");

-- CreateIndex
CREATE INDEX "SupportTicket_related_transaction_id_idx" ON "SupportTicket"("related_transaction_id");

-- CreateIndex
CREATE INDEX "SupportTicket_related_registration_progress_id_idx" ON "SupportTicket"("related_registration_progress_id");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_resolved_at_idx" ON "SupportTicket"("resolved_at");

-- CreateIndex
CREATE INDEX "SupportMessage_ticket_id_idx" ON "SupportMessage"("ticket_id");

-- CreateIndex
CREATE INDEX "SupportMessage_user_id_idx" ON "SupportMessage"("user_id");

-- CreateIndex
CREATE INDEX "SupportMessage_is_internal_idx" ON "SupportMessage"("is_internal");

-- CreateIndex
CREATE INDEX "SupportMessage_is_from_user_idx" ON "SupportMessage"("is_from_user");

-- CreateIndex
CREATE INDEX "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tier_tier_key" ON "Tier"("tier");

-- CreateIndex
CREATE INDEX "Tier_tier_idx" ON "Tier"("tier");

-- CreateIndex
CREATE INDEX "Tier_is_active_idx" ON "Tier"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackTransferRecipient_recipient_code_key" ON "PaystackTransferRecipient"("recipient_code");

-- CreateIndex
CREATE INDEX "PaystackTransferRecipient_user_id_idx" ON "PaystackTransferRecipient"("user_id");

-- CreateIndex
CREATE INDEX "PaystackTransferRecipient_recipient_code_idx" ON "PaystackTransferRecipient"("recipient_code");

-- CreateIndex
CREATE INDEX "PaystackTransferRecipient_account_number_idx" ON "PaystackTransferRecipient"("account_number");

-- CreateIndex
CREATE INDEX "PaystackTransferRecipient_active_idx" ON "PaystackTransferRecipient"("active");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackTransferRecipient_user_id_account_number_bank_code_key" ON "PaystackTransferRecipient"("user_id", "account_number", "bank_code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "Tier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenderDetails" ADD CONSTRAINT "SenderDetails_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "TransactionHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionIcon" ADD CONSTRAINT "TransactionIcon_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "TransactionHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlwTempAcctNumber" ADD CONSTRAINT "FlwTempAcctNumber_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referee_user_id_fkey" FOREIGN KEY ("referee_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaystackTransferRecipient" ADD CONSTRAINT "PaystackTransferRecipient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

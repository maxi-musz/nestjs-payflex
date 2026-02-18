-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM', 'WEBHOOK', 'CRON');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_REFRESH', 'TOKEN_REFRESH', 'PASSWORD_VERIFY', 'PASSWORD_VERIFY_FAILED', 'LOGIN_STATUS_CHECK', 'REGISTER_START', 'REGISTER_RESEND_OTP', 'REGISTER_VERIFY_OTP', 'REGISTER_SUBMIT_ID', 'REGISTER_SUBMIT_ADDRESS', 'REGISTER_SUBMIT_PEP', 'REGISTER_SUBMIT_INCOME', 'REGISTER_SETUP_PASSWORD', 'REGISTER_COMPLETE', 'MINIMAL_REGISTER', 'MINIMAL_LOGIN', 'EMAIL_OTP_REQUEST', 'EMAIL_OTP_VERIFY', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_VERIFY', 'PASSWORD_RESET_COMPLETE', 'PROFILE_VIEW', 'PROFILE_UPDATE', 'KYC_VIEW', 'KYC_UPDATE', 'TRANSACTION_PIN_SETUP', 'TRANSACTION_PIN_UPDATE', 'DASHBOARD_VIEW', 'HOMEPAGE_VIEW', 'FUND_WALLET_INIT', 'FUND_WALLET_VERIFY', 'FUND_WALLET_COMPLETE', 'VIRTUAL_ACCOUNT_CREATE', 'ACCOUNT_NUMBER_VERIFY', 'BANK_LIST_FETCH', 'DVA_CREATE', 'DVA_DEACTIVATE', 'DVA_VIEW', 'DVA_LIST', 'TRANSFER_INITIATE', 'TRANSFER_COMPLETE', 'TRANSFER_FAILED', 'SMIPAY_TAG_LOOKUP', 'SMIPAY_TAG_TRANSFER', 'PAYSTACK_TRANSFER_INITIATE', 'PAYSTACK_TRANSFER_COMPLETE', 'PAYSTACK_TRANSFER_FAILED', 'WALLET_CREDIT', 'WALLET_DEBIT', 'WALLET_BALANCE_CHECK', 'AIRTIME_PURCHASE', 'AIRTIME_PURCHASE_FAILED', 'AIRTIME_PROVIDERS_FETCH', 'DATA_PURCHASE', 'DATA_PURCHASE_FAILED', 'DATA_PLANS_FETCH', 'DATA_PROVIDERS_FETCH', 'CABLE_SMARTCARD_VERIFY', 'CABLE_PURCHASE', 'CABLE_PURCHASE_FAILED', 'CABLE_PROVIDERS_FETCH', 'CABLE_PLANS_FETCH', 'EDUCATION_PURCHASE', 'EDUCATION_PURCHASE_FAILED', 'ELECTRICITY_METER_VERIFY', 'ELECTRICITY_PURCHASE', 'ELECTRICITY_PURCHASE_FAILED', 'INSURANCE_PURCHASE', 'INSURANCE_PURCHASE_FAILED', 'BETTING_VALIDATE', 'BETTING_FUND', 'CARD_CREATE', 'CARD_LIST', 'CARD_FUND', 'CARD_FREEZE', 'CARD_UNFREEZE', 'CARD_TERMINATE', 'BVN_VERIFY', 'BVN_VERIFY_FAILED', 'NIN_VERIFY', 'NIN_VERIFY_FAILED', 'ID_VERIFY', 'ID_VERIFY_FAILED', 'SUPPORT_TICKET_CREATE', 'SUPPORT_TICKET_VIEW', 'SUPPORT_TICKET_UPDATE', 'SUPPORT_MESSAGE_ADD', 'DEVICE_TOKEN_REGISTER', 'DEVICE_TOKEN_REMOVE', 'NOTIFICATION_SEND', 'TIER_CREATE', 'TIER_UPDATE', 'TIER_LIST', 'USER_SUSPEND', 'USER_ACTIVATE', 'USER_VIEW', 'ADMIN_LOGIN', 'AUDIT_LOG_VIEW', 'AUDIT_LOG_FLAG', 'AUDIT_LOG_REVIEW', 'WEBHOOK_PAYSTACK', 'WEBHOOK_FLUTTERWAVE', 'WEBHOOK_VTPASS', 'CRON_TRANSACTION_REQUERY', 'CRON_KEEPALIVE', 'SYSTEM_ERROR', 'RATE_LIMIT_EXCEEDED', 'TRANSACTION_HISTORY_VIEW', 'TRANSACTION_DETAIL_VIEW');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('AUTHENTICATION', 'REGISTRATION', 'USER_MANAGEMENT', 'KYC_VERIFICATION', 'BANKING', 'TRANSFER', 'WALLET', 'AIRTIME', 'DATA', 'CABLE', 'EDUCATION', 'ELECTRICITY', 'INSURANCE', 'BETTING', 'CARD_MANAGEMENT', 'SUPPORT', 'NOTIFICATION', 'ADMIN', 'SYSTEM', 'WEBHOOK', 'TRANSACTION_HISTORY');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PENDING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "actor_type" "AuditActorType" NOT NULL DEFAULT 'USER',
    "actor_name" TEXT,
    "session_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "status" "AuditStatus" NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'LOW',
    "resource_type" TEXT,
    "resource_id" TEXT,
    "resource_name" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_id" TEXT,
    "device_model" TEXT,
    "platform" TEXT,
    "geo_location" TEXT,
    "http_method" TEXT,
    "endpoint" TEXT,
    "request_id" TEXT,
    "description" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB,
    "error_message" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "balance_before" DOUBLE PRECISION,
    "balance_after" DOUBLE PRECISION,
    "transaction_ref" TEXT,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagged_reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");

-- CreateIndex
CREATE INDEX "audit_logs_status_idx" ON "audit_logs"("status");

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_ip_address_idx" ON "audit_logs"("ip_address");

-- CreateIndex
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");

-- CreateIndex
CREATE INDEX "audit_logs_is_flagged_idx" ON "audit_logs"("is_flagged");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_transaction_ref_idx" ON "audit_logs"("transaction_ref");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_action_idx" ON "audit_logs"("user_id", "action");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_category_idx" ON "audit_logs"("user_id", "category");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_category_created_at_idx" ON "audit_logs"("category", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_status_idx" ON "audit_logs"("action", "status");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_created_at_idx" ON "audit_logs"("actor_type", "created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

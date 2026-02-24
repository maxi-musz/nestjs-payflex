-- CreateTable: DailyStats
CREATE TABLE "daily_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "transactions_count" INTEGER NOT NULL DEFAULT 0,
    "transactions_volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactions_success" INTEGER NOT NULL DEFAULT 0,
    "transactions_failed" INTEGER NOT NULL DEFAULT 0,
    "funded_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kyc_approved" INTEGER NOT NULL DEFAULT 0,
    "kyc_rejected" INTEGER NOT NULL DEFAULT 0,
    "cards_issued" INTEGER NOT NULL DEFAULT 0,
    "referrals_count" INTEGER NOT NULL DEFAULT 0,
    "markup_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "security_events" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_stats_date_key" ON "daily_stats"("date");
CREATE INDEX "daily_stats_date_idx" ON "daily_stats"("date");

-- CreateTable: SystemStats (singleton)
CREATE TABLE "system_stats" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "total_users" INTEGER NOT NULL DEFAULT 0,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "suspended_users" INTEGER NOT NULL DEFAULT 0,
    "total_wallet_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_active_cards" INTEGER NOT NULL DEFAULT 0,
    "open_tickets" INTEGER NOT NULL DEFAULT 0,
    "pending_tickets" INTEGER NOT NULL DEFAULT 0,
    "escalated_tickets" INTEGER NOT NULL DEFAULT 0,
    "pending_kyc" INTEGER NOT NULL DEFAULT 0,
    "flagged_audit_logs" INTEGER NOT NULL DEFAULT 0,
    "pending_transactions" INTEGER NOT NULL DEFAULT 0,
    "tier_distribution" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_stats_pkey" PRIMARY KEY ("id")
);

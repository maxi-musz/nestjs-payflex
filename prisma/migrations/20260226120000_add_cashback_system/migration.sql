-- CreateEnum
CREATE TYPE "CashbackServiceType" AS ENUM ('airtime', 'data', 'cable', 'electricity', 'education', 'betting', 'international_airtime');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'CASHBACK_CONFIG_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'CASHBACK_RULE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'CASHBACK_RULE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'CASHBACK_RULE_DELETE';

-- AlterEnum
ALTER TYPE "PermissionResource" ADD VALUE 'CASHBACK';

-- CreateTable
CREATE TABLE "cashback_config" (
    "id" TEXT NOT NULL DEFAULT 'cashback_config',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "default_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_cashback_per_transaction" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "max_cashback_per_day" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "min_transaction_amount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "updated_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashback_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_rules" (
    "id" TEXT NOT NULL,
    "service_type" "CashbackServiceType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_cashback_amount" DOUBLE PRECISION,
    "min_transaction_amount" DOUBLE PRECISION,
    "updated_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashback_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "all_time_earned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "all_time_withdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashback_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "service_type" "CashbackServiceType" NOT NULL,
    "transaction_ref" TEXT NOT NULL,
    "percentage_applied" DOUBLE PRECISION NOT NULL,
    "source_amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'credited',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashback_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cashback_rules_service_type_key" ON "cashback_rules"("service_type");

-- CreateIndex
CREATE UNIQUE INDEX "cashback_wallets_user_id_key" ON "cashback_wallets"("user_id");

-- CreateIndex
CREATE INDEX "cashback_history_user_id_idx" ON "cashback_history"("user_id");

-- CreateIndex
CREATE INDEX "cashback_history_transaction_ref_idx" ON "cashback_history"("transaction_ref");

-- AddForeignKey
ALTER TABLE "cashback_wallets" ADD CONSTRAINT "cashback_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

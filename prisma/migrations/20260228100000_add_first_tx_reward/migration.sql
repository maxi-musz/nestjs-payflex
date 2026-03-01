-- AlterEnum: add first_tx_bonus to TransactionType
ALTER TYPE "TransactionType" ADD VALUE 'first_tx_bonus';

-- AlterEnum: add FIRST_TX_REWARD_CONFIG_UPDATE to AuditAction
ALTER TYPE "AuditAction" ADD VALUE 'FIRST_TX_REWARD_CONFIG_UPDATE';

-- AlterEnum: add FIRST_TX_REWARD to PermissionResource
ALTER TYPE "PermissionResource" ADD VALUE 'FIRST_TX_REWARD';

-- CreateTable: first_tx_reward_config (single-row config)
CREATE TABLE "first_tx_reward_config" (
    "id" TEXT NOT NULL DEFAULT 'first_tx_reward_config',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "reward_amount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "min_transaction_amount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "eligible_transaction_types" JSONB NOT NULL DEFAULT '["airtime","data","transfer","deposit","cable","electricity","education","betting"]',
    "budget_limit" DOUBLE PRECISION,
    "max_recipients" INTEGER,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "require_kyc" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "first_tx_reward_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable: first_tx_reward_history (one row per user, ever)
CREATE TABLE "first_tx_reward_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reward_amount" DOUBLE PRECISION NOT NULL,
    "transaction_ref" TEXT NOT NULL,
    "source_transaction_ref" TEXT NOT NULL,
    "source_transaction_type" TEXT NOT NULL,
    "source_amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "first_tx_reward_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique user_id (one reward per user)
CREATE UNIQUE INDEX "first_tx_reward_history_user_id_key" ON "first_tx_reward_history"("user_id");

-- CreateIndex: unique transaction_ref
CREATE UNIQUE INDEX "first_tx_reward_history_transaction_ref_key" ON "first_tx_reward_history"("transaction_ref");

-- CreateIndex: lookup indexes
CREATE INDEX "first_tx_reward_history_user_id_idx" ON "first_tx_reward_history"("user_id");
CREATE INDEX "first_tx_reward_history_transaction_ref_idx" ON "first_tx_reward_history"("transaction_ref");
CREATE INDEX "first_tx_reward_history_createdAt_idx" ON "first_tx_reward_history"("createdAt");

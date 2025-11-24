-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tier_id" TEXT;

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

-- CreateIndex
CREATE UNIQUE INDEX "Tier_tier_key" ON "Tier"("tier");

-- CreateIndex
CREATE INDEX "Tier_tier_idx" ON "Tier"("tier");

-- CreateIndex
CREATE INDEX "Tier_is_active_idx" ON "Tier"("is_active");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "Tier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `reward_amount` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `reward_given` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `reward_given_at` on the `Referral` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'eligible', 'rewarded', 'partially_rewarded', 'expired', 'rejected');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_ROLE_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'USER_TIER_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_CONFIG_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_MANUAL_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_MANUAL_REJECT';

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'referral_bonus';

-- DropIndex
DROP INDEX "Referral_reward_given_idx";

-- AlterTable
ALTER TABLE "Referral" DROP COLUMN "reward_amount",
DROP COLUMN "reward_given",
DROP COLUMN "reward_given_at",
ADD COLUMN     "manually_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manually_approved_by" TEXT,
ADD COLUMN     "manually_rejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referee_first_tx" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referee_first_tx_at" TIMESTAMP(3),
ADD COLUMN     "referee_kyc_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referee_registered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referee_registered_at" TIMESTAMP(3),
ADD COLUMN     "referee_reward_amount" DOUBLE PRECISION,
ADD COLUMN     "referee_reward_given" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referee_reward_given_at" TIMESTAMP(3),
ADD COLUMN     "referee_reward_tx_ref" TEXT,
ADD COLUMN     "referrer_reward_amount" DOUBLE PRECISION,
ADD COLUMN     "referrer_reward_given" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referrer_reward_given_at" TIMESTAMP(3),
ADD COLUMN     "referrer_reward_tx_ref" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "status" "ReferralStatus" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "ReferralConfig" (
    "id" TEXT NOT NULL DEFAULT 'referral_config',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "referrer_reward_amount" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "referee_reward_amount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "reward_trigger" TEXT NOT NULL DEFAULT 'first_transaction',
    "max_referrals_per_user" INTEGER NOT NULL DEFAULT 50,
    "referral_expiry_days" INTEGER NOT NULL DEFAULT 90,
    "min_transaction_amount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "updated_by" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_referrer_reward_given_idx" ON "Referral"("referrer_reward_given");

-- CreateIndex
CREATE INDEX "Referral_referee_reward_given_idx" ON "Referral"("referee_reward_given");

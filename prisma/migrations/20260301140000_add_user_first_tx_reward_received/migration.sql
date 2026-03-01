-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "first_tx_reward_received" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: set true for any user who already has a row in FirstTxRewardHistory
UPDATE "User"
SET "first_tx_reward_received" = true
WHERE id IN (SELECT user_id FROM "first_tx_reward_history");

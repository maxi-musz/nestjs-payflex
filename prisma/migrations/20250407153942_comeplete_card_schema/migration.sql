/*
  Warnings:

  - You are about to drop the column `balance` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Card` table. All the data in the column will be lost.
  - The `card_type` column on the `Card` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `Card` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Card" DROP COLUMN "balance",
DROP COLUMN "currency",
ADD COLUMN     "balance_after" DOUBLE PRECISION,
ADD COLUMN     "balance_before" DOUBLE PRECISION,
ADD COLUMN     "card_brand" TEXT,
ADD COLUMN     "card_currency" "BridgeCurrencyType",
ADD COLUMN     "card_last4" TEXT,
ADD COLUMN     "card_name" TEXT,
ADD COLUMN     "current_balance" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "bridge_card_id" DROP NOT NULL,
ALTER COLUMN "masked_pan" DROP NOT NULL,
ALTER COLUMN "expiry_month" DROP NOT NULL,
ALTER COLUMN "expiry_year" DROP NOT NULL,
ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "is_active" SET DEFAULT true,
ALTER COLUMN "metadata" DROP NOT NULL,
DROP COLUMN "card_type",
ADD COLUMN     "card_type" TEXT;

-- AlterTable
ALTER TABLE "TransactionHistory" ADD COLUMN     "balance_after" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "balance_before" DOUBLE PRECISION NOT NULL DEFAULT 0;

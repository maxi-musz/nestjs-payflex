-- AlterTable
ALTER TABLE "TransactionHistory" ADD COLUMN     "cashback_balance_after" DOUBLE PRECISION,
ADD COLUMN     "cashback_balance_before" DOUBLE PRECISION,
ADD COLUMN     "cashback_earned" DOUBLE PRECISION,
ADD COLUMN     "cashback_used" DOUBLE PRECISION;

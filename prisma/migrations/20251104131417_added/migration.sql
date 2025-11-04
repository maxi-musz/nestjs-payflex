-- AlterTable
ALTER TABLE "TransactionHistory" ADD COLUMN     "markup_percent" DOUBLE PRECISION,
ADD COLUMN     "markup_value" DOUBLE PRECISION,
ADD COLUMN     "smipay_amount" DOUBLE PRECISION,
ADD COLUMN     "vtpass_amount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_friendly" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('bank_transfer', 'smipay_tag', 'paystack', 'flutterwave', 'other');

-- AlterTable
ALTER TABLE "TransactionHistory" ADD COLUMN     "payment_channel" "PaymentChannel";

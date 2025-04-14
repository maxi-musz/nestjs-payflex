-- CreateEnum
CREATE TYPE "CreditDebit" AS ENUM ('credit', 'debit');

-- AlterTable
ALTER TABLE "TransactionHistory" ADD COLUMN     "credit_debit" "CreditDebit";

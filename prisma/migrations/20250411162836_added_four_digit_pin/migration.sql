/*
  Warnings:

  - You are about to drop the column `fourDigitPin` on the `TransactionHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TransactionHistory" DROP COLUMN "fourDigitPin";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fourDigitPin" TEXT;

/*
  Warnings:

  - You are about to drop the column `balance` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "balance",
ADD COLUMN     "balance_after" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "balance_before" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0;

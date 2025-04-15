/*
  Warnings:

  - Added the required column `order_no` to the `FlwTempAcctNumber` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FlwTempAcctNumber" ADD COLUMN     "order_no" TEXT NOT NULL;

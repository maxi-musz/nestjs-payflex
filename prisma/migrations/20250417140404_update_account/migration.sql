/*
  Warnings:

  - Added the required column `account_name` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "account_name" TEXT NOT NULL;

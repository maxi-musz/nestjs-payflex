/*
  Warnings:

  - Added the required column `bridge_cardholder_id` to the `Card` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "bridge_cardholder_id" TEXT NOT NULL;

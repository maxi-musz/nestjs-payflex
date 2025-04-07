/*
  Warnings:

  - Changed the type of `card_type` on the `Card` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BridgeCurrencyType" AS ENUM ('NGN', 'USD', 'GBP', 'EUR');

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "card_type",
ADD COLUMN     "card_type" "BridgeCurrencyType" NOT NULL;

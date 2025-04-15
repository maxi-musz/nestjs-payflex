/*
  Warnings:

  - The `frequency` column on the `FlwTempAcctNumber` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "FlwTempAcctNumber" DROP COLUMN "frequency",
ADD COLUMN     "frequency" INTEGER;

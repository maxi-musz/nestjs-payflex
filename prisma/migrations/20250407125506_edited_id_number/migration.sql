/*
  Warnings:

  - You are about to drop the column `verification_d` on the `KycVerification` table. All the data in the column will be lost.
  - Added the required column `id_no` to the `KycVerification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KycVerification" DROP COLUMN "verification_d",
ADD COLUMN     "id_no" TEXT NOT NULL;

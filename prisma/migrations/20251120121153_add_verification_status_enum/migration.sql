/*
  Warnings:

  - The `id_verification_status` column on the `RegistrationProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `face_verification_status` column on the `RegistrationProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'failed', 'rejected');

-- AlterTable
ALTER TABLE "RegistrationProgress" DROP COLUMN "id_verification_status",
ADD COLUMN     "id_verification_status" "VerificationStatus",
DROP COLUMN "face_verification_status",
ADD COLUMN     "face_verification_status" "VerificationStatus";

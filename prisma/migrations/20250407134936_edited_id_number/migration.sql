/*
  Warnings:

  - The `id_type` column on the `KycVerification` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `KycVerification` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "KycIdStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "KycIdType" AS ENUM ('NIGERIAN_NIN', 'NIGERIAN_INTERNATIONAL_PASSPORT', 'NIGERIAN_PVC', 'NIGERIAN_DRIVERS_LICENSE');

-- AlterTable
ALTER TABLE "KycVerification" DROP COLUMN "id_type",
ADD COLUMN     "id_type" "KycIdType",
DROP COLUMN "status",
ADD COLUMN     "status" "KycIdStatus";

-- DropEnum
DROP TYPE "KycStatus";

-- DropEnum
DROP TYPE "KycType";

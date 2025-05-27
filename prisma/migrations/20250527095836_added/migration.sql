-- AlterTable
ALTER TABLE "KycVerification" ADD COLUMN     "bvn" TEXT,
ADD COLUMN     "bvn_verified" BOOLEAN NOT NULL DEFAULT false;

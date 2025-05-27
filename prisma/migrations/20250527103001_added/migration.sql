-- AlterTable
ALTER TABLE "KycVerification" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "KycType" AS ENUM ('NIGERIAN_NIN', 'NIGERIAN_INTERNATIONAL_PASSPORT', 'NIGERIAN_PVC', 'NIGERIAN_DRIVERS_LICENSE');

-- CreateTable
CREATE TABLE "KycVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "id_type" "KycType" NOT NULL,
    "verification_d" TEXT NOT NULL,
    "status" "KycStatus",

    CONSTRAINT "KycVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycVerification_userId_key" ON "KycVerification"("userId");

-- AddForeignKey
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

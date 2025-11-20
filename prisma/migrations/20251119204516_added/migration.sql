-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "account_status" "AccountStatus" DEFAULT 'active',
ADD COLUMN     "password_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "password_attempts_started_at" TIMESTAMP(3);

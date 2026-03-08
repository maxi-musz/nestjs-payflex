-- AlterTable
ALTER TABLE "User" ADD COLUMN     "account_deletion_requested_at" TIMESTAMP(3),
ADD COLUMN     "requested_account_deletion" BOOLEAN NOT NULL DEFAULT false;

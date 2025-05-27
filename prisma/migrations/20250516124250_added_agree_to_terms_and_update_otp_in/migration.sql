-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agree_to_terms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updates_opt_in" BOOLEAN NOT NULL DEFAULT false;

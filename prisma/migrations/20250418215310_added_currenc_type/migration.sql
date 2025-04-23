-- DropIndex
DROP INDEX "Account_account_number_key";

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "account_number" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "country" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "routing_number" TEXT,
ADD COLUMN     "sort_code" TEXT,
ADD COLUMN     "swift_code" TEXT,
ALTER COLUMN "bank_name" DROP NOT NULL,
ALTER COLUMN "account_name" DROP NOT NULL;

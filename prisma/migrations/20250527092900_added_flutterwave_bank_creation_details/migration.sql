-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "account_status" TEXT DEFAULT 'active',
ADD COLUMN     "flw_response_code" TEXT,
ADD COLUMN     "frequency" INTEGER,
ADD COLUMN     "note" TEXT;

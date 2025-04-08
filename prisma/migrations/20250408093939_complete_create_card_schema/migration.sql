-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "flutterwave_id" TEXT,
ADD COLUMN     "meta_data" JSONB DEFAULT '{}',
ADD COLUMN     "order_ref" TEXT,
ADD COLUMN     "reference" TEXT,
ALTER COLUMN "accountType" DROP NOT NULL,
ALTER COLUMN "accountType" SET DEFAULT 'savings',
ALTER COLUMN "bank_code" DROP NOT NULL;

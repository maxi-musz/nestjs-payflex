-- AlterTable
ALTER TABLE "FlwTempAcctNumber" ADD COLUMN     "status" TEXT,
ALTER COLUMN "order_no" DROP NOT NULL;

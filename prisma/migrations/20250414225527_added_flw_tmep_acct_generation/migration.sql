-- CreateTable
CREATE TABLE "FlwTempAcctNumber" (
    "id" TEXT NOT NULL,
    "response_code" TEXT,
    "flw_ref" TEXT,
    "order_ref" TEXT,
    "account_number" TEXT,
    "accountStatus" TEXT,
    "frequency" TEXT,
    "bank_name" TEXT,
    "note" TEXT,
    "amount" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "FlwTempAcctNumber_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FlwTempAcctNumber" ADD CONSTRAINT "FlwTempAcctNumber_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

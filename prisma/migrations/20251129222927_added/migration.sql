-- CreateTable
CREATE TABLE "PaystackTransferRecipient" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipient_code" TEXT NOT NULL,
    "paystack_id" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'nuban',
    "name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "paystack_details" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaystackTransferRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaystackTransferRecipient_recipient_code_key" ON "PaystackTransferRecipient"("recipient_code");

-- CreateIndex
CREATE INDEX "PaystackTransferRecipient_user_id_idx" ON "PaystackTransferRecipient"("user_id");

-- CreateIndex
CREATE INDEX "PaystackTransferRecipient_recipient_code_idx" ON "PaystackTransferRecipient"("recipient_code");

-- CreateIndex
CREATE INDEX "PaystackTransferRecipient_account_number_idx" ON "PaystackTransferRecipient"("account_number");

-- CreateIndex
CREATE INDEX "PaystackTransferRecipient_active_idx" ON "PaystackTransferRecipient"("active");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackTransferRecipient_user_id_account_number_bank_code_key" ON "PaystackTransferRecipient"("user_id", "account_number", "bank_code");

-- AddForeignKey
ALTER TABLE "PaystackTransferRecipient" ADD CONSTRAINT "PaystackTransferRecipient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

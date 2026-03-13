-- Rename fee to commission: this column stores VTpass commission we earn, not a customer fee.
ALTER TABLE "TransactionHistory" RENAME COLUMN "fee" TO "commission";

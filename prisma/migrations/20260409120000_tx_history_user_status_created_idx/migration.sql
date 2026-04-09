-- Speeds up failed-utility-tx cooldown queries per user
CREATE INDEX "TransactionHistory_user_id_status_createdAt_idx" ON "TransactionHistory"("user_id", "status", "createdAt");

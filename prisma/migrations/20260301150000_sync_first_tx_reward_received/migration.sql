-- One-time sync: set first_tx_reward_received = true for any user who has already received the reward.
-- (1) Users with a row in first_tx_reward_history (reward was granted)
-- (2) Users with a first_tx_bonus transaction (in case history row was missing)
-- Fixes users who received the reward before the User flag was being set in code.
UPDATE "User"
SET "first_tx_reward_received" = true
WHERE "first_tx_reward_received" = false
  AND (
    id IN (SELECT user_id FROM "first_tx_reward_history")
    OR id IN (
      SELECT user_id FROM "TransactionHistory"
      WHERE transaction_type = 'first_tx_bonus' AND status = 'success'
    )
  );

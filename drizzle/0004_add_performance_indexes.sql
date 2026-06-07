CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transaction_items_transaction_id_idx ON transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS expenses_user_created_idx ON expenses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS debts_user_created_idx ON debts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_bills_user_created_idx ON saved_bills (user_id, created_at DESC);

-- Enable Row Level Security (RLS) on all public tables in Supabase
-- This resolves the "RLS Disabled in Public" CRITICAL security warnings in Supabase Security Advisor.
-- Note: Your Next.js app connects via DATABASE_URL as postgres owner, which automatically bypasses RLS,
-- so your app will continue working seamlessly while direct anonymous API access is 100% blocked.

ALTER TABLE IF EXISTS "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "debts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "transaction_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ai_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "saved_bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "customer_promo_claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "store_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ai_chats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "inbox_messages" ENABLE ROW LEVEL SECURITY;

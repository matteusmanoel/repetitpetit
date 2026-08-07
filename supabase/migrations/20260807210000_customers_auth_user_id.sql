-- #129 / SO-03 / D119 — Buyer magic-link identity on customers
-- Links Supabase Auth user (buyer) to customers row. Distinct from admins.auth_user_id.
-- Orchestrator applies on shared Supabase after merge; cloud agents commit file only.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.customers.auth_user_id IS
  'Supabase Auth user for buyer magic-link session (SO-03 / D103). Null for guest-only customers. Never reuse admins.auth_user_id gate.';

-- One Auth user ↔ one customer (nullable unique).
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_auth_user_id
  ON public.customers (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

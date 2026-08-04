-- SN-01 — Slice N database foundation
-- Ref.: CONTEXT.md, docs/09-decisions.md (D61–D73), docs/adr/0001-omnichannel-inventory-priority.md
-- Issue: #67
--
-- Adaptations vs issue SQL sketches (validated against live schema 2026-08-03):
--   1. Keep product_status.'reserved' (D40: reservation never wrote that status;
--      addenda: dual-read with cart_reservations until SN-02/SN-04 cutover).
--   2. ADD VALUE 'hold' only — no UPDATE in this transaction (PG enum caveat;
--      live data has 0 rows with status='reserved').
--   3. RLS follows D13/D50 harden: service_role writes; authenticated admin SELECT
--      for Passport/POS/realtime. No anon SELECT-by-cookie (cookie is not an RLS
--      claim; cart_reservations already lost anon INSERT/DELETE).
--   4. cart_reservations + release-expired-reservations cron kept intact.
--   5. Addenda: fulfillment_type.store_counter, payment_provider local methods,
--      customers.email unique partial index.
--   6. channel / sold_channel / hold status use text + CHECK (not new enums) for
--      MVP flexibility; permanent inventory enum stays product_status.

-- ════════════════════════════════════════════════════════════════════════════
-- ENUM EXTENSIONS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'hold';

ALTER TYPE fulfillment_type ADD VALUE IF NOT EXISTS 'store_counter';

ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'cash';
ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'card_local';
ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'pix_local';

-- ════════════════════════════════════════════════════════════════════════════
-- PRODUCTS — staff identity + sale channel projection
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS staff_code text,
  ADD COLUMN IF NOT EXISTS sold_channel text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_sold_channel_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_sold_channel_check
      CHECK (
        sold_channel IS NULL
        OR sold_channel IN ('online', 'store')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_staff_code
  ON public.products (staff_code)
  WHERE staff_code IS NOT NULL;

COMMENT ON COLUMN public.products.staff_code IS
  'Permanent floor identity RP-XXXXXX; assigned only at activation (D64).';
COMMENT ON COLUMN public.products.sold_channel IS
  'Sale channel when status=sold: online | store (D65). Null while not sold.';

-- ════════════════════════════════════════════════════════════════════════════
-- ORDERS — omnichannel channel (D68 / D71)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS store_payment_method text;

UPDATE public.orders
SET channel = 'online'
WHERE channel IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN channel SET DEFAULT 'online',
  ALTER COLUMN channel SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_channel_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_channel_check
      CHECK (channel IN ('online', 'store'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_store_payment_method_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_store_payment_method_check
      CHECK (
        store_payment_method IS NULL
        OR store_payment_method IN ('cash', 'card', 'pix')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_channel ON public.orders (channel);

COMMENT ON COLUMN public.orders.channel IS
  'Sale channel: online | store. Shared orders aggregate (D68).';
COMMENT ON COLUMN public.orders.store_payment_method IS
  'Counter method when channel=store: cash | card | pix (D71).';

-- ════════════════════════════════════════════════════════════════════════════
-- CUSTOMERS — email uniqueness for checkout hardening (D69 / SN-12)
-- ════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email
  ON public.customers (email)
  WHERE email IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- HOLD SESSIONS (source of truth — D66)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hold_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        text NOT NULL,
  status            text NOT NULL DEFAULT 'active',
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '20 minutes'),
  customer_id       uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  checkout_order_id uuid REFERENCES public.orders (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hold_sessions_status_check
    CHECK (status IN ('active', 'expired', 'cancelled', 'converted'))
);

CREATE INDEX IF NOT EXISTS idx_hold_sessions_session
  ON public.hold_sessions (session_id);

CREATE INDEX IF NOT EXISTS idx_hold_sessions_status_expires
  ON public.hold_sessions (status, expires_at);

-- One active Hold Session per browser session cookie (SN-02 concurrency helper).
CREATE UNIQUE INDEX IF NOT EXISTS idx_hold_sessions_one_active_per_session
  ON public.hold_sessions (session_id)
  WHERE status = 'active';

COMMENT ON TABLE public.hold_sessions IS
  'Hold Session source of truth (who/what/TTL/checkout). products.status=hold is projection only (D66).';

-- ════════════════════════════════════════════════════════════════════════════
-- HOLD ITEMS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hold_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_session_id uuid NOT NULL REFERENCES public.hold_sessions (id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_hold_item_product UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_hold_items_session
  ON public.hold_items (hold_session_id);

COMMENT ON TABLE public.hold_items IS
  'Peças in a Hold Session. UNIQUE(product_id) requires DELETE on expire/cancel/convert (same D14 pattern as cart_reservations).';

-- ════════════════════════════════════════════════════════════════════════════
-- OVERRIDE EVENTS (minimal audit — D72)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.override_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products (id),
  hold_session_id uuid REFERENCES public.hold_sessions (id) ON DELETE SET NULL,
  order_id        uuid REFERENCES public.orders (id) ON DELETE SET NULL,
  staff_id        uuid NOT NULL REFERENCES public.admins (id),
  reason          text NOT NULL,
  context_json    jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_override_events_product
  ON public.override_events (product_id);

CREATE INDEX IF NOT EXISTS idx_override_events_created
  ON public.override_events (created_at DESC);

COMMENT ON TABLE public.override_events IS
  'Minimal Override audit trail for ops/support/debug — not a compliance platform (D72).';

-- ════════════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.hold_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hold_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.override_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hold_sessions_service_role_all" ON public.hold_sessions;
CREATE POLICY "hold_sessions_service_role_all" ON public.hold_sessions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "hold_sessions_admin_select" ON public.hold_sessions;
CREATE POLICY "hold_sessions_admin_select" ON public.hold_sessions
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "hold_items_service_role_all" ON public.hold_items;
CREATE POLICY "hold_items_service_role_all" ON public.hold_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "hold_items_admin_select" ON public.hold_items;
CREATE POLICY "hold_items_admin_select" ON public.hold_items
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "override_events_service_role_all" ON public.override_events;
CREATE POLICY "override_events_service_role_all" ON public.override_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "override_events_admin_select" ON public.override_events;
CREATE POLICY "override_events_admin_select" ON public.override_events
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- REALTIME (admin dashboards / Passport — SN-14 readiness)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.hold_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.hold_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'hold_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hold_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'hold_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hold_items;
  END IF;
END $$;

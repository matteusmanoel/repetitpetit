-- #139 / SP-2 / ADR 0002 — Separação check per Peça (`order_items.packed_at`)
-- Persisted staff check; does NOT auto-advance Order status.
-- Orchestrator applies on shared Supabase after merge; cloud agents commit file only.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS packed_at timestamptz;

COMMENT ON COLUMN public.order_items.packed_at IS
  'Staff Separação check timestamp (ADR 0002 / #139). NULL = pending. Does not change orders.status.';

CREATE INDEX IF NOT EXISTS idx_order_items_packed_at
  ON public.order_items (order_id)
  WHERE packed_at IS NOT NULL;

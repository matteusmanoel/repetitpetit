-- #98 — Public catalog/PDP Realtime for products.status hold↔available.
-- Idempotent ADD to supabase_realtime. Orchestrator applies remotely after merge.
-- Relies on #97 anon SELECT available|hold so RLS allows event delivery.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;

-- SO-04 / D107 — sequential thermal label print queue (ACK + 1 retry)
-- Issue: #126
--
-- Print failure must not roll back product creation. Jobs track
-- pending → printing → printed|failed independently of products.
-- Orchestrator applies remotely after merge (Cloud Agent commits only).

CREATE TABLE IF NOT EXISTS public.label_print_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      uuid NOT NULL,
  product_id    uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  staff_code    text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'printing', 'printed', 'failed')),
  sort_order    int NOT NULL DEFAULT 0,
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts  int NOT NULL DEFAULT 2,
  last_error    text,
  printed_at    timestamptz,
  created_by    uuid REFERENCES public.admins (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT label_print_jobs_max_attempts_check CHECK (max_attempts >= 1),
  CONSTRAINT label_print_jobs_attempt_count_check CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_label_print_jobs_batch_sort
  ON public.label_print_jobs (batch_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_label_print_jobs_status
  ON public.label_print_jobs (status);

CREATE INDEX IF NOT EXISTS idx_label_print_jobs_product
  ON public.label_print_jobs (product_id);

COMMENT ON TABLE public.label_print_jobs IS
  'SO-04/D107: sequential thermal label jobs (ACK/reprint). Product stays even if print fails.';

ALTER TABLE public.label_print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "label_print_jobs_service_role_all"
  ON public.label_print_jobs;
CREATE POLICY "label_print_jobs_service_role_all"
  ON public.label_print_jobs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.label_print_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.label_print_jobs FROM anon;
REVOKE ALL ON TABLE public.label_print_jobs FROM authenticated;

DO $$
BEGIN
  GRANT ALL ON TABLE public.label_print_jobs TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

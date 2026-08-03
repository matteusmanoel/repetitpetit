-- SN-09 — RP staff code sequence + activation backfill
-- Ref.: CONTEXT.md (Peça), docs/09-decisions.md (D64, D67)
-- Issue: #75
--
-- Assigns permanent floor identity RP-XXXXXX. Sequence only advances on
-- next_rp_staff_code() (activation / backfill) — never for drafts.

-- ════════════════════════════════════════════════════════════════════════════
-- SEQUENCE + GENERATOR
-- ════════════════════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS public.rp_staff_code_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION public.next_rp_staff_code()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'RP-' || LPAD(nextval('public.rp_staff_code_seq')::text, 6, '0');
$$;

REVOKE ALL ON FUNCTION public.next_rp_staff_code() FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.rp_staff_code_seq FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.next_rp_staff_code() TO service_role;
  GRANT USAGE, SELECT ON SEQUENCE public.rp_staff_code_seq TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON SEQUENCE public.rp_staff_code_seq IS
  'SN-09: monotonic source for RP-XXXXXX staff codes (D64).';
COMMENT ON FUNCTION public.next_rp_staff_code() IS
  'SN-09: returns next permanent staff code RP-XXXXXX (6 zero-padded digits).';

-- ════════════════════════════════════════════════════════════════════════════
-- BACKFILL — existing floor inventory without a staff_code
-- ════════════════════════════════════════════════════════════════════════════

-- Eligible: already in sellable lifecycle (available / hold / sold).
-- inactive without code stays null until explicit activation (draft-like).
UPDATE public.products AS p
SET staff_code = public.next_rp_staff_code()
WHERE p.staff_code IS NULL
  AND p.status IN ('available', 'hold', 'sold');

-- SN-03 — Hold Session expiration (D70, D66, D75)
-- Issue: #69
--
-- Atomic expire path MUST reuse SN-02 `_finalize_hold_session` — no duplicated
-- products.status / hold_items UPDATE/DELETE logic outside that primitive.
--
-- Primary schedule: pg_cron every 5 minutes → expire_due_hold_sessions().
-- Edge Function `expire-hold-sessions` is a thin service-role wrapper for the
-- same RPC (manual invoke / Supabase Dashboard schedule alternate).

CREATE OR REPLACE FUNCTION public.expire_due_hold_sessions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_expired integer := 0;
  v_failed integer := 0;
  v_ids uuid[] := '{}';
BEGIN
  FOR r IN
    SELECT hs.id, hs.session_id
    FROM public.hold_sessions hs
    WHERE hs.status = 'active'
      AND hs.expires_at <= now()
    ORDER BY hs.expires_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM public._finalize_hold_session(r.id, 'expired');
      v_expired := v_expired + 1;
      v_ids := array_append(v_ids, r.id);
    EXCEPTION
      WHEN OTHERS THEN
        v_failed := v_failed + 1;
        RAISE WARNING 'expire_due_hold_sessions failed for %: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'ok',
    'expired_count', v_expired,
    'failed_count', v_failed,
    'hold_session_ids', to_jsonb(v_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_due_hold_sessions() FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.expire_due_hold_sessions() TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.expire_due_hold_sessions() IS
  'SN-03: expire all due active Hold Sessions via SN-02 _finalize_hold_session (D70/D75).';

-- Schedule every 5 minutes (same cadence as cart reservation sweep).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-hold-sessions') THEN
    PERFORM cron.unschedule('expire-hold-sessions');
  END IF;

  PERFORM cron.schedule(
    'expire-hold-sessions',
    '*/5 * * * *',
    $cron$SELECT public.expire_due_hold_sessions();$cron$
  );
END $$;

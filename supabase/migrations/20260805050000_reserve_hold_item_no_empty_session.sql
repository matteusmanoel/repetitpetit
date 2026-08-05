-- #95 — reserve_hold_item: do not leave active Hold Sessions with 0 items
--
-- Bug: losers in concurrent / unavailable reserve created an active
-- hold_sessions row before the hold_items insert, then returned unavailable
-- without rolling back — accumulating empty ghost sessions under load.
--
-- Fix: create the session only after the Peça is confirmed available; on
-- unique_violation (or unavailable after a leftover empty active session),
-- cancel the empty session via _finalize_hold_session(..., 'cancelled').
--
-- Additive CREATE OR REPLACE only — orchestrator applies remotely after merge.
-- Decisions: D75 (SN-02 sole primitive), D91 (#95).
-- Contract: docs/slice-n/SN-02-contract.md

CREATE OR REPLACE FUNCTION public.reserve_hold_item(
  p_session_id text,
  p_product_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.hold_sessions%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_item_count integer := 0;
  v_session_found boolean := false;
  v_session_created boolean := false;
BEGIN
  IF p_product_id IS NULL
     OR p_session_id IS NULL
     OR length(trim(p_session_id)) = 0 THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  -- Expire this browser session's stale active Hold Session (TTL elapsed).
  PERFORM public._finalize_hold_session(hs.id, 'expired')
  FROM public.hold_sessions hs
  WHERE hs.session_id = p_session_id
    AND hs.status = 'active'
    AND hs.expires_at <= now();

  -- D14-style cleanup: drop leftover items for this product on terminal sessions
  -- so UNIQUE(product_id) does not block a new hold after expire/cancel.
  DELETE FROM public.hold_items hi
  USING public.hold_sessions hs
  WHERE hi.hold_session_id = hs.id
    AND hi.product_id = p_product_id
    AND hs.status IN ('expired', 'cancelled');

  -- Serialize on the product row (inventory projection).
  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  -- Find existing active Hold Session for this cookie (do NOT create yet).
  SELECT *
  INTO v_session
  FROM public.hold_sessions
  WHERE session_id = p_session_id
    AND status = 'active'
  FOR UPDATE;

  v_session_found := FOUND;

  IF v_session_found THEN
    -- Idempotent: same session already holds this Peça.
    IF EXISTS (
      SELECT 1
      FROM public.hold_items hi
      WHERE hi.hold_session_id = v_session.id
        AND hi.product_id = p_product_id
    ) THEN
      RETURN jsonb_build_object(
        'status', 'ok',
        'hold_session_id', v_session.id,
        'expires_at', v_session.expires_at
      );
    END IF;

    SELECT count(*)::integer
    INTO v_item_count
    FROM public.hold_items
    WHERE hold_session_id = v_session.id;

    IF v_item_count >= 5 THEN
      RETURN jsonb_build_object('status', 'limit_reached');
    END IF;
  END IF;

  -- Availability must pass before creating a new session (#95).
  IF v_product.status IS DISTINCT FROM 'available' OR v_product.quantity <= 0 THEN
    -- Heal leftover empty active sessions (previous bug / race residue).
    IF v_session_found AND v_item_count = 0 THEN
      PERFORM public._finalize_hold_session(v_session.id, 'cancelled');
    END IF;
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  IF NOT v_session_found THEN
    INSERT INTO public.hold_sessions (session_id)
    VALUES (trim(p_session_id))
    RETURNING * INTO v_session;
    v_session_created := true;
    v_item_count := 0;
  END IF;

  BEGIN
    INSERT INTO public.hold_items (hold_session_id, product_id)
    VALUES (v_session.id, p_product_id);
  EXCEPTION
    WHEN unique_violation THEN
      -- Conflict: another session won UNIQUE(product_id). Never leave an
      -- active empty Hold Session behind.
      IF v_session_created OR v_item_count = 0 THEN
        PERFORM public._finalize_hold_session(v_session.id, 'cancelled');
      END IF;
      RETURN jsonb_build_object('status', 'unavailable');
  END;

  UPDATE public.products
  SET status = 'hold',
      updated_at = now()
  WHERE id = p_product_id;

  UPDATE public.hold_sessions
  SET updated_at = now()
  WHERE id = v_session.id;

  PERFORM public.emit_product_status_event(
    p_product_id,
    'available',
    'hold',
    'system',
    NULL,
    'hold',
    NULL,
    'Hold Session ' || left(v_session.session_id, 12)
  );

  RETURN jsonb_build_object(
    'status', 'ok',
    'hold_session_id', v_session.id,
    'expires_at', v_session.expires_at
  );
END;
$$;

COMMENT ON FUNCTION public.reserve_hold_item(text, uuid) IS
  'SN-02: atomically reserve a Peça into a Hold Session (max 5); creates active session only after successful availability; cancels empty session on conflict (#95).';

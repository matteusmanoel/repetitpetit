-- SN-02 — Hold Session RPCs (D61, D66, D14, D30)
-- Issue: #68
--
-- Owns the reservation primitive only:
--   reserve:  available → hold
--   release:  hold → available
--   convert:  session active → converted (products remain hold; sold is SN-05/SN-06)
--
-- SECURITY DEFINER; EXECUTE granted to service_role only.
-- cart_reservations / reserve_cart_product kept for dual-read until SN-04 cutover.

-- ════════════════════════════════════════════════════════════════════════════
-- Internal: finalize a Hold Session (cancel / expire)
-- Deletes hold_items, restores products.status hold→available, sets session status.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._finalize_hold_session(
  p_hold_session_id uuid,
  p_final_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_ids uuid[];
BEGIN
  IF p_final_status NOT IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'invalid final status: %', p_final_status;
  END IF;

  -- Lock session row
  PERFORM 1
  FROM public.hold_sessions
  WHERE id = p_hold_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT coalesce(array_agg(hi.product_id), '{}')
  INTO v_product_ids
  FROM public.hold_items hi
  WHERE hi.hold_session_id = p_hold_session_id;

  DELETE FROM public.hold_items
  WHERE hold_session_id = p_hold_session_id;

  IF cardinality(v_product_ids) > 0 THEN
    UPDATE public.products p
    SET status = 'available',
        updated_at = now()
    WHERE p.id = ANY (v_product_ids)
      AND p.status = 'hold';
  END IF;

  UPDATE public.hold_sessions
  SET status = p_final_status,
      updated_at = now()
  WHERE id = p_hold_session_id
    AND status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public._finalize_hold_session(uuid, text) FROM PUBLIC;

COMMENT ON FUNCTION public._finalize_hold_session(uuid, text) IS
  'SN-02 internal: cancel/expire a Hold Session and restore product projections (D66).';

-- ════════════════════════════════════════════════════════════════════════════
-- reserve_hold_item
-- ════════════════════════════════════════════════════════════════════════════

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
  v_item_count integer;
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

  -- Find active Hold Session for this cookie (partial unique index).
  SELECT *
  INTO v_session
  FROM public.hold_sessions
  WHERE session_id = p_session_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.hold_sessions (session_id)
    VALUES (trim(p_session_id))
    RETURNING * INTO v_session;
  END IF;

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

  IF v_product.status IS DISTINCT FROM 'available' OR v_product.quantity <= 0 THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  BEGIN
    INSERT INTO public.hold_items (hold_session_id, product_id)
    VALUES (v_session.id, p_product_id);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('status', 'unavailable');
  END;

  UPDATE public.products
  SET status = 'hold',
      updated_at = now()
  WHERE id = p_product_id;

  UPDATE public.hold_sessions
  SET updated_at = now()
  WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'hold_session_id', v_session.id,
    'expires_at', v_session.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_hold_item(text, uuid) FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.reserve_hold_item(text, uuid) TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.reserve_hold_item(text, uuid) IS
  'SN-02: atomically reserve a Peça into a Hold Session (max 5) and set products.status=hold (D61/D66).';

-- ════════════════════════════════════════════════════════════════════════════
-- release_hold_item
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.release_hold_item(
  p_session_id text,
  p_product_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_deleted integer;
BEGIN
  IF p_product_id IS NULL
     OR p_session_id IS NULL
     OR length(trim(p_session_id)) = 0 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT hs.id
  INTO v_session_id
  FROM public.hold_sessions hs
  WHERE hs.session_id = p_session_id
    AND hs.status = 'active'
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  WITH deleted AS (
    DELETE FROM public.hold_items hi
    WHERE hi.hold_session_id = v_session_id
      AND hi.product_id = p_product_id
    RETURNING hi.product_id
  )
  SELECT count(*)::integer INTO v_deleted FROM deleted;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  UPDATE public.products
  SET status = 'available',
      updated_at = now()
  WHERE id = p_product_id
    AND status = 'hold';

  UPDATE public.hold_sessions
  SET updated_at = now()
  WHERE id = v_session_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'hold_session_id', v_session_id,
    'product_id', p_product_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_hold_item(text, uuid) FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.release_hold_item(text, uuid) TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.release_hold_item(text, uuid) IS
  'SN-02: release one Peça from an active Hold Session and restore products.status=available.';

-- ════════════════════════════════════════════════════════════════════════════
-- release_hold_session
-- p_final_status: cancelled (default, customer/override) | expired (SN-03 cron)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.release_hold_session(
  p_session_id text,
  p_final_status text DEFAULT 'cancelled'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.hold_sessions%ROWTYPE;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF p_final_status NOT IN ('cancelled', 'expired') THEN
    RETURN jsonb_build_object('status', 'invalid_status');
  END IF;

  SELECT *
  INTO v_session
  FROM public.hold_sessions
  WHERE session_id = p_session_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  PERFORM public._finalize_hold_session(v_session.id, p_final_status);

  RETURN jsonb_build_object(
    'status', 'ok',
    'hold_session_id', v_session.id,
    'final_status', p_final_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_hold_session(text, text) FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.release_hold_session(text, text) TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.release_hold_session(text, text) IS
  'SN-02: release all items in an active Hold Session (cancelled|expired) and restore projections. SN-03 must call this — not duplicate status UPDATEs.';

-- ════════════════════════════════════════════════════════════════════════════
-- convert_hold_session
-- Links checkout order; does NOT mark products sold (SN-05/SN-06).
-- hold_items remain; products stay status=hold until paid→sold.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.convert_hold_session(
  p_session_id text,
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.hold_sessions%ROWTYPE;
BEGIN
  IF p_session_id IS NULL
     OR length(trim(p_session_id)) = 0
     OR p_order_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = p_order_id) THEN
    RETURN jsonb_build_object('status', 'order_not_found');
  END IF;

  SELECT *
  INTO v_session
  FROM public.hold_sessions
  WHERE session_id = p_session_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_session.expires_at <= now() THEN
    PERFORM public._finalize_hold_session(v_session.id, 'expired');
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.hold_items hi
    WHERE hi.hold_session_id = v_session.id
  ) THEN
    RETURN jsonb_build_object('status', 'empty');
  END IF;

  UPDATE public.hold_sessions
  SET status = 'converted',
      checkout_order_id = p_order_id,
      updated_at = now()
  WHERE id = v_session.id;

  -- Intentionally leave products.status = hold and hold_items in place.
  -- SN-05/SN-06 owns paid → sold and subsequent cleanup.

  RETURN jsonb_build_object(
    'status', 'ok',
    'hold_session_id', v_session.id,
    'order_id', p_order_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_hold_session(text, uuid) FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.convert_hold_session(text, uuid) TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.convert_hold_session(text, uuid) IS
  'SN-02: mark Hold Session converted and link order. Does NOT set products.status=sold (D66/D71 boundary).';

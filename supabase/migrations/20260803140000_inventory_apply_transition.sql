-- SN-05 — Atomic inventory transitions for sold / inactive (D65 / D66 / D71)
-- Issue: #71
--
-- Owns: hold|available → sold (+ sold_channel), available ↔ inactive.
-- Does NOT own available ↔ hold — callers must use SN-02 RPCs
-- (reserve_hold_item / release_hold_item / release_hold_session).
--
-- Orchestrator must apply this migration remotely after merge.
-- Ref.: docs/slice-n/SN-05-contract.md

CREATE OR REPLACE FUNCTION public.apply_inventory_transition(
  p_product_id uuid,
  p_from text,
  p_to text,
  p_sold_channel text DEFAULT NULL,
  p_hold_session_id text DEFAULT NULL,
  p_order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_hold_session_id uuid;
  v_hold_item_session uuid;
BEGIN
  IF p_product_id IS NULL OR p_from IS NULL OR p_to IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'missing_args');
  END IF;

  -- available ↔ hold is SN-02 territory
  IF (p_from = 'available' AND p_to = 'hold')
     OR (p_from = 'hold' AND p_to = 'available') THEN
    RETURN jsonb_build_object('status', 'use_sn02');
  END IF;

  -- Only inventory-owned edges
  IF NOT (
    (p_from = 'hold' AND p_to = 'sold')
    OR (p_from = 'available' AND p_to = 'sold')
    OR (p_from = 'available' AND p_to = 'inactive')
    OR (p_from = 'inactive' AND p_to = 'available')
  ) THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'unsupported_transition');
  END IF;

  IF p_to = 'sold' AND (p_sold_channel IS NULL OR p_sold_channel NOT IN ('online', 'store')) THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'sold_channel_required');
  END IF;

  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Idempotent paid retry: already sold
  IF v_product.status = 'sold' AND p_to = 'sold' THEN
    RETURN jsonb_build_object(
      'status', 'ok',
      'outcome', 'already_sold',
      'product_id', v_product.id,
      'sold_channel', v_product.sold_channel
    );
  END IF;

  IF v_product.status = 'sold' THEN
    RETURN jsonb_build_object('status', 'terminal_sold');
  END IF;

  IF v_product.status::text <> p_from THEN
    RETURN jsonb_build_object(
      'status', 'wrong_from',
      'current', v_product.status,
      'expected', p_from
    );
  END IF;

  IF p_from = 'hold' AND p_to = 'sold' THEN
    IF p_hold_session_id IS NULL OR length(trim(p_hold_session_id)) = 0 THEN
      RETURN jsonb_build_object('status', 'hold_session_mismatch', 'reason', 'missing');
    END IF;

    BEGIN
      v_hold_session_id := p_hold_session_id::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RETURN jsonb_build_object('status', 'hold_session_mismatch', 'reason', 'invalid_id');
    END;

    SELECT hi.hold_session_id
    INTO v_hold_item_session
    FROM public.hold_items hi
    WHERE hi.product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND OR v_hold_item_session IS DISTINCT FROM v_hold_session_id THEN
      RETURN jsonb_build_object('status', 'hold_session_mismatch');
    END IF;

    -- Optional: if order linked on converted session, it should match
    IF p_order_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1
        FROM public.hold_sessions hs
        WHERE hs.id = v_hold_session_id
          AND hs.checkout_order_id IS NOT NULL
          AND hs.checkout_order_id IS DISTINCT FROM p_order_id
      ) THEN
        RETURN jsonb_build_object('status', 'hold_session_mismatch', 'reason', 'order_mismatch');
      END IF;
    END IF;
  END IF;

  UPDATE public.products
  SET status = p_to::public.product_status,
      sold_channel = CASE
        WHEN p_to = 'sold' THEN p_sold_channel
        WHEN p_to = 'available' THEN NULL
        ELSE sold_channel
      END,
      updated_at = now()
  WHERE id = p_product_id;

  IF p_to = 'sold' THEN
    DELETE FROM public.hold_items
    WHERE product_id = p_product_id;

    DELETE FROM public.cart_reservations
    WHERE product_id = p_product_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'outcome', 'applied',
    'product_id', p_product_id,
    'from', p_from,
    'to', p_to,
    'sold_channel', CASE WHEN p_to = 'sold' THEN p_sold_channel ELSE NULL END,
    'order_id', p_order_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_inventory_transition(uuid, text, text, text, text, uuid) FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.apply_inventory_transition(uuid, text, text, text, text, uuid)
    TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.apply_inventory_transition(uuid, text, text, text, text, uuid) IS
  'SN-05: atomic sold/inactive inventory transitions with FOR UPDATE + hold_items cleanup. available↔hold must use SN-02.';

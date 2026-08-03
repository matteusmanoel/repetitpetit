-- SN-13 — Atomic Override action (D62 / D72 / D85)
-- Issue: #79
--
-- Cancels active (or converted) Hold Session claim and/or pending_payment
-- online order for a Peça, inserts override_events audit row.
-- Hold → available ONLY via SN-02 (`release_hold_session` / `_finalize_hold_session`).
--
-- Orchestrator must apply this migration remotely after merge.
-- Cloud agents do NOT apply remotely.
-- Ref.: docs/slice-n/SN-13-contract.md

CREATE OR REPLACE FUNCTION public.execute_override_action(
  p_product_id uuid,
  p_staff_id uuid,
  p_reason text,
  p_context text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_hold_uuid uuid;
  v_hold_cookie text;
  v_hold_status text;
  v_order_id uuid;
  v_order_status text;
  v_paid_order_id uuid;
  v_release jsonb;
  v_event_id uuid;
  v_context jsonb;
  v_now timestamptz := now();
BEGIN
  IF p_product_id IS NULL OR p_staff_id IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'missing_args');
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'reason_too_short');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.id = p_staff_id) THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'staff_not_found');
  END IF;

  -- Serialize on the Peça (inventory projection).
  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Paid / sold is sacred (D62 / D83).
  IF v_product.status = 'sold' THEN
    RETURN jsonb_build_object('status', 'already_paid', 'reason', 'product_sold');
  END IF;

  IF v_product.status NOT IN ('hold', 'available') THEN
    RETURN jsonb_build_object(
      'status', 'invalid_status',
      'current', v_product.status
    );
  END IF;

  -- Block if any online order for this Peça is past pending_payment.
  SELECT o.id
  INTO v_paid_order_id
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE oi.product_id = p_product_id
    AND o.channel = 'online'
    AND o.status IN (
      'paid',
      'confirmed',
      'ready_for_pickup',
      'shipped',
      'completed'
    )
  LIMIT 1;

  IF v_paid_order_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'already_paid',
      'reason', 'order_paid',
      'order_id', v_paid_order_id
    );
  END IF;

  -- Active or converted Hold Session that still claims this Peça.
  SELECT hs.id, hs.session_id, hs.status::text
  INTO v_hold_uuid, v_hold_cookie, v_hold_status
  FROM public.hold_items hi
  JOIN public.hold_sessions hs ON hs.id = hi.hold_session_id
  WHERE hi.product_id = p_product_id
    AND hs.status IN ('active', 'converted')
  LIMIT 1
  FOR UPDATE OF hs;

  -- Pending online order (SN-06 late webhook reconciles via cancelled + event).
  SELECT o.id, o.status::text
  INTO v_order_id, v_order_status
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE oi.product_id = p_product_id
    AND o.channel = 'online'
    AND o.status = 'pending_payment'
  ORDER BY o.created_at DESC
  LIMIT 1
  FOR UPDATE OF o;

  -- Idempotent double override: nothing left to cancel.
  IF v_hold_uuid IS NULL
     AND v_order_id IS NULL
     AND v_product.status = 'available' THEN
    RETURN jsonb_build_object(
      'status', 'ok',
      'outcome', 'noop',
      'override_event_id', NULL,
      'affected_hold_session_id', NULL,
      'affected_order_id', NULL
    );
  END IF;

  -- Release hold via SN-02 only (never bare hold→available UPDATE as primary path).
  IF v_hold_uuid IS NOT NULL THEN
    IF v_hold_status = 'active' THEN
      v_release := public.release_hold_session(v_hold_cookie, 'cancelled');
      IF coalesce(v_release->>'status', '') NOT IN ('ok', 'not_found') THEN
        RETURN jsonb_build_object(
          'status', 'hold_release_failed',
          'detail', v_release
        );
      END IF;
    ELSE
      -- Converted (pending_payment) or other non-active claim: SN-02 internal
      -- clears hold_items + restores available; session status stays converted.
      PERFORM public._finalize_hold_session(v_hold_uuid, 'cancelled');
    END IF;
  ELSIF v_product.status = 'hold' THEN
    -- Orphan projection repair (hold without claim row) inside the same txn.
    UPDATE public.products
    SET status = 'available',
        updated_at = v_now
    WHERE id = p_product_id
      AND status = 'hold';
  END IF;

  IF v_order_id IS NOT NULL THEN
    UPDATE public.orders
    SET status = 'cancelled',
        payment_status = 'cancelled',
        cancelled_at = v_now,
        updated_at = v_now
    WHERE id = v_order_id
      AND status = 'pending_payment';

    INSERT INTO public.order_events (
      order_id,
      event_type,
      old_value,
      new_value,
      actor_type,
      actor_id,
      notes
    ) VALUES (
      v_order_id,
      'cancelled_by_override',
      coalesce(v_order_status, 'pending_payment'),
      'cancelled',
      'admin',
      p_staff_id::text,
      'Override cancelled pending online payment claim'
    );
  END IF;

  IF p_context IS NOT NULL AND length(trim(p_context)) > 0 THEN
    v_context := jsonb_build_object('context', trim(p_context));
  ELSE
    v_context := NULL;
  END IF;

  INSERT INTO public.override_events (
    product_id,
    hold_session_id,
    order_id,
    staff_id,
    reason,
    context_json
  ) VALUES (
    p_product_id,
    v_hold_uuid,
    v_order_id,
    p_staff_id,
    trim(p_reason),
    v_context
  )
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'outcome', 'applied',
    'override_event_id', v_event_id,
    'affected_hold_session_id', v_hold_uuid,
    'affected_order_id', v_order_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_override_action(uuid, uuid, text, text) FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.execute_override_action(uuid, uuid, text, text)
    TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.execute_override_action(uuid, uuid, text, text) IS
  'SN-13: atomic Override — release Hold Session (SN-02), cancel pending online order + cancelled_by_override event, insert override_events (D72).';

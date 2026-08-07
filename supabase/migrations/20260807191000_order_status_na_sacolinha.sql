-- #125 / D105 / D115 — Sacolinha fulfillment status `na_sacolinha`
-- Path: paid → confirmed (separando) → na_sacolinha → completed
-- Also persists ready_since / pickup_deadline for future 30d reminder job (no notifier yet).
-- Orchestrator applies on shared Supabase after merge; cloud agents commit file only.

-- New enum label (additive; do not rewrite prior migrations).
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'na_sacolinha';

-- Model columns for future 30-day pickup reminder (SO-05 / D105).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ready_since timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_deadline timestamptz;

COMMENT ON COLUMN public.orders.ready_since IS
  'Timestamp when order entered na_sacolinha (ready for pickup). Set by fulfillment transition; used by future 30d reminder job (D105).';

COMMENT ON COLUMN public.orders.pickup_deadline IS
  'ready_since + 30 days. Persisted for future notifier; no job in this slice (D105 / #125).';

CREATE INDEX IF NOT EXISTS idx_orders_pickup_deadline
  ON public.orders (pickup_deadline)
  WHERE pickup_deadline IS NOT NULL AND status = 'na_sacolinha';

-- SN-13: block override when Peça is on a paid Sacolinha order in na_sacolinha.
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
  v_order_id uuid;
  v_order_status text;
  v_paid_order_id uuid;
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

  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_product.status = 'sold' THEN
    RETURN jsonb_build_object('status', 'already_paid', 'reason', 'product_sold');
  END IF;

  IF v_product.status NOT IN ('hold', 'available') THEN
    RETURN jsonb_build_object(
      'status', 'invalid_status',
      'current', v_product.status
    );
  END IF;

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
      'na_sacolinha',
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

  SELECT hs.id
  INTO v_hold_uuid
  FROM public.hold_items hi
  JOIN public.hold_sessions hs ON hs.id = hi.hold_session_id
  WHERE hi.product_id = p_product_id
    AND hs.status IN ('active', 'converted')
  LIMIT 1
  FOR UPDATE OF hs;

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

  -- Release hold via SN-02 internal with override actor (avoids generic 'release' event).
  IF v_hold_uuid IS NOT NULL THEN
    PERFORM public._finalize_hold_session(
      v_hold_uuid,
      'cancelled',
      'admin',
      p_staff_id,
      'override',
      trim(p_reason)
    );
  ELSIF v_product.status = 'hold' THEN
    UPDATE public.products
    SET status = 'available',
        updated_at = v_now
    WHERE id = p_product_id
      AND status = 'hold';

    IF FOUND THEN
      PERFORM public.emit_product_status_event(
        p_product_id,
        'hold',
        'available',
        'admin',
        p_staff_id,
        'override',
        v_order_id,
        trim(p_reason)
      );
    END IF;
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

COMMENT ON FUNCTION public.execute_override_action(uuid, uuid, text, text) IS
  'SN-13: atomic Override — SN-02 release with SN-15 override event, cancel pending online + override_events (D72/D88). Post-payment includes na_sacolinha (#125).';

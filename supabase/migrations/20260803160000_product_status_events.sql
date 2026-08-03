-- SN-15 — Product status history for Garment Passport (D72 / D88)
-- Issue: #81
--
-- Option A: dedicated `product_status_events` (not order_events).
-- Emitters prefer SQL hooks inside existing RPCs; activation remains TS
-- (`activateProductAction`) because it assigns staff_code outside inventory RPC.
--
-- Orchestrator must apply this migration remotely after merge.
-- Cloud agents do NOT apply remotely.
-- Ref.: docs/slice-n/SN-15-contract.md

-- ════════════════════════════════════════════════════════════════════════════
-- Table
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_status_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  actor_type  text NOT NULL,
  actor_id    uuid,
  context     text,
  order_id    uuid REFERENCES public.orders (id) ON DELETE SET NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_status_events_actor_type_check
    CHECK (actor_type IN ('admin', 'system', 'customer'))
);

CREATE INDEX IF NOT EXISTS idx_product_status_events_product
  ON public.product_status_events (product_id);

CREATE INDEX IF NOT EXISTS idx_product_status_events_product_created
  ON public.product_status_events (product_id, created_at ASC);

COMMENT ON TABLE public.product_status_events IS
  'Minimal Peça status timeline for Passport ops/support/debug — not compliance (D72/D88).';

ALTER TABLE public.product_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_status_events_service_role_all"
  ON public.product_status_events;
CREATE POLICY "product_status_events_service_role_all"
  ON public.product_status_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.product_status_events FROM PUBLIC;
REVOKE ALL ON TABLE public.product_status_events FROM anon;
REVOKE ALL ON TABLE public.product_status_events FROM authenticated;

DO $$
BEGIN
  GRANT ALL ON TABLE public.product_status_events TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Helper emit (SECURITY DEFINER; service_role / definer RPCs)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.emit_product_status_event(
  p_product_id uuid,
  p_from_status text,
  p_to_status text,
  p_actor_type text,
  p_actor_id uuid DEFAULT NULL,
  p_context text DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_product_id IS NULL OR p_to_status IS NULL OR p_actor_type IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_actor_type NOT IN ('admin', 'system', 'customer') THEN
    RAISE EXCEPTION 'invalid actor_type: %', p_actor_type;
  END IF;

  INSERT INTO public.product_status_events (
    product_id,
    from_status,
    to_status,
    actor_type,
    actor_id,
    context,
    order_id,
    notes
  ) VALUES (
    p_product_id,
    NULLIF(trim(coalesce(p_from_status, '')), ''),
    p_to_status,
    p_actor_type,
    p_actor_id,
    NULLIF(trim(coalesce(p_context, '')), ''),
    p_order_id,
    NULLIF(trim(coalesce(p_notes, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_product_status_event(
  uuid, text, text, text, uuid, text, uuid, text
) FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.emit_product_status_event(
    uuid, text, text, text, uuid, text, uuid, text
  ) TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.emit_product_status_event(
  uuid, text, text, text, uuid, text, uuid, text
) IS
  'SN-15: insert one product_status_events row (ops audit).';

-- ════════════════════════════════════════════════════════════════════════════
-- SN-02: _finalize_hold_session — emit hold→available (release / expiration /
-- override via optional actor/context)
-- Drop 2-arg form so defaults create a single callable signature.
-- ════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public._finalize_hold_session(uuid, text);

CREATE OR REPLACE FUNCTION public._finalize_hold_session(
  p_hold_session_id uuid,
  p_final_status text,
  p_actor_type text DEFAULT 'system',
  p_actor_id uuid DEFAULT NULL,
  p_event_context text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_ids uuid[];
  v_pid uuid;
  v_context text;
  v_session_label text;
  v_restored uuid[];
BEGIN
  IF p_final_status NOT IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'invalid final status: %', p_final_status;
  END IF;

  PERFORM 1
  FROM public.hold_sessions
  WHERE id = p_hold_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT hs.session_id
  INTO v_session_label
  FROM public.hold_sessions hs
  WHERE hs.id = p_hold_session_id;

  SELECT coalesce(array_agg(hi.product_id), '{}')
  INTO v_product_ids
  FROM public.hold_items hi
  WHERE hi.hold_session_id = p_hold_session_id;

  DELETE FROM public.hold_items
  WHERE hold_session_id = p_hold_session_id;

  IF cardinality(v_product_ids) > 0 THEN
    WITH updated AS (
      UPDATE public.products p
      SET status = 'available',
          updated_at = now()
      WHERE p.id = ANY (v_product_ids)
        AND p.status = 'hold'
      RETURNING p.id
    )
    SELECT coalesce(array_agg(id), '{}') INTO v_restored FROM updated;

    v_context := coalesce(
      NULLIF(trim(coalesce(p_event_context, '')), ''),
      CASE
        WHEN p_final_status = 'expired' THEN 'expiration'
        ELSE 'release'
      END
    );

    FOREACH v_pid IN ARRAY v_restored LOOP
      PERFORM public.emit_product_status_event(
        v_pid,
        'hold',
        'available',
        coalesce(NULLIF(trim(coalesce(p_actor_type, '')), ''), 'system'),
        p_actor_id,
        v_context,
        NULL,
        coalesce(
          NULLIF(trim(coalesce(p_notes, '')), ''),
          'Hold Session ' || left(coalesce(v_session_label, p_hold_session_id::text), 12)
        )
      );
    END LOOP;
  END IF;

  UPDATE public.hold_sessions
  SET status = p_final_status,
      updated_at = now()
  WHERE id = p_hold_session_id
    AND status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public._finalize_hold_session(
  uuid, text, text, uuid, text, text
) FROM PUBLIC;

COMMENT ON FUNCTION public._finalize_hold_session(
  uuid, text, text, uuid, text, text
) IS
  'SN-02 internal: cancel/expire Hold Session, restore projections, emit SN-15 events.';
-- ════════════════════════════════════════════════════════════════════════════
-- SN-02: reserve_hold_item — emit available→hold
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

  PERFORM public._finalize_hold_session(hs.id, 'expired')
  FROM public.hold_sessions hs
  WHERE hs.session_id = p_session_id
    AND hs.status = 'active'
    AND hs.expires_at <= now();

  DELETE FROM public.hold_items hi
  USING public.hold_sessions hs
  WHERE hi.hold_session_id = hs.id
    AND hi.product_id = p_product_id
    AND hs.status IN ('expired', 'cancelled');

  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

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

-- ════════════════════════════════════════════════════════════════════════════
-- SN-02: release_hold_item — emit hold→available
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
  v_session_cookie text;
  v_deleted integer;
BEGIN
  IF p_product_id IS NULL
     OR p_session_id IS NULL
     OR length(trim(p_session_id)) = 0 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT hs.id, hs.session_id
  INTO v_session_id, v_session_cookie
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

  IF FOUND THEN
    PERFORM public.emit_product_status_event(
      p_product_id,
      'hold',
      'available',
      'system',
      NULL,
      'release',
      NULL,
      'Hold Session ' || left(coalesce(v_session_cookie, p_session_id), 12)
    );
  END IF;

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

-- ════════════════════════════════════════════════════════════════════════════
-- SN-05: apply_inventory_transition — emit on applied sold (online + store)
-- ════════════════════════════════════════════════════════════════════════════

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
  v_actor_type text;
BEGIN
  IF p_product_id IS NULL OR p_from IS NULL OR p_to IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'missing_args');
  END IF;

  IF (p_from = 'available' AND p_to = 'hold')
     OR (p_from = 'hold' AND p_to = 'available') THEN
    RETURN jsonb_build_object('status', 'use_sn02');
  END IF;

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

    -- Online webhook = system; store POS = admin (staff id filled by TS when known).
    v_actor_type := CASE
      WHEN p_sold_channel = 'store' THEN 'admin'
      ELSE 'system'
    END;

    PERFORM public.emit_product_status_event(
      p_product_id,
      p_from,
      'sold',
      v_actor_type,
      NULL,
      'sale',
      p_order_id,
      CASE
        WHEN p_sold_channel = 'store' THEN 'store'
        ELSE 'online'
      END
    );
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

-- ════════════════════════════════════════════════════════════════════════════
-- SN-13: execute_override_action — hold release with context=override
-- ════════════════════════════════════════════════════════════════════════════

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

  -- Order-only override (no hold→available) is audited in override_events /
  -- order_events; no product status change to record.

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
  'SN-13: atomic Override — SN-02 release with SN-15 override event, cancel pending online + override_events (D72/D88).';

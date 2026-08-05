-- Issue #99 — Auto-cancel online pending_payment 10 min after order creation
--
-- Aligns orders.expires_at DEFAULT to 10 minutes and adds a SN-03-style batch
-- expire RPC. Inventory release MUST reuse SN-02 `_finalize_hold_session`
-- (converted Hold Session after checkout) — never bare products.status UPDATE
-- and never mark sold (SN-05/SN-06 boundary).
--
-- Order status becomes `cancelled` (not `expired`) so SN-06 late webhook
-- reconcile (`reconcileLatePayment`) remains the path for post-cancel MP paid.
-- Store channel pending_payment (POS) is never touched.
--
-- Primary schedule: pg_cron every 1 minute → expire_due_pending_payment_orders().
-- Edge Function `expire-pending-payment-orders` is a thin service-role wrapper.

-- ─── TTL constant (D92): 10 minutes after order creation ───────────────────

ALTER TABLE public.orders
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '10 minutes');

-- Clamp existing online pending rows so the new TTL applies without waiting
-- for the old 30-minute default.
UPDATE public.orders
SET expires_at = created_at + interval '10 minutes',
    updated_at = now()
WHERE status = 'pending_payment'
  AND channel = 'online'
  AND (
    expires_at IS NULL
    OR expires_at > created_at + interval '10 minutes'
  );

CREATE INDEX IF NOT EXISTS idx_orders_pending_payment_expires
  ON public.orders (expires_at)
  WHERE status = 'pending_payment' AND channel = 'online';

-- ─── Batch expire RPC ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.expire_due_pending_payment_orders()
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
  v_hold_uuid uuid;
  v_now timestamptz := now();
  v_product_id uuid;
BEGIN
  FOR r IN
    SELECT o.id, o.public_code, o.status::text AS order_status
    FROM public.orders o
    WHERE o.status = 'pending_payment'
      AND o.channel = 'online'
      AND o.expires_at IS NOT NULL
      AND o.expires_at <= v_now
    ORDER BY o.expires_at ASC
    FOR UPDATE OF o SKIP LOCKED
  LOOP
    BEGIN
      -- Converted Hold Session linked at checkout (SN-02 / SN-04).
      SELECT hs.id
      INTO v_hold_uuid
      FROM public.hold_sessions hs
      WHERE hs.checkout_order_id = r.id
        AND hs.status = 'converted'
      LIMIT 1
      FOR UPDATE OF hs;

      IF v_hold_uuid IS NOT NULL THEN
        -- Clears hold_items + restores available; converted status stays
        -- converted (same pattern as SN-13 Override).
        PERFORM public._finalize_hold_session(
          v_hold_uuid,
          'cancelled',
          'system',
          NULL,
          'payment_ttl',
          'pending_payment TTL expired for order ' || r.public_code
        );
      ELSE
        -- Orphan projection repair: order_items still projected hold without
        -- a converted session claim (should be rare).
        FOR v_product_id IN
          SELECT oi.product_id
          FROM public.order_items oi
          WHERE oi.order_id = r.id
            AND oi.product_id IS NOT NULL
        LOOP
          IF NOT EXISTS (
            SELECT 1
            FROM public.hold_items hi
            JOIN public.hold_sessions hs ON hs.id = hi.hold_session_id
            WHERE hi.product_id = v_product_id
              AND hs.status IN ('active', 'converted')
          ) THEN
            UPDATE public.products p
            SET status = 'available',
                updated_at = v_now
            WHERE p.id = v_product_id
              AND p.status = 'hold';

            IF FOUND THEN
              PERFORM public.emit_product_status_event(
                v_product_id,
                'hold',
                'available',
                'system',
                NULL,
                'payment_ttl',
                r.id,
                'Orphan hold projection cleared on pending_payment TTL'
              );
            END IF;
          END IF;
        END LOOP;
      END IF;

      UPDATE public.orders
      SET status = 'cancelled',
          payment_status = 'cancelled',
          cancelled_at = v_now,
          updated_at = v_now
      WHERE id = r.id
        AND status = 'pending_payment';

      IF FOUND THEN
        INSERT INTO public.order_events (
          order_id,
          event_type,
          old_value,
          new_value,
          actor_type,
          notes
        ) VALUES (
          r.id,
          'cancelled_by_payment_ttl',
          coalesce(r.order_status, 'pending_payment'),
          'cancelled',
          'system',
          'Auto-cancelled pending_payment after 10 minute TTL'
        );

        v_expired := v_expired + 1;
        v_ids := array_append(v_ids, r.id);
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_failed := v_failed + 1;
        RAISE WARNING 'expire_due_pending_payment_orders failed for %: %',
          r.id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'ok',
    'expired_count', v_expired,
    'failed_count', v_failed,
    'order_ids', to_jsonb(v_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_due_pending_payment_orders() FROM PUBLIC;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.expire_due_pending_payment_orders() TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.expire_due_pending_payment_orders() IS
  'Issue #99: cancel due online pending_payment orders; release Hold via SN-02 _finalize_hold_session (D92).';

-- Schedule every 1 minute (10 min TTL; tighter than hold expire */5).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-pending-payment-orders') THEN
    PERFORM cron.unschedule('expire-pending-payment-orders');
  END IF;

  PERFORM cron.schedule(
    'expire-pending-payment-orders',
    '* * * * *',
    $cron$SELECT public.expire_due_pending_payment_orders();$cron$
  );
END $$;

-- T13 / D14: atomic reserve RPC.
--
-- Deletes any expired reservation for the same product_id and inserts a new
-- row in a single transaction (plain UNIQUE on product_id cannot use
-- `WHERE expires_at > now()` — see docs/09-decisions.md D14).
--
-- Returns the reservation row, or zero rows when the product is unavailable
-- / already held by another active reservation.

CREATE OR REPLACE FUNCTION public.reserve_cart_product(
  p_product_id uuid,
  p_session_id text
)
RETURNS SETOF public.cart_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_product_id IS NULL OR p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RETURN;
  END IF;

  -- Idempotent: same session already holds an active reservation for this piece.
  RETURN QUERY
  SELECT r.*
  FROM public.cart_reservations r
  WHERE r.product_id = p_product_id
    AND r.session_id = p_session_id
    AND r.expires_at > now();

  IF FOUND THEN
    RETURN;
  END IF;

  -- D14: clear logically expired row so UNIQUE (product_id) does not block us
  -- while pg_cron (every 5 min) has not swept yet.
  DELETE FROM public.cart_reservations
  WHERE product_id = p_product_id
    AND expires_at <= now();

  -- Atomic insert from docs/04-data-model.md (status + quantity + no active hold).
  RETURN QUERY
  INSERT INTO public.cart_reservations (product_id, session_id)
  SELECT p.id, p_session_id
  FROM public.products p
  WHERE p.id = p_product_id
    AND p.status = 'available'
    AND p.quantity > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.cart_reservations r
      WHERE r.product_id = p.id
        AND r.expires_at > now()
    )
  RETURNING *;
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent winner took the UNIQUE (product_id) slot.
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_cart_product(uuid, text) FROM PUBLIC;

-- `service_role` existe no Supabase hosted; em Postgres local de CI/dev pode não.
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.reserve_cart_product(uuid, text) TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

COMMENT ON FUNCTION public.reserve_cart_product(uuid, text) IS
  'T13: atomically reserve a product for a cart session (D14 expired-row cleanup + INSERT WHERE NOT EXISTS).';

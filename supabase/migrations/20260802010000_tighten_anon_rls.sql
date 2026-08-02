-- Soft-launch hardening: remove overly-permissive anon RLS.
-- Cart/checkout already use service_role (D13). Open SELECT/DELETE via the
-- publishable anon key would expose PII and allow clearing any reservation.

DROP POLICY IF EXISTS "cart_reservations_anon_delete" ON public.cart_reservations;
DROP POLICY IF EXISTS "cart_reservations_anon_insert" ON public.cart_reservations;

DROP POLICY IF EXISTS "customers_anon_select" ON public.customers;
DROP POLICY IF EXISTS "customers_anon_insert" ON public.customers;

DROP POLICY IF EXISTS "addresses_anon_select" ON public.addresses;
DROP POLICY IF EXISTS "addresses_anon_insert" ON public.addresses;

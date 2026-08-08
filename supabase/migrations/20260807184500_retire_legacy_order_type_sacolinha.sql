-- #123 / D101 / D113 — Retire legacy order_type = 'sacolinha' writes.
-- Business Sacolinha = paid inventory bag per Customer (D60), NOT this enum value.
-- PostgreSQL cannot drop an enum label safely without recreating the type;
-- we normalize rows and block new writes via CHECK. Enum label remains for history.

-- Normalize any legacy rows (idempotent).
UPDATE public.orders
SET order_type = 'standard'
WHERE order_type = 'sacolinha';

COMMENT ON TYPE public.order_type IS
  'Order classification. Label sacolinha is LEGACY (D11 misconception of monthly consignação) and must not be written. Business Sacolinha = paid inventory bag (D60/D101/D113), modelled outside this enum.';

COMMENT ON COLUMN public.orders.order_type IS
  'Always use standard for new orders. Legacy enum value sacolinha is retired by orders_order_type_no_legacy_sacolinha (#123).';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_type_no_legacy_sacolinha;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_type_no_legacy_sacolinha
  CHECK (order_type <> 'sacolinha'::public.order_type);

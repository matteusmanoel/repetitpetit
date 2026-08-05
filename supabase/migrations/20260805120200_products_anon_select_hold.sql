-- #97 — Catálogo / PDP Reservada: anon pode SELECT peças em hold.
-- Exibe "Reservada" sem expor hold_sessions, hold_items, PII ou secrets.
-- Liberação continua só via SN-02 RPCs (service_role). Orchestrator applies remotely.

DROP POLICY IF EXISTS "products_anon_select" ON public.products;
CREATE POLICY "products_anon_select" ON public.products
  FOR SELECT TO anon
  USING (status IN ('available', 'hold'));

COMMENT ON POLICY "products_anon_select" ON public.products IS
  'Public catalog/PDP: available + hold (Reservada). sold/inactive stay hidden.';

DROP POLICY IF EXISTS "product_images_anon_select" ON public.product_images;
CREATE POLICY "product_images_anon_select" ON public.product_images
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND p.status IN ('available', 'hold')
    )
  );

COMMENT ON POLICY "product_images_anon_select" ON public.product_images IS
  'Gallery for public PDP of available and hold Peças (#97).';

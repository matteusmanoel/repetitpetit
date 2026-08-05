-- #112 — Storefront RLS: mesma vitrine pública para anon e authenticated.
-- Admin logado (JWT authenticated) lê home/catálogo/PDP via createServerSupabaseClient.
-- Predicados idênticos ao SELECT anon; writes sensíveis continuam service_role/admin.
-- Padrão: FOR SELECT TO anon, authenticated (igual storage product_images).

-- products (D95: available | hold)
DROP POLICY IF EXISTS "products_anon_select" ON public.products;
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT TO anon, authenticated
  USING (status IN ('available', 'hold'));

COMMENT ON POLICY "products_public_select" ON public.products IS
  'Public storefront (#112): available + hold for anon and authenticated. sold/inactive hidden.';

-- product_images
DROP POLICY IF EXISTS "product_images_anon_select" ON public.product_images;
CREATE POLICY "product_images_public_select" ON public.product_images
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND p.status IN ('available', 'hold')
    )
  );

COMMENT ON POLICY "product_images_public_select" ON public.product_images IS
  'Gallery for public PDP of available|hold (#112) for anon and authenticated.';

-- categories
DROP POLICY IF EXISTS "categories_anon_select" ON public.categories;
CREATE POLICY "categories_public_select" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- banners
DROP POLICY IF EXISTS "banners_anon_select" ON public.banners;
CREATE POLICY "banners_public_select" ON public.banners
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- settings
DROP POLICY IF EXISTS "settings_anon_select" ON public.settings;
CREATE POLICY "settings_public_select" ON public.settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- shipping_rules
DROP POLICY IF EXISTS "shipping_rules_anon_select" ON public.shipping_rules;
CREATE POLICY "shipping_rules_public_select" ON public.shipping_rules
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

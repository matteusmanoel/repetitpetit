-- SO-02 P1 / D104 / #127 — knobs de frete haversine na tabela settings
-- ViaCEP resolve endereço; coordenadas (lat/lng) da loja ficam cacheadas
-- após geocode no admin. Fórmula: max(min, km × taxa × multiplicador).

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS store_postal_code char(8),
  ADD COLUMN IF NOT EXISTS store_latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS store_longitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS delivery_rate_per_km numeric(10, 2) NOT NULL DEFAULT 2.50,
  ADD COLUMN IF NOT EXISTS delivery_multiplier numeric(10, 2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS delivery_min_amount numeric(10, 2) NOT NULL DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS delivery_max_radius_km numeric(10, 2) NOT NULL DEFAULT 15.00;

ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_delivery_rate_per_km_check,
  DROP CONSTRAINT IF EXISTS settings_delivery_multiplier_check,
  DROP CONSTRAINT IF EXISTS settings_delivery_min_amount_check,
  DROP CONSTRAINT IF EXISTS settings_delivery_max_radius_km_check;

ALTER TABLE public.settings
  ADD CONSTRAINT settings_delivery_rate_per_km_check
    CHECK (delivery_rate_per_km >= 0),
  ADD CONSTRAINT settings_delivery_multiplier_check
    CHECK (delivery_multiplier > 0),
  ADD CONSTRAINT settings_delivery_min_amount_check
    CHECK (delivery_min_amount >= 0),
  ADD CONSTRAINT settings_delivery_max_radius_km_check
    CHECK (delivery_max_radius_km > 0);

COMMENT ON COLUMN public.settings.store_postal_code IS
  'CEP da loja (8 dígitos) — origem do haversine (D104).';
COMMENT ON COLUMN public.settings.store_latitude IS
  'Latitude WGS84 da loja (cache após geocode do CEP).';
COMMENT ON COLUMN public.settings.store_longitude IS
  'Longitude WGS84 da loja (cache após geocode do CEP).';
COMMENT ON COLUMN public.settings.delivery_rate_per_km IS
  'Taxa R$/km para frete imediato.';
COMMENT ON COLUMN public.settings.delivery_multiplier IS
  'Multiplicador aplicado sobre km × taxa.';
COMMENT ON COLUMN public.settings.delivery_min_amount IS
  'Frete mínimo em R$.';
COMMENT ON COLUMN public.settings.delivery_max_radius_km IS
  'Raio máximo em km; fora = só Sacolinha.';

-- Seed operacional só quando a loja ainda não tem origem geocodificada.
-- CEP próximo à Av. República Argentina (pickup_address do seed).
UPDATE public.settings
SET
  store_postal_code = '85851207',
  store_latitude = -25.5344006,
  store_longitude = -54.5794834,
  updated_at = now()
WHERE store_postal_code IS NULL
  AND store_latitude IS NULL
  AND store_longitude IS NULL;

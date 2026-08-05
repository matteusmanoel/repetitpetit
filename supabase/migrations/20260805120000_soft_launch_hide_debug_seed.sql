-- Soft-launch polish (#100): hide debug/E2E/agent test pieces and test banners
-- from the public storefront. Idempotent — safe to re-run.

-- Debug / E2E / T10 agent pieces created by verify scripts (not catalog seed).
UPDATE public.products
SET
  status = 'inactive',
  is_featured = false,
  updated_at = now()
WHERE status IS DISTINCT FROM 'inactive'
  AND (
    slug ~* '^(debug|e2e|t10-agente)(-|$)'
    OR name ~* '^(Debug|E2E UI)\b'
    OR name ~* '^Pe[cç]a teste T10'
  );

-- Admin "Teste" banners must not become the home hero.
UPDATE public.banners
SET is_active = false
WHERE is_active = true
  AND (
    title ~* '^(teste|test)\b'
    OR title ILIKE '%teste%'
    OR subtitle ILIKE '%testando%'
    OR cta_label ILIKE '%testado%'
  );

COMMENT ON TABLE public.products IS
  'Peças do catálogo. Soft-launch: produtos debug/E2E de scripts ficam inactive (migration 20260805120000).';

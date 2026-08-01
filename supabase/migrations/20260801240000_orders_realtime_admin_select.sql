-- T19 / D47 — Fila de fulfillment com Supabase Realtime
--
-- Realtime `postgres_changes` só entrega linhas que o assinante pode SELECT
-- (RLS). Até aqui `orders` só tinha policy para `service_role` (D13), então o
-- browser do admin nunca receberia eventos. Esta migration:
--   1. Expõe `is_active_admin()` (SECURITY DEFINER) para policies
--   2. Concede SELECT em `orders` a `authenticated` quando o usuário é admin ativo
--   3. Inclui `orders` na publication `supabase_realtime`
--   4. Define REPLICA IDENTITY FULL para filtros/UPDATE pelo NEW row
--
-- Escrita continua exclusiva de service_role (D13). order_items/customers
-- permanecem sem SELECT authenticated — o card completo é montado via
-- service role no server (SSR + server action de enriquecimento).

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE auth_user_id = auth.uid()
      AND is_active = true
  );
$$;

COMMENT ON FUNCTION public.is_active_admin() IS
  'True quando auth.uid() corresponde a um admin ativo. Usado em RLS SELECT para Realtime (T19).';

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO service_role;

CREATE POLICY "orders_admin_select" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

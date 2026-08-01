-- Repeti Petit — Modelo de dados completo
-- Ref.: docs/04-data-model.md
--
-- Decisões aplicadas nesta migration (ver docs/09-decisions.md):
--   D13 — anon INSERT em orders/order_items/payments foi REMOVIDO. Todo write
--         nessas três tabelas passa exclusivamente por server actions com
--         SUPABASE_SERVICE_ROLE_KEY, alinhado ao fluxo de checkout descrito em
--         docs/03-architecture.md.
--   D14 — uq_reservation_product permanece um índice único "plain" (sem
--         predicado). Um índice parcial com `WHERE expires_at > now()` foi
--         testado e rejeitado pelo Postgres ("functions in index predicate
--         must be marked IMMUTABLE"), então não é uma opção viável. A rotina
--         de reserva atômica (ticket #13) é responsável por apagar a reserva
--         expirada da mesma peça dentro da mesma statement do INSERT.

-- ════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ════════════════════════════════════════════════════════════════════════════

-- Status do produto
CREATE TYPE product_status AS ENUM (
  'available',    -- visível no catálogo, disponível para compra
  'reserved',     -- reservado no carrinho (TTL ativo)
  'sold',         -- vendido, não aparece no catálogo
  'inactive'      -- oculto pelo admin (sem remover)
);

-- Condição do produto (brechó)
CREATE TYPE product_condition AS ENUM (
  'novo',              -- com etiqueta, nunca usado
  'seminovo',          -- usado poucas vezes, sem marcas
  'bom_estado',        -- usado com pequenas marcas aceitáveis
  'com_detalhes'       -- marcas visíveis, descritas na peça
);

-- Gênero
CREATE TYPE product_gender AS ENUM (
  'menino',
  'menina',
  'unissex'
);

-- Grupo de tamanho (para filtro rápido)
CREATE TYPE size_group AS ENUM (
  'rn_3m',    -- RN a 3 meses
  '3_6m',
  '6_12m',
  '12_18m',
  '18_24m',
  '2_3a',
  '4_5a',
  '6_8a',
  '9_12a',
  '13_mais'
);

-- Tipo de fulfillment
CREATE TYPE fulfillment_type AS ENUM ('pickup', 'delivery', 'correios');

-- Status do pedido
CREATE TYPE order_status AS ENUM (
  'pending_payment',   -- aguardando pagamento
  'paid',              -- MP confirmou — entra na fila do admin
  'confirmed',         -- lojista conferiu e está separando
  'ready_for_pickup',  -- pronto para retirada
  'shipped',           -- enviado pelos Correios
  'completed',         -- entregue / retirado / concluído
  'cancelled',         -- cancelado pelo admin
  'expired'            -- não pago no prazo
);

-- Tipo de pedido (extensível para Sacolinha)
CREATE TYPE order_type AS ENUM ('standard', 'sacolinha');

-- Status do pagamento
CREATE TYPE payment_status AS ENUM (
  'pending', 'authorized', 'paid', 'expired', 'cancelled', 'failed', 'refunded'
);

-- Provider de pagamento
CREATE TYPE payment_provider AS ENUM ('mercado_pago');

-- Status de intake (desapego)
CREATE TYPE intake_status AS ENUM ('new', 'reviewing', 'accepted', 'rejected', 'completed');

-- ════════════════════════════════════════════════════════════════════════════
-- TABELAS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name    text NOT NULL DEFAULT 'Repeti Petit',
  support_phone text,           -- número WhatsApp sem formatação (554599999999)
  support_email text,
  pickup_address text,
  pickup_enabled  boolean NOT NULL DEFAULT true,
  delivery_enabled boolean NOT NULL DEFAULT true,
  correios_enabled boolean NOT NULL DEFAULT false,
  logo_url      text,
  theme_json    jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admins (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL UNIQUE,
  full_name    text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  image_url   text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid REFERENCES categories(id) ON DELETE SET NULL,
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  description     text,           -- texto livre com medidas, marcas, observações
  price           numeric(10,2) NOT NULL CHECK (price > 0),
  compare_at_price numeric(10,2), -- preço original (riscado)
  cover_image_url text,
  brand           text,           -- ex.: "GAP", "Zara", "Carter's"
  size_label      text NOT NULL,  -- ex.: "2 anos", "P", "12-18m"
  size_group      size_group NOT NULL,
  gender          product_gender NOT NULL DEFAULT 'unissex',
  condition       product_condition NOT NULL DEFAULT 'seminovo',
  status          product_status NOT NULL DEFAULT 'available',
  quantity        int NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  is_featured     boolean NOT NULL DEFAULT false,
  tags            text[],         -- ex.: '{inverno, casaco, moletom}'
  metadata_json   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_size_group ON products(size_group);
CREATE INDEX idx_products_gender ON products(gender);
CREATE INDEX idx_products_slug ON products(slug);

CREATE TABLE product_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url  text NOT NULL,
  alt_text   text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- D14: índice único "plain" — ver nota no topo do arquivo e docs/09-decisions.md.
-- Ticket #13 deve apagar a reserva expirada da mesma peça (DELETE ... WHERE
-- product_id = $1 AND expires_at <= now()) na mesma statement/transação do
-- INSERT da reserva atômica descrita em docs/04-data-model.md.
CREATE TABLE cart_reservations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  session_id  text NOT NULL,       -- cookie anônimo do browser
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '20 minutes'),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_reservation_product UNIQUE (product_id) -- apenas 1 reserva ativa por peça
);

CREATE INDEX idx_reservations_session ON cart_reservations(session_id);
CREATE INDEX idx_reservations_expires ON cart_reservations(expires_at);

CREATE TABLE customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  text NOT NULL,
  phone      text NOT NULL,   -- formato: 5545999999999
  email      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  street         text NOT NULL,
  number         text NOT NULL,
  complement     text,
  neighborhood   text NOT NULL,
  city           text NOT NULL,
  state          char(2) NOT NULL,
  postal_code    char(8) NOT NULL,  -- somente números
  reference      text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shipping_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,      -- ex.: "Entrega Foz do Iguaçu"
  rule_type   text NOT NULL DEFAULT 'fixed',
  amount      numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  metadata_json jsonb,            -- cidades, CEPs, etc.
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_code             text NOT NULL UNIQUE, -- ex.: "RP-2024-0042"
  customer_id             uuid REFERENCES customers(id),
  order_type              order_type NOT NULL DEFAULT 'standard',
  status                  order_status NOT NULL DEFAULT 'pending_payment',
  payment_status          payment_status NOT NULL DEFAULT 'pending',
  fulfillment_type        fulfillment_type NOT NULL,
  shipping_rule_id        uuid REFERENCES shipping_rules(id),
  shipping_amount         numeric(10,2) NOT NULL DEFAULT 0,
  subtotal_amount         numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount         numeric(10,2) NOT NULL DEFAULT 0,
  total_amount            numeric(10,2) NOT NULL DEFAULT 0,
  customer_note           text,
  address_snapshot_json   jsonb,   -- snapshot do endereço no momento do pedido
  pricing_snapshot_json   jsonb,   -- snapshot dos preços
  admin_note              text,
  tracking_code           text,    -- código dos Correios
  estimated_fulfillment   text,    -- prazo em texto livre para o cliente
  mp_preference_id        text,
  mp_payment_id           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  paid_at                 timestamptz,
  confirmed_at            timestamptz,
  completed_at            timestamptz,
  cancelled_at            timestamptz,
  expires_at              timestamptz DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_public_code ON orders(public_code);
CREATE INDEX idx_orders_customer ON orders(customer_id);

CREATE TABLE order_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id            uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  product_slug_snapshot text,
  unit_price_snapshot   numeric(10,2) NOT NULL,
  cover_image_snapshot  text,
  quantity              int NOT NULL DEFAULT 1,
  line_total            numeric(10,2) NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider              payment_provider NOT NULL DEFAULT 'mercado_pago',
  provider_payment_id   text,
  provider_preference_id text,
  status                payment_status NOT NULL DEFAULT 'pending',
  amount                numeric(10,2) NOT NULL,
  expires_at            timestamptz,
  paid_at               timestamptz,
  raw_payload_json      jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type     text NOT NULL,   -- ex.: 'status_changed', 'note_added', 'shipped'
  old_value      text,
  new_value      text,
  actor_type     text,            -- 'admin' | 'system' | 'buyer'
  actor_id       uuid,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE banners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text,
  subtitle   text,
  image_url  text NOT NULL,
  cta_label  text,
  cta_href   text,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE intake_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       text NOT NULL,
  phone           text NOT NULL,
  email           text,
  item_count      int,
  description     text,           -- texto livre sobre as peças
  preferred_method text,          -- 'entrega_na_loja' | 'envio_pelos_correios'
  status          intake_status NOT NULL DEFAULT 'new',
  admin_notes     text,
  whatsapp_sent   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE intake_photos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_request_id uuid NOT NULL REFERENCES intake_requests(id) ON DELETE CASCADE,
  image_url         text NOT NULL,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  source     text NOT NULL DEFAULT 'popup_first_scroll',
  converted  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_leads_email ON leads(email);

CREATE TABLE imports_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name       text NOT NULL,
  import_type     text NOT NULL DEFAULT 'products_xlsx',
  status          text NOT NULL DEFAULT 'pending',
  total_rows      int,
  imported_rows   int,
  failed_rows     int,
  error_report_json jsonb,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
--
-- Postura geral: RLS habilitado em todas as tabelas. `anon` só recebe as
-- policies explicitamente listadas na tabela de postura de docs/04-data-model.md
-- (com a exceção de orders/order_items/payments — ver D13 abaixo). Tabelas sem
-- menção a `anon` na postura (product_images, order_events, imports_log) não
-- recebem nenhuma policy para `anon`, ficando totalmente bloqueadas por padrão.
-- `service_role` recebe policy explícita de acesso total em toda tabela (além
-- do bypass de RLS já concedido à role pela plataforma Supabase).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports_log ENABLE ROW LEVEL SECURITY;

-- ─── products: SELECT WHERE status = 'available' ────────────────────────────
CREATE POLICY "products_anon_select" ON products
  FOR SELECT TO anon
  USING (status = 'available');

CREATE POLICY "products_service_role_all" ON products
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── product_images: SELECT apenas de imagens de produtos disponíveis ───────
-- (não listado na tabela de postura; segue o mesmo critério de products,
-- necessário para renderizar a galeria da PDP publicamente)
CREATE POLICY "product_images_anon_select" ON product_images
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_images.product_id
        AND p.status = 'available'
    )
  );

CREATE POLICY "product_images_service_role_all" ON product_images
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── categories: SELECT WHERE is_active = true ──────────────────────────────
CREATE POLICY "categories_anon_select" ON categories
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "categories_service_role_all" ON categories
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── banners: SELECT WHERE is_active = true ─────────────────────────────────
CREATE POLICY "banners_anon_select" ON banners
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "banners_service_role_all" ON banners
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── settings: SELECT ────────────────────────────────────────────────────────
CREATE POLICY "settings_anon_select" ON settings
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "settings_service_role_all" ON settings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── shipping_rules: SELECT WHERE is_active = true ──────────────────────────
CREATE POLICY "shipping_rules_anon_select" ON shipping_rules
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "shipping_rules_service_role_all" ON shipping_rules
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── customers: INSERT, SELECT por phone/email ──────────────────────────────
-- Sem sessão autenticada, `anon` não tem como provar identidade — a
-- restrição "por phone/email" é aplicada pelo próprio cliente via filtro de
-- query (?phone=eq....), não pela policy. Ver docs/09-decisions.md nota em D13
-- sobre o porquê de não estender a mesma restrição de service-role a esta
-- tabela (fora do escopo desta decisão).
CREATE POLICY "customers_anon_insert" ON customers
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "customers_anon_select" ON customers
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "customers_service_role_all" ON customers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── addresses: INSERT, SELECT por customer_id ──────────────────────────────
CREATE POLICY "addresses_anon_insert" ON addresses
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "addresses_anon_select" ON addresses
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "addresses_service_role_all" ON addresses
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── cart_reservations: INSERT, DELETE por session_id ───────────────────────
CREATE POLICY "cart_reservations_anon_insert" ON cart_reservations
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "cart_reservations_anon_delete" ON cart_reservations
  FOR DELETE TO anon
  USING (true);

CREATE POLICY "cart_reservations_service_role_all" ON cart_reservations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── leads: INSERT ───────────────────────────────────────────────────────────
CREATE POLICY "leads_anon_insert" ON leads
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "leads_service_role_all" ON leads
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── intake_requests: INSERT ─────────────────────────────────────────────────
CREATE POLICY "intake_requests_anon_insert" ON intake_requests
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "intake_requests_service_role_all" ON intake_requests
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── intake_photos: INSERT ───────────────────────────────────────────────────
CREATE POLICY "intake_photos_anon_insert" ON intake_photos
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "intake_photos_service_role_all" ON intake_photos
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── admins: nenhum acesso anon ──────────────────────────────────────────────
CREATE POLICY "admins_service_role_all" ON admins
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── orders / order_items / payments ─────────────────────────────────────────
-- D13 (docs/09-decisions.md): anon INSERT foi removido nas três tabelas.
-- Todo write de pedido/pagamento passa exclusivamente por server actions com
-- `createServiceSupabaseClient()`, que valida estoque, recalcula preços e
-- confere reservas antes de gravar — em vez de confiar em valores enviados
-- pelo cliente. `anon` não recebe NENHUMA policy nestas três tabelas.
CREATE POLICY "orders_service_role_all" ON orders
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "order_items_service_role_all" ON order_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "payments_service_role_all" ON payments
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── order_events: apenas service_role (tabela de auditoria interna) ────────
CREATE POLICY "order_events_service_role_all" ON order_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── imports_log: apenas service_role (ferramenta interna de admin) ─────────
CREATE POLICY "imports_log_service_role_all" ON imports_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- pg_cron: sweep de reservas expiradas
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;

SELECT cron.schedule(
  'release-expired-reservations',
  '*/5 * * * *',
  $$
    DELETE FROM cart_reservations
    WHERE expires_at <= now();
  $$
);

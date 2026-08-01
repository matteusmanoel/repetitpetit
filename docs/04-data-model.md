# 04 — Modelo de Dados

## Enums

```sql
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
```

---

## Tabelas

### settings

```sql
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
```

### admins

```sql
CREATE TABLE admins (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL UNIQUE,
  full_name    text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

### categories

```sql
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
```

### products

```sql
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
```

### product_images

```sql
CREATE TABLE product_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url  text NOT NULL,
  alt_text   text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### cart_reservations

```sql
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
```

### Reserva atômica (SQL crítico)

```sql
-- Chamado em /api/cart/reserve
-- Retorna a reserva criada ou NULL se produto indisponível / já reservado
INSERT INTO cart_reservations (product_id, session_id)
SELECT p.id, $2
FROM products p
WHERE p.id = $1
  AND p.status = 'available'
  AND p.quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM cart_reservations r
    WHERE r.product_id = p.id
      AND r.expires_at > now()
  )
RETURNING *;
```

### pg_cron: sweep de reservas expiradas

```sql
-- Executar a cada 5 minutos via Supabase pg_cron
SELECT cron.schedule(
  'release-expired-reservations',
  '*/5 * * * *',
  $$
    DELETE FROM cart_reservations
    WHERE expires_at <= now();
  $$
);
```

### customers

```sql
CREATE TABLE customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  text NOT NULL,
  phone      text NOT NULL,   -- formato: 5545999999999
  email      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### addresses

```sql
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
```

### shipping_rules

```sql
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
```

### orders

```sql
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
```

### order_items

```sql
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
```

### payments

```sql
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
```

### order_events

```sql
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
```

### banners

```sql
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
```

### intake_requests (desapego)

```sql
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
```

### intake_photos

```sql
CREATE TABLE intake_photos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_request_id uuid NOT NULL REFERENCES intake_requests(id) ON DELETE CASCADE,
  image_url         text NOT NULL,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

### leads (lead capture popup)

```sql
CREATE TABLE leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  source     text NOT NULL DEFAULT 'popup_first_scroll',
  converted  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_leads_email ON leads(email);
```

### imports_log

```sql
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
```

---

## Postura de RLS

| Tabela | anon (público) | service_role (server actions/webhooks) |
|---|---|---|
| `products` | SELECT WHERE status = 'available' | full access |
| `categories` | SELECT WHERE is_active = true | full access |
| `banners` | SELECT WHERE is_active = true | full access |
| `orders` | INSERT (criar pedido) | full access |
| `order_items` | INSERT (ao criar pedido) | full access |
| `payments` | INSERT (ao criar pedido) | full access |
| `customers` | INSERT, SELECT por phone/email | full access |
| `addresses` | INSERT, SELECT por customer_id | full access |
| `cart_reservations` | INSERT, DELETE por session_id | full access |
| `leads` | INSERT | full access |
| `intake_requests` | INSERT | full access |
| `intake_photos` | INSERT | full access |
| `admins` | nenhum | full access |
| `settings` | SELECT | full access |
| `shipping_rules` | SELECT WHERE is_active = true | full access |

Todas as operações sensíveis (CRUD admin, webhook, sincronização de pagamento)
usam `SUPABASE_SERVICE_ROLE_KEY` via `createServiceSupabaseClient()`.

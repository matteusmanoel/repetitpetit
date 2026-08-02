-- Repeti Petit — Development Seed
-- Applies after all migrations are in place
-- Run via: supabase db reset OR execute via Supabase MCP execute_sql

-- ─── Settings ────────────────────────────────────────────────────────────────
INSERT INTO settings (store_name, support_phone, support_email, pickup_address, pickup_enabled, delivery_enabled, correios_enabled)
VALUES (
  'Repeti Petit',
  '554545999999999',
  'contato@repetipetit.com.br',
  'Av. República Argentina, 2554 — Foz do Iguaçu, PR',
  true,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- ─── Shipping rules ──────────────────────────────────────────────────────────
INSERT INTO shipping_rules (name, rule_type, amount, description, is_active, sort_order, metadata_json) VALUES
  ('Retirada na loja', 'fixed', 0.00, 'Retire em até 4h úteis', true, 0, '{"type":"pickup"}'),
  ('Entrega em Foz do Iguaçu', 'fixed', 15.00, 'Entrega em até 24h úteis', true, 1, '{"cities":["Foz do Iguaçu"],"state":"PR"}'),
  ('Correios (PAC/SEDEX)', 'fixed', 25.00, 'Postado em até 1 dia útil após pagamento', false, 2, '{"type":"correios"}')
ON CONFLICT DO NOTHING;

-- ─── Categories ──────────────────────────────────────────────────────────────
INSERT INTO categories (name, slug, description, is_active, sort_order) VALUES
  ('Vestidos e Saias', 'vestidos-e-saias', 'Vestidos, saias e macacões para meninas', true, 1),
  ('Conjuntos', 'conjuntos', 'Conjuntos completos menino e menina', true, 2),
  ('Blusas e Camisetas', 'blusas-e-camisetas', 'Camisetas, body, polo e blusas', true, 3),
  ('Casacos e Moletons', 'casacos-e-moletons', 'Para o frio de Foz e além', true, 4),
  ('Calças e Leggings', 'calcas-e-leggings', 'Jeans, moletom, leggings', true, 5),
  ('Calçados', 'calcados', 'Tênis, sandálias, botinhas', true, 6),
  ('Acessórios', 'acessorios', 'Tiaras, bolsinhas, cintos e mais', true, 7)
ON CONFLICT (slug) DO NOTHING;

-- ─── Products ────────────────────────────────────────────────────────────────
-- 24 realistic thrift pieces covering gender × age × condition × brand

-- Helper: get category id
-- We use subqueries inline for portability

INSERT INTO products (name, slug, description, price, compare_at_price, cover_image_url, brand, size_label, size_group, gender, condition, status, quantity, is_featured) VALUES

-- MENINA RN–24m (6 peças)
('Vestido Xadrez Carter''s Menina', 'vestido-xadrez-carters-menina',
  'Vestido manga longa xadrez vermelho e branco. Ombro: 20cm | Peito: 23cm | Comprimento: 32cm. Estado excelente, usado poucas vezes.',
  45.00, NULL, 'https://placehold.co/400x533/FFE8E8/1A1A1A?text=Carter%27s', 'Carter''s', '9–12 meses', '6_12m', 'menina', 'seminovo', 'available', 1, true),

('Body Floral GAP Bebê', 'body-floral-gap-bebe',
  'Body manga curta estampa floral delicada. Ombro: 17cm | Peito: 20cm. Com etiqueta, nunca usado.',
  35.00, 79.90, 'https://placehold.co/400x533/E8F0FF/1A1A1A?text=GAP', 'GAP', '3–6 meses', '3_6m', 'menina', 'novo', 'available', 1, false),

('Macacão Veludo Rosa Carter''s', 'macacao-veludo-rosa-carters',
  'Macacão de veludo rosa bebê, zíper frontal. Conservação excelente. Ombro: 22cm | Comprimento: 45cm.',
  55.00, NULL, 'https://placehold.co/400x533/FFE8F5/1A1A1A?text=Carter%27s', 'Carter''s', '12–18 meses', '12_18m', 'menina', 'seminovo', 'available', 1, false),

('Vestido Festa Zara Menina', 'vestido-festa-zara-menina',
  'Vestido de festa tule branco com laço nas costas. Usado apenas uma vez. Ombro: 24cm | Comprimento: 48cm.',
  89.00, 189.00, 'https://placehold.co/400x533/F5F5F5/1A1A1A?text=Zara', 'Zara', '18–24 meses', '18_24m', 'menina', 'novo', 'available', 1, true),

('Conjunto Estampado GAP Menina', 'conjunto-estampado-gap-menina',
  'Conjunto calça legging + blusa manga longa, estampa florzinhas. Seminovo com leve desbotamento.',
  40.00, NULL, 'https://placehold.co/400x533/E8F0FF/1A1A1A?text=GAP', 'GAP', 'RN', 'rn_3m', 'menina', 'bom_estado', 'available', 1, false),

('Body Listrado Tommy Hilfiger Bebê', 'body-listrado-tommy-bebe',
  'Body de algodão listrado azul marinho e branco. Novo com etiqueta. Ombro: 16cm | Peito: 19cm.',
  48.00, 95.00, 'https://placehold.co/400x533/E8F5FF/1A1A1A?text=Tommy', 'Tommy Hilfiger', '0–3 meses', 'rn_3m', 'menina', 'novo', 'available', 1, false),

-- MENINO RN–24m (4 peças)
('Conjunto Polo Azul Zara Menino', 'conjunto-polo-azul-zara-menino',
  'Conjunto polo azul + bermuda bege. Seminovo em ótimo estado. Ombro: 22cm | Peito: 24cm.',
  52.00, NULL, 'https://placehold.co/400x533/E8F0FF/1A1A1A?text=Zara', 'Zara', '9–12 meses', '6_12m', 'menino', 'seminovo', 'available', 1, false),

('Macacão Jeans GAP Bebê Menino', 'macacao-jeans-gap-bebe-menino',
  'Macacão jeans com bordado de carrinhos. Pequena marca na manga esquerda, descrita. Comprimento: 52cm.',
  38.00, NULL, 'https://placehold.co/400x533/DCE8FF/1A1A1A?text=GAP', 'GAP', '12–18 meses', '12_18m', 'menino', 'bom_estado', 'available', 1, false),

('Moletom Nike Menino Bebê', 'moletom-nike-menino-bebe',
  'Moletom cinza com logo Nike bordado. Seminovo. Ombro: 20cm | Peito: 22cm.',
  65.00, 120.00, 'https://placehold.co/400x533/F0F0F0/1A1A1A?text=Nike', 'Nike', '18–24 meses', '18_24m', 'menino', 'seminovo', 'available', 1, false),

('Conjunto Listrado Adidas Menino', 'conjunto-listrado-adidas-menino',
  'Conjunto agasalho Adidas 3 listras. Calça + jaqueta. Novo com etiqueta.',
  95.00, 199.00, 'https://placehold.co/400x533/E8FFE8/1A1A1A?text=Adidas', 'Adidas', '6–12 meses', '6_12m', 'menino', 'novo', 'available', 1, true),

-- MENINA 2–5a (5 peças)
('Vestido Estampado Ralph Lauren 2 Anos', 'vestido-estampado-ralph-lauren-2a',
  'Vestido manga longa estampa xadrez Ralph Lauren. Ombro: 27cm | Comprimento: 55cm. Excelente estado.',
  110.00, 280.00, 'https://placehold.co/400x533/FFE8E8/1A1A1A?text=Ralph+Lauren', 'Ralph Lauren', '2 anos', '2_3a', 'menina', 'seminovo', 'available', 1, true),

('Casaco Pelucia Zara Girls 3 Anos', 'casaco-pelucia-zara-3a',
  'Casaco de pelúcia creme, botões. Comprimento: 40cm. Sem marcas, excelente conservação.',
  75.00, NULL, 'https://placehold.co/400x533/FFF8E8/1A1A1A?text=Zara', 'Zara', '3 anos', '2_3a', 'menina', 'seminovo', 'available', 1, false),

('Saia Tule Rosa Menina 4 Anos', 'saia-tule-rosa-4a',
  'Saia tutu rosa de festa, ajuste elástico. Comprimento: 35cm. Usada uma vez.',
  30.00, NULL, 'https://placehold.co/400x533/FFE8F5/1A1A1A?text=Sem+marca', NULL, '4 anos', '4_5a', 'menina', 'novo', 'available', 1, false),

('Legging Estampada GAP Girls 5 Anos', 'legging-estampada-gap-5a',
  'Legging com estampa de unicórnios. Algodão macio. Comprimento: 55cm. Bom estado.',
  25.00, NULL, 'https://placehold.co/400x533/E8F0FF/1A1A1A?text=GAP', 'GAP', '5 anos', '4_5a', 'menina', 'bom_estado', 'available', 1, false),

('Conjunto Carter''s Xadrez Menina 4–5 Anos', 'conjunto-carters-xadrez-4-5a',
  'Conjunto blusa manga longa + calça xadrez azul e branco. Seminovo.',
  55.00, NULL, 'https://placehold.co/400x533/FFE8E8/1A1A1A?text=Carter%27s', 'Carter''s', '4–5 anos', '4_5a', 'menina', 'seminovo', 'available', 1, false),

-- MENINO 2–5a (4 peças)
('Moletom Capuz Adidas Menino 3 Anos', 'moletom-capuz-adidas-3a',
  'Moletom Adidas com capuz e bolso canguru, preto. Ombro: 28cm | Peito: 30cm. Seminovo.',
  70.00, 150.00, 'https://placehold.co/400x533/E8FFE8/1A1A1A?text=Adidas', 'Adidas', '3 anos', '2_3a', 'menino', 'seminovo', 'available', 1, false),

('Bermuda Jeans GAP Menino 2 Anos', 'bermuda-jeans-gap-2a',
  'Bermuda jeans GAP detalhe bordado. Comprimento: 28cm. Bom estado com leve desbotamento.',
  28.00, NULL, 'https://placehold.co/400x533/DCE8FF/1A1A1A?text=GAP', 'GAP', '2 anos', '2_3a', 'menino', 'bom_estado', 'available', 1, false),

('Tênis Nike Menino 23', 'tenis-nike-menino-23',
  'Tênis Nike infantil branco, número 23. Sola com pouco uso. Lavar antes de usar.',
  80.00, 180.00, 'https://placehold.co/400x533/F0F0F0/1A1A1A?text=Nike', 'Nike', '23', '2_3a', 'menino', 'seminovo', 'available', 1, true),

('Camiseta Tommy Hilfiger Menino 4 Anos', 'camiseta-tommy-menino-4a',
  'Camiseta polo Tommy Hilfiger listrada. Comprimento: 44cm. Nova com etiqueta.',
  65.00, 140.00, 'https://placehold.co/400x533/E8F5FF/1A1A1A?text=Tommy', 'Tommy Hilfiger', '4 anos', '4_5a', 'menino', 'novo', 'available', 1, false),

-- UNISSEX 6–8a (3 peças)
('Tênis Nike Unissex 30', 'tenis-nike-unissex-30',
  'Tênis Nike Downshifter infantil, azul. Número 30. Seminovo, sola firme.',
  90.00, 200.00, 'https://placehold.co/400x533/F0F0F0/1A1A1A?text=Nike', 'Nike', '30', '6_8a', 'unissex', 'seminovo', 'available', 1, true),

('Moletom Cinza Tommy Hilfiger 6 Anos', 'moletom-tommy-6a',
  'Moletom com capuz Tommy Hilfiger, cinza mescla. Ombro: 33cm. Excelente estado.',
  88.00, 195.00, 'https://placehold.co/400x533/E8F5FF/1A1A1A?text=Tommy', 'Tommy Hilfiger', '6 anos', '6_8a', 'unissex', 'seminovo', 'available', 1, false),

('Jaqueta Impermeável GAP 8 Anos', 'jaqueta-impermeavel-gap-8a',
  'Jaqueta corta-vento impermeável GAP azul marinho. Comprimento: 50cm. Ótimo estado.',
  95.00, 220.00, 'https://placehold.co/400x533/E8F0FF/1A1A1A?text=GAP', 'GAP', '8 anos', '6_8a', 'unissex', 'seminovo', 'available', 1, false),

-- MENINA 9–12a (2 peças)
('Vestido Casual Shein Menina 10 Anos', 'vestido-casual-shein-10a',
  'Vestido midi estampa floral Shein. Comprimento: 85cm. Bom estado com leve desbotamento no colarinho.',
  22.00, NULL, 'https://placehold.co/400x533/FFE8E8/1A1A1A?text=Shein', 'Shein', '10 anos', '9_12a', 'menina', 'bom_estado', 'available', 1, false),

('Calça Jogger Renner Menina 12 Anos', 'calca-jogger-renner-12a',
  'Calça jogger cinza, tecido moletom leve. Comprimento: 85cm. Seminovo.',
  32.00, NULL, 'https://placehold.co/400x533/F0F0F0/1A1A1A?text=Renner', 'Renner', '12 anos', '9_12a', 'menina', 'seminovo', 'available', 1, false);

-- ─── Link products to categories ─────────────────────────────────────────────
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'vestidos-e-saias')
WHERE slug IN ('vestido-xadrez-carters-menina', 'vestido-festa-zara-menina', 'vestido-estampado-ralph-lauren-2a', 'saia-tule-rosa-4a', 'vestido-casual-shein-10a');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'conjuntos')
WHERE slug IN ('conjunto-estampado-gap-menina', 'conjunto-polo-azul-zara-menino', 'conjunto-listrado-adidas-menino', 'conjunto-carters-xadrez-4-5a');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'blusas-e-camisetas')
WHERE slug IN ('body-floral-gap-bebe', 'body-listrado-tommy-bebe', 'camiseta-tommy-menino-4a');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'casacos-e-moletons')
WHERE slug IN ('moletom-nike-menino-bebe', 'casaco-pelucia-zara-3a', 'moletom-capuz-adidas-3a', 'moletom-tommy-6a', 'jaqueta-impermeavel-gap-8a');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'calcas-e-leggings')
WHERE slug IN ('legging-estampada-gap-5a', 'bermuda-jeans-gap-2a', 'calca-jogger-renner-12a');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'calcados')
WHERE slug IN ('tenis-nike-menino-23', 'tenis-nike-unissex-30');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'conjuntos')
WHERE slug IN ('macacao-veludo-rosa-carters', 'macacao-jeans-gap-bebe-menino');

-- Remaining uncategorized → assign Conjuntos as fallback
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'conjuntos')
WHERE category_id IS NULL;

-- ─── Banners ─────────────────────────────────────────────────────────────────
INSERT INTO banners (title, subtitle, image_url, cta_label, cta_href, is_active, sort_order) VALUES
  (
    'Peças únicas esperando por você',
    'Marcas que você ama, preços que cabem no bolso',
    'https://placehold.co/1200x400/165DA4/FFFFFF?text=Repeti+Petit',
    'Ver catálogo',
    '/catalogo',
    true,
    1
  ),
  (
    'Desapegue conosco',
    'Seus filhos cresceram? A gente compra as peças que não cabem mais.',
    'https://placehold.co/1200x400/8EB038/FFFFFF?text=Desapegue+Conosco',
    'Quero desapegar',
    '/desapegue',
    true,
    2
  );

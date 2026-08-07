# 08 — Roadmap

## M0 — Scaffold e fundação

**Status**: concluído

- [x] Repo criado e vinculado ao GitHub
- [x] Supabase projeto vinculado (CLI + MCP)
- [x] Documentação de agentes completa
- [x] `.env.example`, `AGENTS.md`, `README.md`
- [x] mattpocock/skills instalado globalmente
- [x] Next.js app scaffolded (`create-next-app`)
- [x] Tailwind v4 + shadcn/ui configurados
- [x] `lib/env.ts` com validação Zod
- [x] `lib/supabase/{browser,server,server-service}.ts`
- [x] Migrations base aplicadas (enums + tabelas)
- [x] Tipos Supabase gerados (`lib/supabase/types.ts`)
- [x] Seed de desenvolvimento aplicado

## M1 — Catálogo público

**Status**: concluído (código em `develop`)

- [x] `categories` + `products` no DB (migration aplicada)
- [x] `/catalogo` com grid e filtros por query params
- [x] `/produto/[slug]` — PDP completa
- [x] Gallery com swipe mobile
- [x] Badge "Peça única"
- [x] Filtros: tamanho, gênero, faixa etária, marca, conservação, preço
- [x] Home: banners + últimas novidades + CTAs
- [x] Admin: CRUD de produtos e categorias + importação XLSX
- [x] Admin: CRUD de banners

## M2 — Carrinho, checkout e pagamento

**Status**: concluído (código em `develop`)

- [x] `cart_reservations` + reserva atômica
- [x] CartSheet com timer regressivo
- [x] `/checkout` com ViaCEP
- [x] Fulfillment: retirada / entrega / Correios
- [x] Integração Mercado Pago (Checkout Pro)
- [x] `/api/webhooks/mercadopago` com validação de assinatura
- [x] `/api/payments/sync`
- [x] `/pedido/[codigo]` — página pública
- [x] pg_cron sweep de reservas expiradas

## M3 — Admin e fila de fulfillment

**Status**: concluído (código em `develop`)

- [x] `/admin/pedidos` com Supabase Realtime + badge + som
- [x] Ação "Conferir e separar"
- [x] Atualização de status (pronto / enviado / concluído)
- [x] Campo de código de rastreio (Correios)
- [x] Dashboard admin básico (KPIs: pedidos pagos, em separação, enviados)
- [x] Auth de admin + reset de senha

## M4 — Desapego e lead capture

**Status**: concluído (código em `develop`)

- [x] `/desapegue` — formulário multi-step com upload de fotos
- [x] `intake_requests` + `intake_photos` no DB
- [x] Geração de mensagem WhatsApp pré-preenchida
- [x] Popup de lead capture (primeiro scroll)
- [x] `leads` no DB

## M5 — Soft launch (VIP WhatsApp)

**Status**: parcialmente concluído — detalhes e ações manuais em `docs/11-soft-launch.md`

- [ ] Smoke tests completos em mobile (375px) — path público + reserva OK @375px; E2E pago→webhook→fila ainda pendente
- [x] Performance: Lighthouse mobile ≥ 80 — local `/` = 92, `/catalogo` = 95 (revalidar no domínio público após deploy)
- [x] `.env` de produção configurado na Vercel
- [x] Webhook MP configurado em produção
- [x] Admin criado no Supabase Auth de produção (`admin@repetipetit.com.br` + `public.admins`)
- [ ] Seed de produtos reais carregado (XLSX) — hoje só o seed de desenvolvimento (~28 peças / placehold.co); `imports_log` vazio
- [ ] DNS / domínio configurado (ou Vercel domain temporário estável) — alias de produção (`NEXT_PUBLIC_SITE_URL`) retorna `DEPLOYMENT_NOT_FOUND`; builds de `develop` com Ignored Build Step
- [ ] Link enviado para grupo VIP

## Pós-MVP

| Feature             | Descrição                                                |
| ------------------- | -------------------------------------------------------- |
| Sacolinha (portal)  | Área do comprador: peças pagas aguardando retirada (D60/D101; Slice O) |
| WhatsApp AI         | Agente conversacional para suporte e vendas              |
| Motor de cupons     | Cupons reais vinculados a `leads`                        |
| Área do cliente     | Magic link + histórico completo (além do portal Sacolinha) |
| Notificações e-mail | Confirmação de pedido, atualização de status             |
| Avaliações          | Review de produtos pós-compra                            |
| Analytics           | Funil de conversão, produtos mais vistos                 |

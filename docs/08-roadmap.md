# 08 — Roadmap

## M0 — Scaffold e fundação (atual)

**Status**: em andamento (esta sessão)

- [x] Repo criado e vinculado ao GitHub
- [x] Supabase projeto vinculado (CLI + MCP)
- [x] Documentação de agentes completa
- [x] `.env.example`, `AGENTS.md`, `README.md`
- [x] mattpocock/skills instalado globalmente
- [x] Next.js app scaffolded (`create-next-app`)
- [x] Tailwind v4 + shadcn/ui configurados
- [x] `lib/env.ts` com validação Zod
- [x] `lib/supabase/{browser,server,server-service}.ts` (tipos ainda soltos — ticket 02)
- [ ] Migrations base aplicadas (enums + tabelas)
- [ ] Tipos Supabase gerados
- [ ] Seed de desenvolvimento aplicado

## M1 — Catálogo público

- [ ] `categories` + `products` no DB (migration aplicada)
- [ ] `/catalogo` com grid e filtros por query params
- [ ] `/produto/[slug]` — PDP completa
- [ ] Gallery com swipe mobile
- [ ] Badge "Peça única"
- [ ] Filtros: tamanho, gênero, faixa etária, marca, conservação, preço
- [ ] Home: banners + últimas novidades + CTAs
- [ ] Admin: CRUD de produtos e categorias + importação XLSX
- [ ] Admin: CRUD de banners

## M2 — Carrinho, checkout e pagamento

- [ ] `cart_reservations` + reserva atômica
- [ ] CartSheet com timer regressivo
- [ ] `/checkout` com ViaCEP
- [ ] Fulfillment: retirada / entrega / Correios
- [ ] Integração Mercado Pago (Checkout Pro)
- [ ] `/api/webhooks/mercadopago` com validação de assinatura
- [ ] `/api/payments/sync`
- [ ] `/pedido/[codigo]` — página pública
- [ ] pg_cron sweep de reservas expiradas

## M3 — Admin e fila de fulfillment

- [ ] `/admin/pedidos` com Supabase Realtime + badge + som
- [ ] Ação "Conferir e separar"
- [ ] Atualização de status (pronto / enviado / concluído)
- [ ] Campo de código de rastreio (Correios)
- [ ] Dashboard admin básico (KPIs: pedidos pagos, em separação, enviados)
- [ ] Auth de admin + reset de senha

## M4 — Desapego e lead capture

- [ ] `/desapegue` — formulário multi-step com upload de fotos
- [ ] `intake_requests` + `intake_photos` no DB
- [ ] Geração de mensagem WhatsApp pré-preenchida
- [ ] Popup de lead capture (primeiro scroll)
- [ ] `leads` no DB

## M5 — Soft launch (VIP WhatsApp)

- [ ] Smoke tests completos em mobile (375px)
- [ ] Performance: Lighthouse mobile ≥ 80
- [ ] `.env` de produção configurado na Vercel
- [ ] Webhook MP configurado em produção
- [ ] Admin criado no Supabase Auth de produção
- [ ] Seed de produtos reais carregado (XLSX)
- [ ] DNS / domínio configurado (ou Vercel domain temporário)
- [ ] Link enviado para grupo VIP

## Pós-MVP

| Feature             | Descrição                                                |
| ------------------- | -------------------------------------------------------- |
| Sacolinha           | Pedido de assinatura mensal (`order_type = 'sacolinha'`) |
| WhatsApp AI         | Agente conversacional para suporte e vendas              |
| Motor de cupons     | Cupons reais vinculados a `leads`                        |
| Área do cliente     | Login, histórico de pedidos                              |
| Notificações e-mail | Confirmação de pedido, atualização de status             |
| Avaliações          | Review de produtos pós-compra                            |
| Analytics           | Funil de conversão, produtos mais vistos                 |

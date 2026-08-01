# 09 — Log de Decisões

> Formato ADR-lite. Appende ao final ao tomar uma decisão nova.
> **Nunca sobrescreva ou remova entradas anteriores.**

---

## D01 — Repo strategy: greenfield, não fork

**Data**: 2026-08-01
**Contexto**: A base `flordoestudante` tem catálogo/checkout/MP reutilizáveis, mas
também carrega ~4.4k LOC de migrations de agente WhatsApp/n8n, Stripe, assinaturas,
presentes e decorações florais.
**Decisão**: Criar repo limpo `repetitpetit`. Usar `flordoestudante` como referência
de patterns, jamais como fork.
**Consequência**: Sem herança de dívida técnica. Custo: reescrever/adaptar ~8 feature
slices em vez de deletar ~20. Tradeoff aceito.

---

## D02 — Estrutura: single Next.js app, não monorepo

**Data**: 2026-08-01
**Contexto**: `flordoestudante` usa monorepo pnpm com `packages/ui`, `packages/core` etc.
Para Repeti Petit há apenas um app e um cliente.
**Decisão**: Single app na raiz do repo. Vercel Root Directory = `./`.
**Consequência**: Zero overhead de workspace. Se surgir um segundo app (ex.: admin standalone),
reavaliar estrutura neste momento.

---

## D03 — Paleta de cores baseada no logo real

**Data**: 2026-08-01
**Contexto**: Logo tem azul `#165DA4`, lima `#8EB038`, coral `#EB5E5C` — primárias e lúdicas.
**Decisão**: Usar exatamente essas cores como tokens primários. Não usar a paleta suave
rosa/floral de `flordoestudante` nem o roxo genérico do Nuvemshop.
**Consequência**: UI tem identidade única e alinhada com o branding já reconhecido pelos
seguidores do Instagram.

---

## D04 — Tipografia: Nunito + Inter

**Data**: 2026-08-01
**Contexto**: Logo tem traço lúdico arredondado.
**Decisão**: Nunito (headings/display, peso 700–800) + Inter (corpo/UI, 400–500).
**Consequência**: Nunito reforça o caráter infantil/acolhedor sem sacrificar legibilidade.
Inter mantém a interface limpa. Ambas disponíveis no Google Fonts, zero custo.

---

## D05 — Inventário: stock = 1 (peça única)

**Data**: 2026-08-01
**Contexto**: Brechó trabalha predominantemente com peças únicas. Multiples são excepcionais.
**Decisão**: `products.quantity DEFAULT 1`. UI sempre mostra badge "Peça única" quando
quantity = 1 (que é praticamente sempre).
**Consequência**: Simplifica o modelo mental do comprador. Não impede multiples quando
necessário (kits, meias, etc.).

---

## D06 — Reserva atômica com TTL de 20min (carrinho) / 30min (checkout)

**Data**: 2026-08-01
**Contexto**: Duas pessoas podem ver o mesmo item simultaneamente. Peça única =
quem chega primeiro deve ganhar.
**Decisão**: `INSERT INTO cart_reservations ... WHERE status = 'available' AND NOT EXISTS (...)`
em uma única query atômica PostgreSQL. TTL: 20min no carrinho, renovado para 30min ao
iniciar o checkout. `pg_cron` limpa expirados a cada 5min.
**Consequência**: Eliminação de race condition sem locks de aplicação. Custo: pg_cron
precisa ser habilitado no projeto Supabase (disponível no plano Pro e acima).

---

## D07 — Aprovação de pedidos: sem aprovação manual

**Data**: 2026-08-01
**Contexto**: `flordoestudante` tem aprovação manual pelo admin antes de processar o pedido.
Para Repeti Petit, o objetivo é self-service: pagamento = confirmação.
**Decisão**: Após webhook MP confirmar pagamento, pedido entra automaticamente na fila
de fulfillment (`status = 'paid'`). O lojista confirma a separação física ("Conferir e separar"),
que é diferente de "aprovação" — é um checkpoint anti-concorrência presencial/online.
**Consequência**: Jornada mais rápida para o comprador. O checkpoint de separação ainda
protege contra over-sell em loja física.

---

## D08 — Pagamento: Mercado Pago Checkout Pro (único gateway no MVP)

**Data**: 2026-08-01
**Contexto**: Loja já usa MP informalmente. Stripe seria overengineering para o Brasil.
**Decisão**: MP Checkout Pro (PIX + cartão) como único gateway. Pagar na entrega/retirada
**não** é oferecido no MVP — aumenta risco de no-show.
**Consequência**: Fluxo simples. Sem gerenciamento de dois gateways. Pay-on-pickup pode
ser adicionado em M5/pós-MVP se a lojista solicitar.

---

## D09 — Desapegue: formulário polished → WhatsApp handoff (sem motor de avaliação)

**Data**: 2026-08-01
**Contexto**: "Desapegue conosco" é uma proposta de valor importante da marca mas tem
lógica de avaliação complexa que está fora do MVP.
**Decisão**: `/desapegue` é um formulário multi-step impressionante que persiste em
`intake_requests` e gera uma mensagem WhatsApp pré-preenchida para a equipe continuar
manualmente. Sem lógica de preço ou avaliação automática.
**Consequência**: Funcionalidade visível e bonita no MVP. Backend simples. Equipe recebe
o lead via WhatsApp e faz a triagem manualmente como já fazem hoje.

---

## D10 — Lead capture: soft popup com desconto PIX manual

**Data**: 2026-08-01
**Contexto**: Desconto no PIX é uma mecânica comum e eficiente para brechós. Mas motor
de cupons requer complexidade desnecessária no MVP.
**Decisão**: Popup aparece uma vez (localStorage flag), captura e-mail em `leads`,
comunica "5% de desconto no PIX na primeira compra". Desconto é informativo/prometido —
aplicação é manual pela lojista ou via comunicação direta. Sem código de cupom gerado.
**Consequência**: Lead capture funcional. Sem complexidade de engine de promoções.
Pós-MVP: automatizar com cupons reais.

---

## D11 — Sacolinha: out do MVP, schema extensível

**Data**: 2026-08-01
**Contexto**: "Sacolinha" é um modelo de assinatura/pacote mensal interessante para
o futuro mas fora do escopo agora.
**Decisão**: `orders.order_type ENUM ('standard', 'sacolinha')` já presente no schema.
A feature em si (UI, lógica, admin) é pós-MVP.
**Consequência**: Adição futura não quebra o schema existente.

---

## D12 — SLAs: 4h retirada, 24h entrega local, 1 dia Correios

**Data**: 2026-08-01
**Contexto**: Loja opera com mesma equipe que atende o balcão. Prazos precisam ser
reais e cumpríveis.
**Decisão**: Retirada 4h úteis (mesmo dia se pedido até 16h), entrega Foz 24h úteis,
Correios 1 dia útil de postagem após confirmação. Suporte em até 1h em horário comercial.
**Consequência**: Prazos honestos e diferenciados por tipo. Exibidos em `/pedido/[codigo]`
e no checkout.

---

## D13 — RLS de orders/order_items/payments: sem anon INSERT, escrita só via service-role

**Data**: 2026-08-01
**Contexto**: A tabela de postura de RLS em `docs/04-data-model.md` concede `anon INSERT`
em `orders`, `order_items` e `payments`. Já o fluxo de checkout em `docs/03-architecture.md`
mostra todo o caminho `[Checkout form] → POST /api/cart/reserve → Create MP preference →
webhook` passando por rotas/server actions com `SUPABASE_SERVICE_ROLE_KEY`, sem nenhuma
escrita direta do client nessas três tabelas. As duas fontes se contradizem.
**Decisão**: Remover `anon INSERT` das três tabelas na migration da T02. `orders`,
`order_items` e `payments` só recebem `CREATE POLICY ... FOR ALL TO service_role`; `anon`
não tem nenhuma policy nelas (RLS nega tudo por padrão). Toda criação de pedido, item e
pagamento passa por server action com `createServiceSupabaseClient()`.
**Consequência**: Nenhum valor sensível (preço, quantidade, status de pagamento) chega ao
banco vindo direto do browser — o server action recalcula subtotal/total a partir do
`products.price` atual, confere `cart_reservations` e só então grava. Isso fecha o
principal vetor de fraude de e-commerce self-service (cliente forjando `total_amount` ou
criando `payments.status = 'paid'` manualmente via REST). Custo: nenhum — o fluxo da
arquitetura já não dependia de `anon INSERT` nessas tabelas; a permissão no data-model
doc nunca chegou a ser usada por nenhuma feature. Ação de acompanhamento: ao implementar
os tickets de checkout/webhook, usar exclusivamente `createServiceSupabaseClient()` para
INSERT/UPDATE em `orders`, `order_items` e `payments`.

---

## D14 — `uq_reservation_product`: índice único simples, sem predicado de tempo

**Data**: 2026-08-01
**Contexto**: `cart_reservations` tem `CONSTRAINT uq_reservation_product UNIQUE (product_id)`
sem predicado de tempo, então uma reserva expirada e ainda não varrida pelo `pg_cron`
bloqueia uma nova reserva legítima da mesma peça. Duas soluções foram avaliadas: (a) um
índice único parcial restrito a linhas não-expiradas, ou (b) manter o índice simples e
empurrar a responsabilidade de limpar a linha expirada para a mesma statement do INSERT
na rota de reserva (ticket #13).
**Decisão**: Opção (b). A opção (a) foi testada localmente (`CREATE UNIQUE INDEX ...
ON cart_reservations(product_id) WHERE expires_at > now()`) e o Postgres rejeita com
`ERROR: functions in index predicate must be marked IMMUTABLE` — `now()` é `STABLE`, não
`IMMUTABLE`, e por isso não pode aparecer no predicado de um índice parcial. Não existe
uma forma direta de expressar "não expirado" nesse predicado sem trocar para uma coluna
booleana derivada (ex.: `is_active`) mantida por trigger, o que alteraria o schema do
data-model doc além do que esta ticket pede. Mesmo que o Postgres aceitasse a sintaxe, o
efeito não seria o esperado: um índice parcial só reavalia o predicado quando a linha é
escrita — uma linha que "expirou" só pelo relógio andar continua fisicamente no índice até
ser deletada ou atualizada, então o mesmo bloqueio ocorreria de qualquer forma.
**Consequência**: A migration da T02 mantém `uq_reservation_product` como índice único
plain. A rota atômica de reserva (`INSERT INTO cart_reservations ...` em
`docs/04-data-model.md`, a ser implementada no ticket #13) deve apagar explicitamente a
reserva expirada da mesma peça (`DELETE FROM cart_reservations WHERE product_id = $1 AND
expires_at <= now()`) antes ou na mesma transação do `INSERT`, e não pode depender apenas
do sweep `pg_cron` (que roda a cada 5min) para liberar a peça a tempo.

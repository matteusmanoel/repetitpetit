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

---

## D15 — shadcn/ui: preset `radix-nova` (Radix primitives), não `base-nova`

**Data**: 2026-08-01
**Contexto**: A versão atual do CLI shadcn (`shadcn@4.x`) tem `base-nova` (primitivos
`@base-ui/react`, biblioteca nova do time Radix/MUI) como preset padrão. `radix-nova`
usa o pacote `radix-ui` consolidado — a mesma base que sustenta o ecossistema shadcn
há anos, com mais documentação, exemplos e maturidade em produção.
**Decisão**: Inicializar com `shadcn init -b radix -p nova` (estilo `radix-nova`).
**Consequência**: Componentes (`button`, `sheet`, `badge`, `input`) usam `radix-ui` +
`class-variance-authority`, um caminho mais previsível para as próximas tickets
(catálogo, carrinho, admin) que vão precisar de `dialog`, `select`, `tabs`, etc.

---

## D16 — `lib/env.ts`: variáveis obrigatórias vs. opcionais por feature

**Data**: 2026-08-01
**Contexto**: `docs/07-setup.md` já classifica cada env var como "Sempre" (Supabase,
site URL, nome da loja) ou por feature ("Para pagamentos", "Para suporte" — Mercado
Pago e WhatsApp). Exigir todas no `pnpm dev`/`pnpm build` bloquearia o scaffold antes
das tickets de pagamento/suporte existirem.
**Decisão**: `lib/env.ts` valida com Zod dois grupos — obrigatório sempre
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STORE_NAME`) e
opcional por feature (`MERCADOPAGO_*`, `NEXT_PUBLIC_STORE_WHATSAPP`). Falha alto e
com mensagem descritiva se um obrigatório estiver ausente ou inválido; nunca lê
`process.env` fora deste arquivo.
**Consequência**: Scaffold builda sem credenciais de Mercado Pago. As tickets de
pagamento/suporte devem validar a presença das suas próprias vars opcionais antes
de usá-las (ex.: `features/payments`).

---

## D17 — Sem modo escuro no MVP

**Data**: 2026-08-01
**Contexto**: `docs/01-brand.md` define só uma paleta clara, extraída do logo sobre
fundo claro. Não há pedido de dark mode no PRD.
**Decisão**: `app/globals.css` define apenas os tokens `:root` (claro). Sem bloco
`.dark` nem `next-themes` no MVP.
**Consequência**: Menos superfície para manter. Se dark mode for pedido depois, os
tokens shadcn (`--card`, `--popover`, `--sidebar-*`, etc.) já estão mapeados via
`@theme inline` e um bloco `.dark` pode ser adicionado sem refatorar componentes.

---

## D18 — Vitest para testes unitários de lib/

**Data**: 2026-08-01
**Contexto**: Ticket T01 pede TDD para a lógica de validação de `lib/env.ts`. O
projeto não tinha test runner configurado.
**Decisão**: Adicionar `vitest` (ambiente `node`, sem plugin React neste momento)
como dependência de desenvolvimento; `pnpm test` roda `vitest run`. `loadEnv()` é
exportado como função pura (recebe `raw` em vez de ler `process.env` internamente)
para ser testável sem depender do ambiente do processo.
**Consequência**: Base de testes para lógica de domínio (schemas Zod, mappers de
status, etc.) nas próximas tickets. Componentes React ainda não têm test runner de
UI — avaliar Testing Library/Playwright quando houver fluxo de UI crítico o
suficiente para justificar o custo.

---

## D19 — Leitura de `admins` em `getAdminSession()`/`signInAction()`: sempre via `createServiceSupabaseClient()`

**Data**: 2026-08-01
**Contexto**: Ao implementar a T03 (`requireAdminSession()`), a primeira versão usava
`createServerSupabaseClient()` (cliente ligado a cookies, respeita RLS) para ler
`public.admins` depois de `auth.getUser()`/`signInWithPassword()`. Testado
end-to-end contra o projeto Supabase real: o login autenticava no Supabase Auth,
mas a consulta a `admins` sempre voltava vazia — a policy de RLS da tabela
(docs/04-data-model.md, "Postura de RLS": `admins` | anon: nenhum) só concede
`FOR ALL TO service_role`; não existe nenhuma policy para `authenticated`. Isso
faria todo login válido cair no branch de "não é admin" e encerrar a sessão.
**Decisão**: `getAdminSession()` (`features/admin/session.ts`) e `signInAction()`
(`features/admin/actions.ts`) usam `createServerSupabaseClient()` apenas para
`auth.getUser()`/`auth.signInWithPassword()`/`auth.signOut()` (operações que
precisam ler/escrever o cookie de sessão), e usam `createServiceSupabaseClient()`
exclusivamente para o `SELECT` em `admins`. A lógica pura de decisão (usuário +
linha de `admins` → sessão válida ou `null`) foi extraída para
`features/admin/resolve-admin-session.ts`, sem I/O, testada por unit test.
**Consequência**: Todo ticket futuro que precisar ler `admins` (ex.: gestão de
outros admins em `configuracoes/`) deve seguir o mesmo padrão — nunca assumir que
o cliente de cookies vê essa tabela. Verificado end-to-end (Playwright contra
`pnpm start`, mais um script Node com `@supabase/supabase-js` chamando o projeto
Supabase real): sem esse ajuste, login com credenciais corretas falhava
silenciosamente; com o ajuste, `requireAdminSession()` resolve corretamente e o
sanity-check confirmou que o cliente anon/authenticated de fato não vê a linha.

---

## D20 — `/admin/login` fora do route group protegido `(protected)`

**Data**: 2026-08-01
**Contexto**: `requireAdminSession()` precisa ser chamado uma única vez para
proteger todo o admin (não em cada página individualmente), mas um
`app/admin/layout.tsx` compartilhado por todas as rotas sob `app/admin/**`
protegeria também `/admin/login` — criando um loop de redirect (usuário sem
sessão visita `/admin/login`, o layout chama `requireAdminSession()`, redireciona
de volta para `/admin/login`, repete).
**Decisão**: Mover o dashboard/shell autenticado para o route group
`app/admin/(protected)/` (`layout.tsx` chama `requireAdminSession()` uma vez;
`page.tsx` é o placeholder do dashboard). `app/admin/login/page.tsx` fica como
rota irmã, fora do grupo, sem guarda — ela mesma verifica `getAdminSession()`
(sem redirecionar em caso de `null`) só para redirecionar para `/admin` se já
houver sessão válida.
**Consequência**: Qualquer página futura do admin (produtos, categorias,
banners, pedidos, configuracoes) deve nascer dentro de `app/admin/(protected)/`
para herdar a proteção automaticamente, em vez de chamar
`requireAdminSession()` de novo em cada `page.tsx`.

---

## D21 — Middleware só renova a sessão; a decisão de redirect é só do `requireAdminSession()`

**Data**: 2026-08-01
**Contexto**: O guia oficial do `@supabase/ssr` recomenda um middleware que
chama `supabase.auth.getUser()` a cada request para renovar o cookie de sessão
— Server Components não conseguem escrever cookies, então sem isso um access
token perto de expirar nunca seria atualizado no browser entre navegações. O
middleware poderia também decidir o redirect de `/admin/**`, duplicando a lógica
que `docs/03-architecture.md` já atribui a `requireAdminSession()`.
**Decisão**: `middleware.ts` (`lib/supabase/middleware.ts`) só chama
`getUser()` e propaga os cookies renovados — não lê `/admin/**` nem redireciona.
Toda decisão de autorização (usuário logado e é admin ativo?) vive em
`requireAdminSession()`, chamado pelo layout do route group `(protected)`
(D20) e por toda action/rota admin futura.
**Consequência**: Uma única fonte de verdade para "o que conta como sessão de
admin válida" (inclui checar `admins.is_active`), em vez de duas implementações
(middleware + helper) que podem divergir. Custo: o middleware roda em toda
request (matcher exclui apenas assets estáticos), mas isso já é o padrão
recomendado pela Supabase para manter a sessão fresca em qualquer app Next.js
com `@supabase/ssr`.

---

## D22 — WhatsApp FAB: número recebido via prop do server layout, não lido de `process.env` no client

**Data**: 2026-08-01
**Contexto**: A ticket T05 pede um `WhatsAppFAB` client component (precisa de
`usePathname` e de um `setTimeout` para o delay de 1.5s) que usa
`NEXT_PUBLIC_STORE_WHATSAPP`. `lib/env.ts` (D16) exporta um único singleton `env`
que roda `loadEnv(process.env)` no import do módulo e valida também as variáveis
sempre-obrigatórias (`SUPABASE_SERVICE_ROLE_KEY`, etc.). Importar `lib/env` direto
de um Client Component faria o Next.js incluir esse módulo no bundle do browser;
como `SUPABASE_SERVICE_ROLE_KEY` não tem o prefixo `NEXT_PUBLIC_`, o bundler não a
inlina, e a leitura de `process.env` inteiro dentro de `loadEnv` se comportaria de
forma inconsistente no browser — na melhor hipótese lançando o erro de variável
obrigatória ausente, na pior tentando acessar um `process` que não existe no
runtime do cliente.
**Decisão**: `app/(public)/layout.tsx` (Server Component) importa `env` e passa
`env.NEXT_PUBLIC_STORE_WHATSAPP` como prop `whatsappNumber` para
`<WhatsAppFab />`. O componente client nunca importa `lib/env` nem acessa
`process.env` diretamente — respeita a regra "nunca acessar `process.env` fora de
`lib/env.ts`" sem vazar nenhuma variável server-only para o bundle do cliente. Se
`whatsappNumber` vier `undefined` (variável opcional não configurada), o FAB não
renderiza nada.
**Consequência**: Padrão a repetir em outras próximas tickets client-side que
precisem de env vars públicas (ex.: link de suporte em `/pedido/[codigo]`): ler
`env` num Server Component (layout/page) e passar como prop, nunca importar
`lib/env` num arquivo com `"use client"`.

---

## D23 — Footer: só linka Instagram (2 contas); Facebook e grupo VIP do WhatsApp ficam como texto/fora do MVP por falta de URL

**Data**: 2026-08-01
**Contexto**: `docs/00-brief.md` cita "Facebook" e "grupo VIP no WhatsApp" como
redes sociais da loja, mas só fornece URLs completas para as duas contas do
Instagram (`@repetipetit` e `@repetipetit_`). O FAB de WhatsApp já cobre contato
direto via `wa.me`.
**Decisão**: O footer do shell público (`components/public/site-footer.tsx`) linka
apenas as duas contas de Instagram, que têm URL confirmada na documentação. Não
foi inventado nenhum link de Facebook ou de grupo do WhatsApp.
**Consequência**: Nenhuma URL fabricada/quebrada no footer. Ação de
acompanhamento: quando a lojista fornecer o link real do Facebook e/ou do convite
do grupo VIP, adicionar como mais um item da lista `SOCIAL_LINKS` em
`site-footer.tsx`.

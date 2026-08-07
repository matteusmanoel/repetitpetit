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
**Status**: **Superseded by D60** — a definição de negócio estava errada (assinatura/
consignação mensal). Manter este bloco só como histórico.
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

---

## D24 — Buckets de Storage: público para leitura, escrita restrita por ausência de policy (sem SQL manual)

**Data**: 2026-08-01
**Contexto**: A T04 exige buckets para `product_images`/`intake_photos` "com
policies restringindo escrita a service role / admin autenticado". O sandbox do
agente não tem acesso ao Supabase CLI nem ao MCP Supabase autenticado (só
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` como env vars) — logo não há como rodar uma
migration `apply_migration`/SQL bruto para criar `CREATE POLICY` explícita em
`storage.objects` como as demais tabelas do projeto fazem (ver D13, D19).
**Decisão**: Criar os buckets `product-images` e `intake-photos` via
`supabase.storage.createBucket()` (pacote `@supabase/supabase-js`, mesma lib já
usada pelo app) autenticado com a service role key, com `public: true` (permite
GET público via `/storage/v1/object/public/...` sem policy de RLS — recurso do
próprio Storage, independente de `storage.objects`) e `fileSizeLimit`/
`allowedMimeTypes` restritos a imagens (JPEG/PNG/WEBP/AVIF, até 8MB). Nenhuma
policy de INSERT/UPDATE/DELETE foi criada para `anon`/`authenticated` em
`storage.objects` — o Postgres nega por padrão qualquer escrita sem policy
explícita (RLS vem habilitado por padrão nessa tabela do schema `storage`), e
apenas a service role (usada em `lib/supabase/upload.ts` via
`createServiceSupabaseClient()`) contorna RLS. Verificado end-to-end contra o
projeto real: uma tentativa de `upload()` com a `anon key` para
`product-images` retornou `403 — "new row violates row-level security
policy"`, confirmando que a escrita já está bloqueada sem precisar de SQL
manual.
**Consequência**: Mesmo padrão de "postura de RLS por ausência de policy" já
usado em `admins` (D19). Se um futuro ambiente Supabase precisar de policies
explícitas documentadas em `storage.objects` (ex.: para auditoria, ou porque um
fluxo futuro precisa de upload direto do browser com `authenticated`), isso
exige acesso a SQL/migrations (Supabase CLI ou MCP autenticado) — não é
possível só com `storage-js` + service role key. Ação de acompanhamento: se/quando
o MCP Supabase estiver disponível numa sessão futura, considerar formalizar as
policies em uma migration (`supabase/migrations/`) para que fiquem versionadas
junto do resto do schema, em vez de depender apenas do estado do bucket criado
via script.

---

## D25 — `scripts/setup-storage-buckets.mjs`: script standalone lê `process.env` diretamente

**Data**: 2026-08-01
**Contexto**: `docs/06-agent-playbook.md` proíbe acessar `process.env` fora de
`lib/env.ts`, mas esse módulo é `"server-only"` e faz parte do bundle do
Next.js — não é importável a partir de um script Node standalone (`.mjs`) sem
um runtime TypeScript adicional (`tsx`/`ts-node`, não presentes nas
dependências do projeto) e sem depender de `next/navigation` transitivamente.
`scripts/setup-storage-buckets.mjs` roda uma única vez por ambiente Supabase
(fora do build/runtime do app), para criar os buckets de Storage.
**Decisão**: O script lê `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
direto de `process.env`, com uma checagem explícita e mensagem de erro
descritiva quando ausentes — tratado como exceção documentada, escopo limitado
a scripts de operação/infra fora da árvore `app/`/`features/`/`lib/` que roda
via `node scripts/*.mjs` (nunca importado pelo app).
**Consequência**: Qualquer script futuro de manutenção one-off (ex.: seed de
Storage para outro ambiente, rotação de bucket) pode seguir o mesmo padrão. Se
o projeto migrar para ter múltiplos scripts assim, vale revisitar e extrair um
pequeno loader de env compartilhado em `scripts/` (não em `lib/env.ts`, que
continua exclusivo do app Next.js).

---

## D26 — `POST /api/upload` usa `requireAdminSession()` como está (redirect), não uma variante 401 JSON

**Data**: 2026-08-01
**Contexto**: A AC da T04 pede literalmente que a rota "checks
`requireAdminSession()`". Esse helper (`features/admin/session.ts`, D20/D21)
foi desenhado para Server Components/Server Actions e usa `redirect()` do
`next/navigation` quando não há sessão válida — em uma Route Handler isso vira
uma resposta HTTP `307` para `/admin/login` em vez de um `401` JSON, o que é
incomum para uma API chamada via `fetch()`.
**Decisão**: Usar `requireAdminSession()` sem modificação em
`app/api/upload/route.ts`, mesma função usada em todo o resto do admin — em vez
de criar uma segunda função "guard" que devolve JSON. Verificado end-to-end
contra o projeto real: uma requisição `POST /api/upload` sem cookie de sessão
retorna `307` com `Location: /admin/login`; com cookie de admin válido, retorna
`200` normalmente.
**Consequência**: Uma única fonte de verdade para "o que conta como sessão de
admin válida" (D21), sem duplicar a lógica de checagem de `admins.is_active`
numa segunda função só para rotas de API. Custo: um client-side `fetch()` que
chame `/api/upload` sem sessão recebe um redirect (que o `fetch` do browser
segue automaticamente, retornando o HTML de `/admin/login` em vez de um erro
estruturado) em vez de um `401` com corpo JSON — aceitável porque, na prática,
todo formulário admin que vai chamar essa rota já está renderizado dentro de
`app/admin/(protected)/`, que por si só já bloqueia o acesso sem sessão antes
do upload ser sequer tentado. Ação de acompanhamento: se um ticket futuro
precisar de uma resposta de erro estruturada para sessão expirada em pleno uso
(ex.: upload assíncrono numa página já carregada), avaliar uma variante que
capture o redirect e devolva `401` JSON em vez de deixar o `fetch` seguir o
redirect.

---

## D27 — Storage RLS de D24 formalizada em migration versionada

**Data**: 2026-08-01
**Contexto**: D24 documentou que `product-images`/`intake-photos` já ficam seguros
por comportamento padrão implícito (bucket `public = true` permite leitura anônima
via API de Storage; ausência de policy em `storage.objects` bloqueia
INSERT/UPDATE/DELETE para `anon`/`authenticated`, já que RLS nega tudo por padrão e
`service_role` ignora RLS). Isso funciona, mas não é auditável — um leitor do schema
não vê a intenção de segurança sem saber essa regra implícita do Postgres/Supabase.
**Decisão**: Aplicada `supabase/migrations/20260801220000_storage_objects_policies.sql`
via Supabase MCP (`apply_migration`, com acesso real ao projeto `wcgpamsvnhpgonxzbzlg`,
disponível no ambiente do agente orquestrador mas não no sandbox do agente que
implementou a T04): `SELECT` explícito para `anon`/`authenticated` restrito a cada
bucket, e `ALL` explícito para `service_role` restrito a cada bucket. O comportamento
efetivo não muda — apenas passa de implícito para explícito e versionado.
**Consequência**: Qualquer pessoa lendo as migrations enxerga a postura de segurança
de Storage sem precisar saber a regra implícita de "bucket público + zero policy =
leitura liberada, escrita bloqueada". Confirmado ao vivo: `SELECT id, name, public,
file_size_limit, allowed_mime_types FROM storage.buckets` mostra os dois buckets
criados pelo script da T04 (`public: true`, limite 8MB, mimes de imagem); a migration
não recriou nem alterou os buckets, só adicionou as policies em `storage.objects`.

---

## D28 — Upload público de desapego: rota separada `POST /api/intake/upload`

**Data**: 2026-08-01
**Contexto**: A T22 (`/desapegue`) precisa aceitar até 5 fotos de um visitante
anônimo. `POST /api/upload` (T04/D26) exige `requireAdminSession()` e aceita
qualquer chave de `UPLOAD_BUCKETS` — liberar essa rota sem auth abriria escrita
no bucket `product-images` (catálogo) para qualquer um na internet. Adaptar a
rota admin com um flag "público se bucket=intakePhotos" misturaria dois modelos
de autorização no mesmo endpoint e enfraqueceria a garantia de D26.
**Decisão**: Criar `app/api/intake/upload/route.ts` — rota pública sem sessão,
hardcoded para `UPLOAD_BUCKETS.intakePhotos`, um arquivo por request, reutilizando
`uploadImage()` (service role + validação MIME/tamanho 8MB). O client limita o
total a 5 fotos; a persistência do lead (`intake_requests` + `intake_photos`)
fica em `submitIntakeAction` via service role. `POST /api/upload` permanece
admin-only e continua cobrindo o CRUD de produtos.
**Consequência**: Superfície de ataque do upload anônimo fica restrita a
`intake-photos/public/*`. Não há path para o browser escrever em `product-images`
sem sessão admin. Custo: duas rotas de upload em vez de uma — aceitável porque
os contratos de auth são diferentes. Ação de acompanhamento: se abuso/spam de
upload virar problema, adicionar rate-limit (ex.: Vercel Firewall / Upstash)
nessa rota sem tocar no fluxo admin.

---

## D29 — TTL único de reserva: 20 minutos (carrinho e checkout)

**Data**: 2026-08-01
**Contexto**: Havia contradição entre fontes. PRD B3 e o DEFAULT de
`cart_reservations.expires_at` dizem **20 minutos**. O diagrama de ciclo de vida
em `docs/03-architecture.md` e a D06 falavam em renovar o timer para **30 minutos**
ao entrar no checkout. O `orders.expires_at` DEFAULT de 30 minutos é TTL de
*pagamento do pedido*, não da reserva de carrinho — são relógios distintos.
**Decisão**: Um único TTL de **20 minutos** para a reserva de carrinho, do
`POST /api/cart/reserve` até expirar ou converter em pedido pago. Não há renovação
no checkout. A D06 fica como registro histórico da intenção inicial; este D28 é a
fonte de verdade daqui pra frente. O TTL de 30 minutos de `orders.expires_at`
(pedido aguardando pagamento MP) permanece inalterado — não é reserva de peça.
**Consequência**: Um só timer no carrinho/UI; menos estados para explicar ao
comprador. Quem chega ao checkout já tem urgência natural. Constante
`RESERVATION_TTL_MINUTES = 20` em `features/cart/constants.ts` alinha código e
docs; o DEFAULT da coluna no banco continua `now() + interval '20 minutes'`.

---

## D30 — Reserva atômica via RPC `reserve_cart_product` (+ fallback service-role)

**Data**: 2026-08-01
**Contexto**: A query atômica de `docs/04-data-model.md` (`INSERT ... SELECT ...
WHERE NOT EXISTS`) não é expressável no PostgREST/supabase-js sem uma função
Postgres. D14 exige ainda apagar a linha expirada da mesma peça na mesma
statement/transação (ou antes) do INSERT — o UNIQUE plain bloqueia re-reserva
enquanto o `pg_cron` (5 min) não varrer. O sandbox deste agente tem
`SUPABASE_SERVICE_ROLE_KEY` mas não MCP Supabase autenticado para
`apply_migration`, então a RPC precisa existir como migration versionada e o
app precisa funcionar mesmo antes dela ser aplicada no projeto live.
**Decisão**: (1) Migration `20260801230000_reserve_cart_product_rpc.sql` cria
`public.reserve_cart_product(uuid, text)` (`SECURITY DEFINER`, execute só para
`service_role`): idempotência da mesma sessão → DELETE expirada → INSERT atômico,
tratando `unique_violation` como "unavailable". (2) `features/cart/reserve.ts`
chama `rpc('reserve_cart_product')` e, se a função ainda não existir
(`PGRST202`), usa fallback service-role: DELETE expirada → checagens → INSERT,
mapeando `23505` para unavailable. (3) `POST /api/cart/release` é DELETE
simples filtrado por `product_id` + `session_id` da cookie `rp_cart_session`.
**Consequência**: Concorrência garantida pelo UNIQUE + limpeza D14 mesmo no
fallback. Quando a migration for aplicada no live (MCP `apply_migration` ou
`supabase db push`), o caminho RPC passa a ser o canônico — single-statement
transaction. Tipos em `lib/supabase/types.ts` incluem a Function; regenerar via
`generate_typescript_types` após apply live se o schema divergir.

---

## D31 — Catálogo `/catalogo`: query no Server Component + Suspense para skeleton

**Data**: 2026-08-01
**Contexto**: A T06 pede grid de produtos disponíveis com `ProductCardSkeleton`
durante o load. Em App Router, um `page.tsx` async sozinho não mostra fallback de
loading se não houver boundary — o request fica pendente até a query terminar.
**Decisão**: Separar a lista em `CatalogProductList` (async Server Component) e
envolver com `<Suspense fallback={<ProductCardSkeletonGrid />}>` na page. A query
vive em `features/catalog/data.ts` via `createServerSupabaseClient()` (anon + RLS),
filtrando `status = 'available'` e ordenando `created_at DESC`. `next.config.ts`
libera `images.remotePatterns` para `placehold.co` (seed) e o hostname do projeto
Supabase (Storage) — o hostname é lido de `process.env.NEXT_PUBLIC_SUPABASE_URL`
direto no config (exceção análoga a D25: `next.config.ts` roda no boot do Next,
fora do bundle `app/`/`lib/env.ts`). Filtros por query param ficam para tickets
seguintes — este ticket entrega só o grid base.
**Consequência**: Skeleton aparece em navegações client-side / streaming; a page
permanece server-rendered e tipada. PDP (`/produto/[slug]`) ainda não existe — o
card já linka o slug para o ticket de PDP construir em cima.

---

## D32 — Admin product CRUD: FormData + Zod + replace-set de imagens; capa = 1ª foto

**Data**: 2026-08-01
**Contexto**: A T10 pede CRUD admin de `products`/`product_images` adaptando o
padrão `product-actions` do mapa de reaproveitamento (campos novos: `size_group`,
`gender`, `condition`, `tags`, etc.). `docs/03-architecture.md` cita React Hook
Form + Zod na stack, mas o login admin (T03) já usa FormData + `useActionState` +
Zod sem RHF. Imagens sobem via `POST /api/upload` (T04) no client antes do submit.
**Decisão**: (1) Validar o formulário com Zod em `features/admin/product-schemas.ts`
e persistir via server actions em `features/admin/product-actions.ts`, sempre
chamando `requireAdminSession()` e gravando com `createServiceSupabaseClient()`
(RLS de `products` só permite SELECT público de `available`). (2) Manter FormData +
estado client para selects/imagens — sem adicionar RHF nesta ticket — alinhado ao
padrão T03. (3) Em cada create/update, substituir o conjunto de `product_images`
(delete + insert ordenado por `sort_order`) e derivar `products.cover_image_url`
da primeira imagem da lista. (4) "Desativar" = `status = 'inactive'` (sem DELETE),
o que remove a peça do catálogo público pela policy de RLS.
**Consequência**: Um único caminho de escrita admin; reordenação de fotos é só
UI/estado até o save. Custo: replace-set apaga ids antigos de `product_images` a
cada save (aceitável no MVP; se no futuro precisar de URLs estáveis por id de
imagem, migrar para upsert por id). `category_id` entra no form como opcional
mesmo não estando na lista parentética da AC, porque é FK do data-model e as
categorias seedadas já existem.

---

## D33 — Categorias/banners reutilizam bucket `product-images` com `pathPrefix`

**Data**: 2026-08-01
**Contexto**: T11 (CRUD de categorias e banners) precisa de upload de imagem via
a rota `POST /api/upload` da T04. O schema (`docs/04-data-model.md`) guarda só
`image_url` em texto — não há buckets dedicados para categorias/banners, e a T04
criou apenas `product-images` e `intake-photos`. Criar buckets novos exigiria
script + policies RLS de Storage adicionais sem ganho funcional para o MVP.
**Decisão**: Categorias e banners fazem upload no bucket `product-images`
(`UPLOAD_BUCKETS.productImages`), organizados por pasta lógica via campo
opcional `pathPrefix` em `POST /api/upload` (`categories/` e `banners/`). O
mapa de chaves foi extraído para `lib/supabase/upload-buckets.ts` (sem
`"server-only"`) para o client do formulário tipar a chave sem puxar o módulo
de upload privilegiado.
**Consequência**: A home (T09) só precisa da URL pública em `image_url`; a pasta
no Storage é convenção de organização. Se o volume de mídia crescer ou o
isolamento por bucket virar requisito, criar buckets `category-images` /
`banner-images` e estender `UPLOAD_BUCKETS` + script de setup.

---

## D34 — CRUD admin de categorias/banners via service role + `revalidatePath("/")`

**Data**: 2026-08-01
**Contexto**: RLS de `categories`/`banners` concede ao `anon` apenas
`SELECT WHERE is_active = true` (`docs/04-data-model.md`). Writes do admin
precisam de `createServiceSupabaseClient()` (mesmo padrão do playbook e do
login T03). A home (T09) ainda não existe, mas a AC pede que mudanças
apareçam em `/` sem redeploy.
**Decisão**: Toda server action de create/update/delete em
`features/categories/actions.ts` e `features/banners/actions.ts` chama
`requireAdminSession()`, escreve via service role, e invoca
`revalidatePath("/")` + `revalidatePath` das rotas admin afetadas. Listagens
admin mostram ativos e inativos ordenados por `sort_order` (mesmo critério
que a query pública futura `WHERE is_active = true ORDER BY sort_order`).
**Consequência**: Quando T09 ler categorias/banners com cache do App Router,
um save no admin invalida `/` sem rebuild. Soft-hide continua sendo
`is_active = false`; exclusão é hard delete (categorias: `ON DELETE SET NULL`
em `products.category_id`).

---

## D35 — Filtros do catálogo via query params + soft navigation

**Data**: 2026-08-01
**Contexto**: T07 exige filtros na ordem de `docs/05-ux-direction.md` com
estado compartilhável na URL e atualização sem full reload. O grid base (T06 /
D31) já lê `products` com anon + RLS. Não há `nuqs` no stack; o admin de
produtos já usa `searchParams` nativos do App Router.
**Decisão**: (1) Persistir filtros em query params em português —
`tamanho`, `genero`, `faixa`, `marca`, `conservacao`, `preco` — com parse/
serialize em `features/catalog/filters.ts` (valores inválidos são ignorados).
(2) Aplicar filtros na query Supabase em `getAvailableProducts(filters)`;
`tamanho` e `faixa` resolvem para `size_group` e se intersectam quando ambos
ativos. Faixas de preço sem overlap: ≤30, (30–60], (60–100], >100.
(3) UI client (`CatalogFilters`, `ActiveFilterChips`) atualiza a URL com
`router.replace(..., { scroll: false })` + `useTransition` — soft navigation
RSC, sem reload. Marcas vêm de `getAvailableBrands()` (distinct no acervo
disponível) via sheet com busca. Chips ativos removíveis ficam acima do grid.
**Consequência**: Links bookmarkáveis reproduzem o mesmo resultado no server
render. Sem dependência nova. `13_mais` só entra via chip de tamanho (fora
das faixas Baby/Criança/Kids+ da UX).

---

## D36 — Importação XLSX: parser puro + `imports_log` + FormData server action

**Data**: 2026-08-01
**Contexto**: A T12 pede importação em lote do acervo adaptando o padrão
`products-xlsx` / `product-import-actions` do mapa de reaproveitamento (Flor),
com campos do brechó (`brand`, `size_group`, `gender`, `condition`) e auditoria
em `imports_log`. O sandbox não tem o repo Flor — o parser é reimplementado.
**Decisão**: (1) Parser Zod+`xlsx` em `lib/imports/products-xlsx.ts` (puro,
testável sem Next), com cabeçalhos PT-BR canônicos e aliases EN do data-model.
(2) Server action `importProductsXlsxAction` em
`features/admin/product-import-actions.ts` sempre chama `requireAdminSession()`,
grava produtos via `createServiceSupabaseClient()`, e cria/atualiza
`imports_log` (`total_rows` / `imported_rows` / `failed_rows` /
`error_report_json`). (3) UI em `/admin/produtos/importar` com upload FormData
e resumo pós-import (sem RHF); template baixado via
`GET /admin/produtos/importar/template` (server-only, para não embutir `xlsx`
no bundle do client). (4) `categoria_slug` opcional resolve para `category_id`;
slug vazio gera a partir do nome; conflito de slug (arquivo ou DB) falha só a
linha. (5) Dependência `xlsx` (SheetJS community) — alinhada ao reuse-map;
`serverExternalPackages: ["xlsx"]` no Next.
**Consequência**: Importação parcial é o modo padrão (linhas boas entram,
ruins vão para o relatório). Imagens no XLSX são só `imagem_capa_url` (URL);
galeria multi-foto continua no CRUD T10. Template documentado em
`docs/admin-xlsx-import-template.md`.

---

## D37 — `next/image`: `dangerouslyAllowSVG` para capas do seed (placehold.co)

**Data**: 2026-08-01
**Contexto**: O seed do catálogo usa `placehold.co`, que responde `image/svg+xml`.
Sem `dangerouslyAllowSVG`, o optimizer do Next (`/_next/image`) devolve 400 e as
capas do `ProductCard` aparecem quebradas no `/catalogo` (verificado na T06).
**Decisão**: Habilitar `dangerouslyAllowSVG` + `contentDispositionType: "attachment"`
+ CSP restritiva (`script-src 'none'; sandbox`) em `next.config.ts`. Fotos reais
continuam vindo do Storage como JPEG/PNG/WEBP — o SVG fica limitado ao seed/CDN
de placeholder.
**Consequência**: Capas do seed renderizam no grid. Custo aceitável: SVG só entra
via `remotePatterns` já listados (`placehold.co` + hostname Supabase); a CSP do
optimizer impede execução de script embutido.

---

## D38 — PDP: reserva via service role + CTA real `POST /api/cart/reserve`

**Data**: 2026-08-01
**Contexto**: A T08 (PDP `/produto/[slug]`) precisa do indicador de reserva
("outro comprador" vs "no seu carrinho — Xmin") e do CTA "Adicionar ao
carrinho". `anon` tem INSERT/DELETE em `cart_reservations`, mas **não** tem
SELECT (docs/04-data-model.md). A AC permite stub até a T14, porém a T13 já
entregou `POST /api/cart/reserve` + RPC no `develop`. Seeds atuais têm
`cover_image_url` e poucas/nenhuma linha em `product_images`.
**Decisão**: (1) Ler a reserva ativa com `createServiceSupabaseClient()` em
`features/catalog/reservation.ts`, comparando `session_id` com
`peekCartSessionId()` (não cria cookie só por visitar a PDP). (2) O CTA chama
o endpoint real `POST /api/cart/reserve` (sem stub). (3) Galeria usa
`product_images` ordenadas por `sort_order`; se vazia, faz fallback para
`cover_image_url` como slide único. (4) "Você pode gostar" filtra
`size_group` + `gender`, excluindo o produto atual.
**Consequência**: Indicador e CTA ficam corretos sem relaxar RLS de SELECT
público nas reservas. Visitantes sem cookie não são tratados como "own". A
página do carrinho (`/carrinho`) continua fora deste ticket — após reservar, o
CTA muda para "No carrinho" e o indicador mostra os minutos restantes.

---

## D39 — Home pública: queries anon + carrossel Embla; trust bar estático de brechó

**Data**: 2026-08-01
**Contexto**: A T09 precisa montar `/` com banners (`is_active`, `sort_order`),
categorias em destaque, "Últimas novidades" (reusando `ProductCard`) e
`HomeTrustBar` adaptado a sinais de confiança de brechó (reuse-map ADAPT).
Admin já escreve via service role + `revalidatePath("/")` (D34); a leitura
pública deve respeitar RLS (`anon SELECT WHERE is_active` / `available`).
**Decisão**: (1) Queries públicas em `listActiveBanners` /
`listActiveCategories` / `getLatestAvailableProducts` via
`createServerSupabaseClient()` (anon + cookies), orquestradas por
`getHomePageData()` em `features/home/data.ts`. (2) Carrossel com shadcn
Carousel (Embla) + `embla-carousel-autoplay`; copy do slide fica **abaixo**
da imagem full-bleed (não overlay de badges flutuantes), com logo da marca
como sinal hero-level. (3) `HomeTrustBar` com copy estático de brechó
(qualidade curada, preços justos, peça única, retirada em Foz) — sem
sinais florais. (4) Categorias linkam `/catalogo?categoria=<slug>` mesmo
antes do filtro existir, para bookmark/preparo da T de filtros.
**Consequência**: Home self-service alinhada ao catálogo; mudanças no admin
aparecem sem redeploy. Custo: parâmetro `categoria` ainda não filtra o grid
até a ticket de filtros — o link só aterrissa em `/catalogo`. Fallback de
hero estático cobre o caso de zero banners ativos. Em `eslint.config.mjs`,
`react-hooks/set-state-in-effect` foi desligado — a regra nova do plugin
quebrava o Carousel shadcn/Embla e os auto-slug dos forms admin sem ganho
real neste MVP.

---

## D40 — Dashboard admin: KPIs via service role; reservadas = `cart_reservations` ativas

**Data**: 2026-08-01
**Contexto**: A T21 substitui o placeholder de `/admin` por um painel de KPIs
(peças disponíveis/reservadas/vendidas + pedidos paid/confirmed/shipped). O
reuse-map aponta `features/admin/dashboard/` (ADAPT). A reserva atual
(T13/D14) grava em `cart_reservations` sem mudar `products.status` para
`reserved` — contar `status = reserved` subestimaria o acervo em hold.
**Decisão**: (1) Queries em `features/admin/dashboard/queries.ts` com
`createServiceSupabaseClient()` (mesmo padrão dos CRUDs admin; o layout
`(protected)` já chama `requireAdminSession()`). (2) KPI "Disponíveis" /
"Vendidas" = `count` em `products` por `status`. (3) KPI "Reservadas" =
`count` em `cart_reservations` com `expires_at > now()`. (4) Pedidos =
`count` em `orders` por `status` (`paid` / `confirmed` / `shipped`). (5)
Atalhos para produtos/categorias/banners permanecem abaixo dos KPIs; tiles
de disponíveis/vendidas linkam para `/admin/produtos?status=…`.
**Consequência**: O lojista vê a forma do dia sem depender da fila realtime
(T22+). Pedidos zerados são esperados até checkout/webhook. Contagem head-only
(`count: exact, head: true`) evita puxar linhas.

---

## D41 — Lead popup T23: Sheet/Dialog responsivo + INSERT anon via server action

**Data**: 2026-08-01
**Contexto**: A T23 pede capture soft na home (~30% scroll, uma vez por device)
com copy de 5% PIX, sem motor de cupom (D10). `leads` já tem RLS `anon INSERT`
e índice único em `email`.
**Decisão**: (1) `LeadCapturePopup` só em `/` (`app/(public)/page.tsx`), com
flag `localStorage` `rp_lead_popup_seen`. (2) UI: Sheet `side="bottom"` abaixo
de `sm`, Dialog modal em `sm+` (shadcn Dialog novo). (3) Persistência via
server action `submitLeadAction` + `createServerSupabaseClient()` (anon),
`source = popup_first_scroll` fixo; conflito `23505` trata como sucesso.
(4) X / fechar marca visto e **não** grava; submit bem-sucedido também marca
visto. Sem geração/aplicação de cupom.
**Consequência**: Lead capture alinhado ao schema/RLS sem service role nem
engine de promoções. Custo: desconto PIX continua manual/comunicado (D10);
popup não aparece em outras rotas.

---

## D42 — Carrinho client: Zustand persist + CartSheet + sonner (sem ThemeProvider)

**Data**: 2026-08-01
**Contexto**: A T14 precisa de um store de carrinho (reuse-map: portar
`features/cart/store.tsx` do Flor) com `reservationId` + `expiresAt` por item,
sheet deslizante com countdown MM:SS alinhado ao TTL de 20 min (D29), e toast
na expiração. O Flor não está disponível neste sandbox — o store é
reimplementado. shadcn `sonner` puxa `next-themes`, mas o MVP não tem dark mode
(D17).
**Decisão**: (1) Store Zustand em `features/cart/store.tsx` com middleware
`persist` (`localStorage` key `rp-cart`), itens com
`reservationId`/`expiresAt`, sem `gift_message`/`preferredFulfillment`.
(2) `CartSheet` controlado por `isOpen` no store; tick de 1s formata MM:SS e,
ao expirar, remove o item, toasta `"A reserva da peça X expirou"` e chama
`POST /api/cart/release`. (3) PDP `AddToCartButton` chama o reserve real (T13),
faz upsert no store e abre o sheet; falha 409 mostra mensagem clara.
(4) `Toaster` light-only sem `ThemeProvider`/`useTheme` — `next-themes` fica
como dependência transitiva do CLI shadcn, sem uso no app.
**Consequência**: Carrinho funciona offline-UI após refresh (persist) enquanto
a cookie `rp_cart_session` mantém a reserva no servidor. Página `/carrinho` e
checkout real ficam para tickets seguintes — o CTA "Finalizar compra" já aponta
para `/checkout`.

---

## D43 — Checkout T15: order `pending_payment` via service role; redirect stub `/pedido/[codigo]` (sem MP)

**Data**: 2026-08-01
**Contexto**: A T15 pede `/checkout` single-page (contato + fulfillment + ViaCEP +
resumo) criando `customer`/`address`/`order`/`order_items`. Mercado Pago
(preferência / Checkout Pro) é a T17 — integrar MP aqui bloquearia o ticket e
misturaria escopos. D13 exige escrita de `orders`/`order_items` só com
`createServiceSupabaseClient()`. Anon não tem SELECT em `orders`, então uma
página pública de pedido precisa de leitura privilegiada ou de uma rota stub.
O Flor não está no sandbox — ViaCEP + seções de checkout são reimplementados
a partir dos docs (sem `gift_message`/Stripe).
**Decisão**: (1) `createOrderAction` valida reservas ativas da cookie
`rp_cart_session`, recalcula preços de `products`, reusa `customers` por
`phone`, grava `address` só em entrega, cria `orders` com
`status = pending_payment` + `order_items` snapshot, e **não** cria preferência
MP nem linha em `payments`. (2) Após sucesso, redireciona para
`/pedido/[codigo]` com stub mínimo (código, status, total, aviso de pagamento
pendente) lido via service role — T18 (progress bar / itens / WhatsApp) fica
explícitamente deferred. (3) CTA do submit: "Confirmar pedido" (não "Pagar com
Mercado Pago") até a T17. (4) Frete de entrega vem de `shipping_rules` ativo
com `metadata_json.cities`; cidade/UF do ViaCEP precisam bater com a regra.
(5) TTL de reserva permanece 20 min flat (D29) — sem renovação no checkout.
**Consequência**: Comprador fecha pedido sem login; loja vê `pending_payment`
pronto para a T17 plugar `init_point`. Custo: sem pagamento online até T17;
stub de `/pedido/[codigo]` não substitui a página pública completa da T18.

---

## D44 — Pedido público T18: expandir stub `/pedido/[codigo]` (não nova rota)

**Data**: 2026-08-01
**Contexto**: A T15 (D43) deixou um stub em `/pedido/[codigo]` com leitura via
service role. A T18 (issue #19) pede a página completa (progresso, itens, SLA,
WhatsApp) sem login, só com `public_code`. O reuse-map aponta
`OrderProgressBar` / `OrderItemsList` ADAPT (confirmed/shipped; sem
`gift_message`), e o Flor não está no sandbox. Inventar outra rota quebraria o
redirect do checkout.
**Decisão**: (1) Manter a rota `/pedido/[codigo]`; 404 via `notFound()` quando
`public_code` não existe ou formato inválido. (2) Módulo `features/orders/` com
`getPublicOrder` (service role + `order_items` snapshot), `OrderProgressBar`
(passos Pedido → Pago → Separando → Pronto|Enviado → Concluído),
`OrderItemsList` (sem gift_message) e CTA WhatsApp com mensagem contendo o
código — número via prop do Server Component (D22) / `lib/whatsapp.ts`.
(3) SLA: preferir `orders.estimated_fulfillment`; fallback textual D12/PRD por
`fulfillment_type`. (4) Compatível com `pending_payment` do checkout (banner de
pagamento pendente; progresso no passo Pedido). (5) `getPublicOrderStub` do
checkout passa a delegar a `getPublicOrder`.
**Consequência**: Um único link pós-checkout serve stub→página completa; anon
continua sem SELECT direto em `orders`. Mercado Pago / webhook (T17) e fila
admin ficam fora do escopo.

---

## D45 — Checkout Pro T16: preferência REST + `init_point`; sucesso faz poll local (webhook #18)

**Data**: 2026-08-01
**Contexto**: A T16 liga o pedido `pending_payment` (D43) ao Mercado Pago Checkout
Pro (D08). O Flor não está no sandbox — `lib/mercado-pago/*` é reimplementado
via Preference API REST (`POST /checkout/preferences`), sem SDK e sem
`gift_message`. Credenciais `MERCADOPAGO_*` seguem D16 (opcionais no bootstrap;
validadas em `getMercadoPagoConfig()` no uso). O webhook com assinatura e a
marcação `paid`/`sold` são a T17/#18 — a página de retorno precisa de um estado
intermediário sem inventar confirmação falsa.
**Decisão**: (1) `createMercadoPagoPreference` monta items a partir de
`order_items` (+ item "Frete" se `shipping_amount > 0`), `external_reference =
public_code`, `back_urls`/`auto_return` → `/checkout/sucesso?codigo=…`,
`notification_url` → `/api/webhooks/mercadopago` (handler deferred). PIX +
cartão ficam no host MP (sem `excluded_payment_types`). (2) Após criar o pedido,
`createOrderAction` chama `createCheckoutPreferenceForOrder` (service role,
D13): grava `orders.mp_preference_id` e upserta `payments` pending; retorna
`initPoint` (usa `sandbox_init_point` se token `TEST-`). CTA checkout =
"Pagar com Mercado Pago"; client faz `window.location.assign(initPoint)`.
(3) Pedidos pending sem redirect (falha MP ou retorno) recriam preferência via
`startMercadoPagoPaymentAction`. (4) `/checkout/sucesso` mostra
"processando" e faz poll em `GET /api/payments/status` (só lê `orders` — sem
sync MP). Confirmação real permanece no webhook #18.
**Consequência**: Comprador paga no host MP; loja recebe preferência + linha
`payments` antes do webhook. Custo: até #18 o status pode ficar
`pending_payment` mesmo com PIX aprovado; sucesso página só reflete o que já
está no banco.

---

## D46 — Webhook MP + sync: assinatura fail-closed, apply idempotente, sold + reserva

**Data**: 2026-08-01
**Contexto**: A T16 (D45) cria a preferência e deixa o pedido em
`pending_payment`. A confirmação real vem do tópico `payment` do Mercado Pago
(ou de um sync sob demanda se o webhook falhar). O Flor não está no sandbox —
reimplementamos `fetch-payment`, validação `X-Signature` e `apply-mp-status`
para os enums Repeti (`order_status` / `payment_status`), marcando peça
`sold` e consumindo `cart_reservations` (D40: reserva não muda
`products.status` até o pagamento).
**Decisão**: (1) `POST /api/webhooks/mercadopago` exige
`MERCADOPAGO_WEBHOOK_SECRET` (503 se ausente) e valida HMAC-SHA256 do manifest
`id:[data.id];request-id:[x-request-id];ts:[ts];` com `data.id` em lowercase
(docs oficiais MP). Assinatura inválida → 401. (2) Após validar, busca
`GET /v1/payments/{id}` e `applyMercadoPagoPaymentStatus` (service role, D13):
`approved` → `orders.status/payment_status = paid`, `paid_at`,
`products.status = sold`, `DELETE cart_reservations` dos `product_id` do
pedido, `order_events` com `actor_type = 'system'`. (3) Idempotência:
`paid→paid` (ou status de fulfillment posterior) retorna sucesso
`already_paid` sem regravar eventos/produtos; update de
`pending_payment→paid` usa filtro + `.select()` para corridas entre
webhooks. (4) `POST /api/payments/sync` reconcilia por `publicCode`/`orderId`
via `mp_payment_id` ou `payments/search?external_reference=`. (5) Mapa MP →
interno: `approved→paid`, `authorized→authorized`,
`pending|in_process|in_mediation→pending`, `rejected→failed`,
`cancelled→cancelled`, `refunded|charged_back→refunded`.
**Consequência**: Loop de compra fecha sem ação humana; `/checkout/sucesso`
passa a ver `paid` no poll. Custo: smoke E2E com buyer sandbox fica
dependente de credenciais de teste reais — sem inventar pagamento aprovado.

---

## D47 — Fila de fulfillment: Realtime em UPDATE→paid + SELECT admin + publication

**Data**: 2026-08-01
**Contexto**: A T19 exige `/admin/pedidos` com canal Supabase Realtime
(`postgres_changes` em `orders`), badge no `<title>` e no nav "Pedidos", beep
Web Audio e card no topo da fila. O snippet de `docs/03-architecture.md` usa
`INSERT` + `filter: status=eq.paid`, mas o fluxo real (D45/D46) cria o pedido
como `pending_payment` e só vira `paid` via **UPDATE** no webhook/sync — um
filtro INSERT nunca dispara. Além disso, D13 deixou `orders` só com policy
`service_role`: sem SELECT para o JWT do admin, o Realtime não entrega eventos
ao browser.
**Decisão**: (1) Carregar a fila inicial de `status = 'paid'` no layout
`(protected)` via service role (mesmo padrão do dashboard D40) e passar ao
`FulfillmentQueueProvider`. (2) No client, assinar canal `fulfillment-queue`
com `UPDATE` (sem filtro SQL — o handler exige `payload.new.status === 'paid'`)
e `INSERT` opcional com `filter: status=eq.paid`. (3) Migration
`20260801240000_orders_realtime_admin_select.sql`: função
`is_active_admin()`, policy `orders_admin_select` (SELECT authenticated),
`REPLICA IDENTITY FULL` em `orders`, e `ALTER PUBLICATION supabase_realtime
ADD TABLE orders`. Escrita permanece service_role (D13); itens/cliente do
card são enriquecidos por server action após o evento. (4) CTA
"Conferir e separar" fica desabilitado até #21 — sem half-implementar
transições.
**Consequência**: O lojista vê pedidos pagos ao vivo sem refresh; badge e
som cobrem qualquer rota `/admin/*` enquanto a sessão estiver aberta. Custo:
aplicar a migration no projeto Supabase (MCP/CLI) antes do Realtime funcionar
em produção; browsers com autoplay restrito podem silenciar o beep até a
primeira interação — o badge visual permanece.

---

## D48 — Transições de fulfillment: service role + order_events + filas na mesma página

**Data**: 2026-08-01
**Contexto**: A T20/#21 liga as ações do lojista após a fila Realtime (T19/D47):
`paid → confirmed`, `confirmed → ready_for_pickup|shipped`,
`ready_for_pickup|shipped → completed`, e cancelamento de `paid|confirmed`.
Escrita em `orders` continua restrita a service role (D13); o comprador em
`/pedido/[codigo]` já lê `status` (T18) e não precisa de trabalho extra.
**Decisão**: (1) Plano puro `planFulfillmentTransition` + `applyFulfillmentTransition`
via service role, com `UPDATE … WHERE status = from` (lock otimista) e insert em
`order_events` (`event_type = status_changed`, `actor_type = admin`,
`actor_id = admins.id`). (2) Idempotência: se o pedido já está no alvo, retorna
sucesso sem segundo evento. (3) Server actions tipadas por transição
(`confirmOrderAction`, `markReadyForPickupAction`, `markShippedAction` com
`tracking_code` obrigatório, `completeOrderAction`, `cancelOrderAction`) + Zod.
(4) `/admin/pedidos` com duas seções na mesma página — "Aguardando conferência"
(`paid`) e "Em separação / envio" (`confirmed|ready_for_pickup|shipped`) —
alimentadas pelo `FulfillmentQueueProvider` (SSR + Realtime UPDATE + patch local
pós-action). Timestamps: `confirmed_at` / `cancelled_at` / `completed_at` conforme
o alvo.
**Consequência**: O fluxo diário do lojista fecha sem WhatsApp; double-click não
duplica eventos. Custo: cancelamento não reabre estoque neste ticket (fora de
escopo); produtos já `sold` no pagamento (D46) permanecem sold.

---

## D49 — Soft launch: roadmap sync, Lighthouse local, deploy público bloqueante

**Data**: 2026-08-02
**Contexto**: T24/#24 é o gate VIP. Em `develop` M0–M4 já estão implementados
(PRs T08–T23), mas `docs/08-roadmap.md` estava defasado. O alias
o alias de produção (`NEXT_PUBLIC_SITE_URL`) responde `DEPLOYMENT_NOT_FOUND`; previews exigem SSO;
o tip de `develop` foi cancelado por Ignored Build Step na Vercel. MCP
Supabase/Vercel não autenticam no agente cloud — verificação via REST Auth
Admin + service role e HTTP local.
**Decisão**: (1) Sincronizar checklists M0–M5 com o código real e documentar o
gate em `docs/11-soft-launch.md`. (2) Medir Lighthouse mobile no build local
(`pnpm build` + `pnpm start`) — `/` 92 / `/catalogo` 95 — e tratar revalidação
no domínio público como passo pós-deploy. (3) Confirmar admin de produção já
existente (`admin@repetipetit.com.br` + `public.admins`); não inventar senha
nem inventário XLSX. (4) Em `pnpm-workspace.yaml`, `minimumReleaseAge: 0` +
`allowBuilds` para sharp/esbuild/unrs-resolver (pnpm 11 bloqueava o lockfile
por pacotes Rollup <24h e ignorava scripts nativos). (5) `sharp` como
devDependency explícita para otimização de imagem no Next. (6) `.env.example`
com placeholders (sem URL de projeto) e nota do path do webhook.
**Consequência**: Soft launch fica rastreável; scores ≥80 no código atual.
Custo: sem alias Production saudável o webhook/MP back_urls e o smoke VIP
continuam bloqueados para Mateus; `minimumReleaseAge: 0` relaxa a política de
idade do pnpm — reavaliar para o default (1440) quando o ecossistema estabilizar.

---

## D50 — Soft-launch review: apertar RLS anon + sold no retry do webhook

**Data**: 2026-08-02
**Contexto**: Review do release `develop` → `main` (#53). Cart/checkout já
escrevem via `service_role` (D13), mas a migration inicial deixava
`cart_reservations` DELETE/INSERT e `customers`/`addresses` SELECT/INSERT
abertos ao `anon` (`USING (true)` / `WITH CHECK (true)`). Além disso, se o
webhook marcava o pedido `paid` e falhava ao marcar `products` como `sold`,
retries retornavam `already_paid` sem reparar o inventário.
**Decisão**: (1) Dropar policies anon permissivas nessas três tabelas
(migration `20260802010000_tighten_anon_rls.sql`); leads/intake continuam com
INSERT anon. (2) No caminho `already_paid`, chamar
`ensureOrderProductsSold` para idempotentemente marcar peças vendidas e limpar
reservas. (3) Ignored Build Step da Vercel
(`production → exit 1`, preview → `exit 0`) permanece — só Production em
`main` builda; previews SSO-protegidas ficam canceladas de propósito.
**Consequência**: Anon key deixa de ler PII / apagar reservas arbitrárias;
webhook retries fecham o loop peça única. Soft launch ainda exige deploy
Production saudável + E2E pago + XLSX real (#24).

---

## D51 — Split `publicEnv` / server `env` (client não valida service role)

**Data**: 2026-08-02
**Contexto**: Em Production, Client Components (login admin, fila Realtime)
importavam `lib/supabase/browser.ts` → `lib/env.ts` → `loadEnv(process.env)`,
que exige `SUPABASE_SERVICE_ROLE_KEY`. No browser essa chave nunca existe
(correto), então o Zod lançava e quebrava auth/UI mesmo com env Vercel ok.
**Decisão**: (1) `lib/env/public.ts` valida só `NEXT_PUBLIC_*` e exporta
`publicEnv` (leitura por chave para inlining no build). (2) `lib/env/server.ts`
é `server-only` + `env` completo; `lib/env.ts` reexporta o server barrel.
(3) `browser.ts` e middleware usam `publicEnv`.
**Consequência**: Bundle client deixa de exigir secrets; falha de import
acidental de `@/lib/env` no client vira erro de build (`server-only`).

---

## D52 — Mapa MCP para agentes (Context7, Filesystem, TestSprite)

**Data**: 2026-08-02
**Contexto**: Vários MCPs estão ativos no Cursor global; só Supabase e shadcn
estavam no `.cursor/mcp.json` do repo. Agentes precisavam de ordem de preferência
e fluxos explícitos para não duplicar ferramentas nativas ou pular docs internas.
**Decisão**: Documentar em `docs/06-agent-playbook.md` (seção MCP + ordem de
preferência) e índice em `AGENTS.md`. Context7 após docs internas; Filesystem
só para leitura cross-repo (ex. Flor); TestSprite para E2E local na porta 3000,
sem `bootstrap` se `.testsprite/config.json` existir.
**Consequência**: MCPs permanecem todos habilitados; uso fica previsível e
auditável por milestone (`docs/08-roadmap.md`).

---

## D53 — Operação híbrida: orquestrador local + executores cloud

**Data**: 2026-08-02
**Contexto**: M1 8 GB limita paralelismo local; Cloud Agents já entregaram waves via
PRs para `develop`, mas skills globais e MCP do Mac não existiam na VM. Cursor
documenta `.cursor/environment.json`, skills no repo e Secrets no dashboard.
**Decisão**: (1) Modelo fixo: **local** = planning, dispatch, review, HITL;
**cloud** = um GitHub issue por agente → PR `develop`. (2) Commitar
`.cursor/environment.json`, `.cursor/skills/{implement,code-review,orchestrate}`,
`docs/agents/cloud-dispatch.md`, `docs/agents/issue-tracker.md`. (3) `AGENTS.md`
com seção **Cursor Cloud** e tabela local vs repo skills. (4) Playbook e setup
documentam MCP local vs cloud e checklist do operador.
**Consequência**: Executores cloud não dependem de chat prévio; operador ainda
deve configurar Secrets no dashboard Cursor (manual, fora do git).

---

## D54 — Cloud MCP indisponível; matriz de env

**Data**: 2026-08-02
**Contexto**: Operador não encontrou UI confiável de MCP em Cloud Agents; fórum Cursor
reporta Integrations/MCP instável e `.cursor/mcp.json` não lido na VM.
**Decisão**: Documentar cloud **sem depender de MCP**; adicionar `docs/agents/env-matrix.md`
com mínimo de Secrets (5 vars) + Vercel/local; ajustar dispatch e playbook.
**Consequência**: Paridade cloud = Secrets + git + skills no repo, não MCP parity.

---

## D55 — MCP só no orquestrador local pós-cloud

**Data**: 2026-08-02
**Contexto**: Cloud Agents sem MCP configurável; workarounds (SSH/Tailscale para MCP no Mac) descartados.
**Decisão**: Executores cloud entregam PR + nota de handoff quando precisarem de MCP; orquestrador local aplica migrations, Supabase/MP/Context7/Filesystem/TestSprite após merge.
**Consequência**: Issues devem permitir “migration no repo, apply local”; playbook em `docs/agents/cloud-dispatch.md`.

---

## D56 — `motion` como única lib de animação da loja

**Data**: 2026-08-02
**Contexto**: O refactor de UI (T0–T8) precisava de spring/`AnimatePresence` para o
badge do carrinho (T4), chips ativos de filtro (T2), o CTA "Adicionado" da PDP
(T6) e o carrinho deslizante com saída animada por item (T7). O repo só tinha
`tw-animate-css` (utilitários CSS) e Embla (carrossel), nenhuma lib de animação
imperativa para React.
**Decisão**: Instalar `motion` (sucessor do `framer-motion`, import de
`motion/react`) e usá-la nesses quatro pontos. Nada de `framer-motion` legado
nem de uma segunda lib de animação — `motion` é a única daqui em diante.
**Consequência**: +~34kb gz no bundle público onde é importado (carrinho, PDP,
header, filtros). O carrinho (T7) passou a montar seu próprio `Dialog` do
`radix-ui` em vez do `Sheet` compartilhado de `components/ui/sheet.tsx`, para
poder animar com `motion`/`AnimatePresence` sem afetar o drawer de filtros
mobile (T2) nem o admin (T8), que continuam com a animação CSS padrão do
shadcn.

---

## D57 — `CatalogProduct`/`CATALOG_SELECT` ganham `gender` + `condition`

**Data**: 2026-08-02
**Contexto**: O `ProductCard` redesenhado (T1) precisa de borda colorida por
gênero e pill de condição, e a PDP (T6) precisa dos mesmos dados nos
"relacionados". `CatalogProduct` (features/catalog/types.ts) e `CATALOG_SELECT`
(features/catalog/data.ts) não traziam essas colunas — só apareciam no
`ProductDetail` da PDP.
**Decisão**: Ampliar `CATALOG_SELECT` e `CatalogProduct` com `gender` e
`condition`. Como catálogo, home ("últimas novidades") e relacionados da PDP
compartilham a mesma constante/tipo, os três passam a trazer as duas colunas.
Tokens visuais derivados centralizados em `features/catalog/ui-tokens.ts`:
`GENDER_BORDER_CLASS`, `GENDER_TOGGLE_ACTIVE_CLASS`, `CONDITION_PILL_CLASS`,
`GENDER_PILL_CLASS` — nunca hardcodear hex/classe condicional inline nos
componentes.
**Consequência**: Payload por produto um pouco maior nas listagens (2 colunas
a mais). Qualquer novo consumidor de `CatalogProduct` já recebe `gender`/
`condition` sem migration adicional.

---

## D58 — Hero da home: copy em overlay sobre a imagem (revisa D39)

**Data**: 2026-08-02
**Contexto**: D39 definiu a copy do carrossel da home **abaixo** da imagem
full-bleed. O refactor de UI (T5) pediu um hero mais editorial — aspect
`16/9` no desktop / `4/3` no mobile, com um scrim escuro no terço inferior e
título/subtítulo/CTA **sobrepostos** à imagem, no padrão comum de e-commerce
de moda.
**Decisão**: `home-banner-carousel.tsx` passa a renderizar título, subtítulo
e CTA dentro de um `div` de overlay com gradiente escuro sobre a foto, não
mais em um bloco de texto abaixo dela. O fallback sem imagem (`BrandHeroFallback`)
troca o gradiente linear por `--primary` com um padrão geométrico de pontos
(`radial-gradient`), mantendo o logo como sinal hero-level.
**Consequência**: Revisa o item (2) de D39. Banners cadastrados no admin
precisam de contraste suficiente no terço inferior da foto para o texto
permanecer legível — evitar fotos muito claras na base da imagem.

---

## D59 — Overlay "Reservado por outro" no card do grid: adiado

**Data**: 2026-08-02
**Contexto**: O spec visual do `ProductCard` (T1) pedia um overlay "Reservado"
quando outra sessão já reservou a peça, visível direto no grid do catálogo/
home. `cart_reservations` não concede `SELECT` a `anon` (D13/D50); mostrar
isso no grid exigiria uma query extra com `service_role` no catálogo, na home
e nos relacionados da PDP — mudança de lógica de dados, não só de apresentação,
fora do escopo de um refactor puramente visual.
**Decisão**: Adiar. O `ProductCard` (T1) sai sem esse overlay; a peça
reservada por outra sessão só fica indisponível no `AddToCartButton` da PDP
(que já resolve `getProductReservationView`, T14) quando o comprador chega
até lá. Overlay no grid vira ticket futuro dedicado.
**Consequência**: Sinal "Reservado" continua existindo só na PDP individual
(`ReservationIndicator`, T14); o grid não reflete reservas de terceiros até o
ticket futuro ser feito.

---

## D60 — Sacolinha = bolsa de inventário do cliente (corrige D11)

**Data**: 2026-08-02
**Contexto**: D11 tratou "Sacolinha" como assinatura/pacote mensal ou consignação e
tirou do MVP. Isso era equívoco de requisito. No domínio real da loja, Sacolinha é
a bolsa de inventário do cliente: peças **pagas** aguardando retirada ou entrega,
com prazo de liquidação de até **30 dias**. Há **uma Sacolinha aberta por Customer**;
cada pagamento confirmado adiciona peças a essa bolsa. Área do cliente (login pós
primeira compra, códigos, endereços) pode evoluir depois; o significado do termo
não.
**Decisão**: (1) Glossário canônico: Sacolinha = inventory bag do Customer (ver
`CONTEXT.md`). Descartar significados de assinatura mensal / consignação-como-
Sacolinha. (2) D11 fica histórico; não usar `order_type = 'sacolinha'` como
sinônimo desse conceito. O enum legado pode permanecer no schema até migração
dedicada — não modela a Sacolinha de negócio. (3) Escopo de produto: peças entram
na Sacolinha no pagamento confirmado; packing agrupa por Customer; settle ≤30 dias
com aviso a cliente e lojista se não liquidar.
**Consequência**: PRD/roadmap que citam "Sacolinha mensal" ficam desalinhados até
revisão; tickets de área do cliente e packing devem usar este significado. Revisar
uso futuro do enum `order_type` em ticket de schema separado. TTL de settle ~30
dias por pacote de pagamento é **default operacional ajustável** — prioridade é
visibilidade/TTL para lojista + lembrete WhatsApp, não motor rígido de expiração
no MVP.

---

## D61 — Hold Session MVP + prioridade omnichannel (não é e-commerce clássico)

**Data**: 2026-08-03
**Contexto**: A loja é omnichannel com peça única e um só inventário. O fluxo
otimizado não é "Add to Cart" eterno: é Hold Session com pagamento único; Sacolinha
só após pago. Balcão precisa poder vender apesar de holds abandonados, sem
invadir venda online paga.
**Decisão**: (1) Jornada MVP: Browse → Comprar agora → Hold Session (máx. 5,
TTL 15–20 min, countdown, expiração) → continuar comprando opcional → um checkout/
pagamento → Sacolinha. (2) Prioridade: pedido online pago > venda física concluída
> Hold Session > carrinho sem reserva. Carrinho, se existir, **não reserva**.
(3) Override físico só sobre Hold (não pago): cancela hold, notifica cliente,
goodwill; bloqueia se já pago online. (4) Verdade = Postgres; Realtime só espelha.
Detalhe e trade-off: `docs/adr/0001-omnichannel-inventory-priority.md` + `CONTEXT.md`.
**Consequência**: Carrinho atual (Zustand + reserva) deixa de ser o modelo mental —
a reserva atômica permanece, mas como Hold Session. Schema/`product_status` e
fluxo MP ainda não expressam override de balcão, QR `RP-…`, nem pipeline AI;
isso exige tickets/migrations futuros. D42–D45 (cart UX) ficam candidatos a
revisão alinhada a Hold Session.

---

## D62 — Override de balcão: Hold + pending_payment; paid é sagrado

**Data**: 2026-08-03
**Contexto**: Cliente no balcão precisa fechar venda mesmo se alguém online acabou
de ir ao Mercado Pago. Checkout Pro não autoriza cartão durante o hold; o risco
real é corrida hold / `pending_payment` / webhook atrasado.
**Decisão**: Override permitido em Hold Session **e** `pending_payment`. Ação
atômica: cancela hold e/ou pedido pendente, notifica cliente, goodwill. Webhooks
MP permanecem idempotentes — pagamento tardio pós-override → reconcile
(cancel/refund + notify), nunca `paid`/`sold` na peça. Após pagamento confirmado
(`paid`), sem override. Detalhe: `docs/adr/0001-omnichannel-inventory-priority.md`
+ `CONTEXT.md`.
**Consequência**: Precisa de caminho admin/POS para override + testes de corrida
webhook; `applyMercadoPagoPaymentStatus` deve rejeitar/reconciliar se pedido já
cancelado por override.

---

## D63 — Próximo slice: Hold Session + Override + POS mínimo + QR Passport (AI depois)

**Data**: 2026-08-03
**Contexto**: O ADR omnichannel é amplo (AI intake, lifecycle rico, returns). Precisa
de corte executável. QR/`RP-…` desbloqueia todo fluxo de loja; AI só acelera cadastro.
**Decisão**: Slice imediato inclui: (1) refactor Hold Session (máx. 5, TTL 15–20,
continuar comprando, um pagamento); (2) Override idempotente + reconcile de webhook
tardio (D62); (3) venda física mínima no admin/POS; (4) geração/impressão de QR e
scan-to-open Garment Passport. **Fora deste slice** (iteração seguinte): pipeline
AI foto+áudio, batch review, merge/reject de drafts. Visão longa permanece em
`docs/adr/0001-omnichannel-inventory-priority.md`.
**Consequência**: Tickets/PR devem caber neste corte; não misturar AI intake no
mesmo epic. Identidade permanente da peça (`RP-…` + QR) entra no schema cedo.
Fila de packing atual (paid → Realtime + beep) **permanece**; aprofundar Sacolinha/
categoria no pick fica para o slice seguinte, depois de identidade + POS estáveis.

---

## D64 — Identidade da Peça: UUID interno cedo; `RP-…` só na ativação

**Data**: 2026-08-03
**Contexto**: QR/Passport precisam de código estável de chão; drafts/AI não devem
consumir sequência. Staff não usa UUID.
**Decisão**: (1) UUID (PK) desde a criação — referência de sistema para draft/
review/AI. (2) `RP-…` atribuído **somente** na aprovação/ativação para venda
(“ready for floor”), junto com geração/impressão do QR. (3) `RP-…` nunca muda e
não é reatribuído. Ver `CONTEXT.md` (Peça).
**Consequência**: Migration com coluna `staff_code` (ou nome canônico) nullable até
ativar; sequência só incrementa na ativação. Produtos seed/atuais: backfill na
migração ou na primeira ativação/reprint.

---

## D65 — `sold` é inventário; canal é atributo da Sale

**Data**: 2026-08-03
**Contexto**: POS mínimo e omnichannel precisam distinguir “sumiu do estoque” de
“como saiu”. Enums `sold_online` / `sold_store` duplicam o terminal e quebram
quando surgir marketplace/pop-up/Instagram.
**Decisão**: (1) Status de inventário terminal único: `sold` (= ninguém compra de
novo). (2) Canal em `sold_channel` e/ou registro de Sale/order (`online` | `store`,
extensível). (3) Packing/Sacolinha só consomem vendas online pagas; vendas loja
servem histórico, KPI e auditoria de Override. (4) Passport em item sold mostra
“Sold” + contexto da Sale — sem multi-status de inventário. Ver `CONTEXT.md`.
**Consequência**: Migration/backfill: vendas MP atuais → channel online; POS grava
Sale store. Lifecycle ADR que lista `SOLD_ONLINE` / `SOLD_STORE` como status de
produto fica interpretado como **canal da Sale**, não como `product_status`.

---

## D66 — Hold: status é projeção; Hold Session é a verdade

**Data**: 2026-08-03
**Contexto**: Passport/POS precisam responder “posso vender agora?” num lookup;
multi-item + TTL + override precisam de sessão. D40 contava hold só em
`cart_reservations` sem mudar `products.status` — fricção com scan-first.
**Decisão**: (1) Fonte de verdade: Hold Session (+ itens), com status de sessão
(active/expired/cancelled/converted), `expires_at`, vínculo a checkout. (2)
Projeção: `products.status = hold` enquanto houver hold ativo na peça. (3)
Expire/cancel/override/convert atualizam **atomicamente** sessão e status do
produto (`available` ou `sold` no pago). (4) Realtime anuncia mudança de produto;
não decide ownership. Substitui o modelo mental “só `cart_reservations`” da D40
para o caminho omnichannel (D40 permanece histórico para o KPI antigo até o
refactor). Ver `CONTEXT.md` + ADR.
**Consequência**: Migration: evoluir `cart_reservations` → `hold_sessions` /
`hold_items` (ou equivalente); enum `reserved` → `hold` (ou alias); KPI
“reservadas” passa a `status = hold`. RPC de reserve deve setar status na mesma
transação.

---

## D67 — Slice N: quatro status de inventário (`inactive` permanece)

**Data**: 2026-08-03
**Contexto**: Modelo ideal (status × visibility × lifecycle) é mais limpo, mas
explodiria o slice junto com Hold/POS/QR. Admin já soft-deactivate com `inactive`.
**Decisão**: Slice N: `available | hold | sold | inactive`. `inactive` = peça já
do inventário oficial retirada de venda sem venda. Drafts/AI ficam fora (sem
`RP-…`). Evolução tipo C (separar visibility/lifecycle) fica explícita como
pós–Slice N. Ver `CONTEXT.md`.
**Consequência**: Passport/POS: inactive e sold bloqueiam venda; hold oferece
Override; available vende. Não reutilizar `inactive` para sold.

---

## D68 — POS e online: um agregado `orders` (canal distingue)

**Data**: 2026-08-03
**Nota**: Fronteira paid→sold esclarecida em **D71** (criar Order store ≠ sold).
**Contexto**: POS mínimo precisa registrar saída de inventário sem duplicar line
items/pagamento/auditoria. Split `store_sales` vs `orders` cria duas verdades.
**Decisão**: Reusar `orders` + `order_items` como Sale. Campos de canal
(`online` | `store`), payment_provider (MP vs cash/card/pix…), customer nullable
no balcão, fulfillment adequado (`store_counter` vs pickup/delivery/correios).
Pago → `products.status = sold` + `sold_channel` alinhado. Packing só fila online
paga. Refatoração futura para `sales` genérico fica fora do Slice N. Ver
`CONTEXT.md`.
**Consequência**: Migration/enum channel + providers; fluxo POS grava Order e só
após **paid** aplica sold (ver D71); Passport lê order da peça sold.

---

## D69 — Slice N: Customer + e-mail no checkout; sem área logada do comprador

**Data**: 2026-08-03
**Contexto**: Portal Sacolinha com Auth de comprador é cedo demais no mesmo slice
que Hold/POS/QR. Perder e-mail agora torna migração futura dolorosa.
**Decisão**: (1) Manter/ enriquecer entidade `customers` e sempre vincular
`orders.customer_id`. (2) Checkout coleta/confirma e-mail (além de nome/telefone
já usados). (3) Sem login comprador / painel Sacolinha no Slice N — tracking
público `/pedido/[codigo]` + WhatsApp; staff gerencia Sacolinha. (4) Portal
magic-link fica para slice posterior (após packing deepen). Ver `CONTEXT.md`.
**Consequência**: Evita segundo sistema de Auth no epic crítico; prepara histórico
para magic-link. Leads do popup continuam distintos de Customer de pedido.

---

## D70 — Expiração de Hold Session: automática via schedule Supabase (MVP)

**Data**: 2026-08-03
**Contexto**: Hold TTL não pode depender de staff. Workers/filas externas são
overhead desnecessário no MVP. D66 já exige atualização atômica sessão + status.
**Decisão**: (1) Expiração é **automatizada**, ownership do sistema. (2) MVP
preferido: **scheduled trigger Supabase** invocando **Edge Function** (sem worker
externo / queue infra). (3) Job: achar Hold Sessions expiradas → marcar
`expired` → liberar Peças → `products.status` `hold` → `available` → realtime
reflete o commit. (4) Hold Session continua a verdade; status a projeção (D66).
**Consequência**: pg_cron/schedule + Edge Function versionada no repo; mesmo
caminho atômico que expire manual de teste usaria. Sem Redis/SQS/etc. no MVP.

---

## D71 — POS: Order store ≠ sold; só `paid` move inventário (esclarece D68)

**Data**: 2026-08-03
**Contexto**: D68 unifica POS em `orders`, mas a consequência “cria order já
paid” pode ser lida como criar = vender. Inventário deve espelhar o online.
**Decisão**: (1) POS reusa `orders` + `order_items` (D68). (2) Criar Order store
**não** marca Peça `sold`. (3) Transição para `sold` **somente** quando Order
alcança estado **paid**. (4) Pagamento loja: cash/card/Pix **sem** Checkout Pro
MP; o caminho paid→sold guarda as **mesmas garantias de consistência** do
checkout online (transação/idempotência). (5) D68 permanece; este D71 só fija a
fronteira paid→sold.
**Consequência**: UI POS pode ter Order `pending_payment` no balcão até
confirmar recebimento; ou um único passo “receber + paid” — desde que sold não
rode antes de paid. Não reinterpretar D68 como sold-on-insert.

---

## D72 — Override: auditoria mínima (ops, não compliance)

**Data**: 2026-08-03
**Contexto**: Override cancela claim online; suporte e debug precisam saber quem/
quando/por quê. Plataforma de compliance é fora de escopo.
**Decisão**: Todo Override grava trilha mínima: Peça afetada; Hold Session e/ou
Order `pending_payment` afetado(s); staff responsável; timestamp; reason/context.
Uso: debug operacional, atendimento, explicar cancelamento de claim online.
**Consequência**: Tabela/`order_events`-like ou `override_events` enxuta; UI POS
pede motivo curto. Sem SIEM, retenção legal elaborada, ou portal de auditoria.

---

## D73 — QR Passport / labels MVP: identidade operacional, não labeling retail

**Data**: 2026-08-03
**Contexto**: Slice N inclui QR (D63/D64); falta fronteira de impressão e scan.
**Decisão**: Na ativação (“ready for floor”): gerar `RP-…` + QR + label
imprimível. Impressão MVP: saída térmica se disponível + **PDF fallback**.
Labels **sem preço fixo** no MVP. QR identifica a Peça de forma permanente.
Scan (câmera do dispositivo / browser admin) abre ficha staff com ações: sell,
edit, return, archive, view status (e reprint). **Sem app nativo de scanner** no
MVP. Objetivo: identidade operacional, não sistema completo de etiquetagem/
precificação retail.
**Consequência**: Rota/admin de ativação + print; deep link Passport por
`RP-…`/id; preço continua na ficha digital, não na etiqueta impressa.

---

## D74 — SN-01 foundation applied: schema adaptations locked for Wave 2+

**Data**: 2026-08-03
**Contexto**: SN-01 (#67) applied to project `wcgpamsvnhpgonxzbzlg`. Issue SQL
sketches needed adaptation to live RLS/enums/data.
**Decisão**: (1) `product_status` gains `'hold'`; `'reserved'` **kept** until a
cleanup ticket (cart dual-read; 0 live rows used `reserved`). (2) Hold / override
writes are **service_role only**; admin SELECT via `is_active_admin()` — no anon
cookie RLS (aligns D13/D50). (3) `cart_reservations` + cron
`release-expired-reservations` remain until SN-02/SN-04 cutover. (4) Addenda
folded in: `fulfillment_type.store_counter`, `payment_provider` cash/card_local/
pix_local, `idx_customers_email`. (5) `hold_items.uq_hold_item_product` requires
DELETE on expire/cancel (same D14 pattern). (6) One active Hold Session per
`session_id` via partial unique index.
**Consequência**: Migration
`supabase/migrations/20260803100000_slice_n_foundation.sql` + regenerated
`lib/supabase/types.ts`. Wave 2 agents must not re-shape this contract.

---

## D75 — SN-02 Hold Session RPC is the sole reservation primitive

**Data**: 2026-08-03
**Contexto**: Wave 1 inventory gate. Downstream issues must share one hold/release
contract; convert must not mean sold.
**Decisão**: (1) `reserve_hold_item` / `release_hold_item` / `release_hold_session`
/ `convert_hold_session` own available↔hold and session convert. (2) Convert links
`checkout_order_id` and sets session `converted`; **products stay `hold`** until
paid→sold (SN-05/SN-06). (3) SN-03 expire must call `release_hold_session(...,
'expired')` — no duplicate status SQL. (4) No other agent may `UPDATE
products.status` for hold/release. (5) Contract doc:
`docs/slice-n/SN-02-contract.md`.
**Consequência**: Unlock SN-03/04/05 after validation; cart dual-read remains until
SN-04.

---

## D76 — SN-03 expire via SQL RPC + pg_cron (Edge Function thin wrapper)

**Data**: 2026-08-03
**Contexto**: D70 prefers schedule → Edge Function; SN-02 forbids duplicate status
SQL; existing cart sweep already uses pg_cron → SQL.
**Decisão**: (1) `expire_due_hold_sessions()` is the sole expire batch entrypoint and
only calls `_finalize_hold_session(..., 'expired')`. (2) Primary schedule:
`pg_cron` every 5 min → that RPC (no HTTP secrets). (3) Edge Function
`expire-hold-sessions` wraps the same RPC for manual/ops invoke. (4) Contract:
`docs/slice-n/SN-03-contract.md`.
**Consequência**: TTL enforcement is system-owned without a second inventory path.
Cloud agents must not reimplement expire mutation logic.

---

## D77 — SN-12: e-mail obrigatório no checkout + dedup customer (sem migration)

**Data**: 2026-08-03
**Contexto**: D69 exige capturar e-mail e sempre vincular `orders.customer_id`.
D43 reusava só por telefone; e-mail era opcional. `idx_customers_email` já existe
(SN-01 / D74). `email_verified_at` não é necessário sem portal/magic-link.
**Decisão**: (1) Checkout exige e-mail (Zod + UI); normaliza `trim` + lowercase.
(2) `createOrderAction` resolve customer via `planCustomerResolve`: e-mail →
telefone → insert; não sobrescreve e-mail já preenchido; conflito e-mail/telefone
em linhas distintas mantém o match por e-mail e loga warn. (3) Pedidos online
sempre gravam `customer_id`. (4) Snapshot de contato em
`address_snapshot_json.contact` (`full_name`, `phone`, `email`) — inclusive na
retirada — sem nova coluna. (5) Sem migration; Hold RPCs intocados (D75).
**Consequência**: Base para notificações/portal futuro sem Auth no Slice N.
`pricing_snapshot_json` permanece só preços.

---

## D78 — SN-09: RP activation via `next_rp_staff_code` + admin action

**Data**: 2026-08-03
**Contexto**: D64 requires permanent `RP-…` only at floor activation; Wave 2 needs
the generator before QR (SN-10) / Passport (SN-11).
**Decisão**: (1) Sequence `rp_staff_code_seq` + SQL `next_rp_staff_code()` →
`RP-XXXXXX` (6 digits), `service_role` only. (2) `activateProductAction` assigns
`staff_code` once, sets `status = available` when activating/re-activating from
`inactive`, rejects `sold`/`hold`. (3) Backfill in the same migration for
`available|hold|sold` rows missing a code; `inactive` without code waits for
explicit activation. (4) No `product_status_events` yet — deferred to SN-15;
activation does not write `order_events`. (5) Does **not** touch hold/release
status paths (SN-02/SN-03).
**Consequência**: Migration
`supabase/migrations/20260803130000_rp_staff_code_seq.sql`. Orchestrator applies
remote + regenerates types after merge. "Reimprimir" UI stub waits for SN-10.

---

## D79 — SN-04: Hold checkout cutover; keep cookie `rp_cart_session`

**Data**: 2026-08-03
**Contexto**: SN-04 replaces cart-reserve UX with Hold Session (`Comprar Agora` →
continue shopping → single payment). Cookie rename (`rp_hold_session`) was optional.
**Decisão**: (1) Keep browser cookie name **`rp_cart_session`** as
`hold_sessions.session_id` — avoids breaking existing browsers; no migration.
(2) Client/API `holdSessionId` means **`hold_sessions.id`** (UUID row); cookie is
the browser session key. (3) PDP CTA calls `POST /api/hold/reserve`; CartSheet
hydrates via `GET /api/hold/session`; countdown is session-level `expires_at`.
(4) `createOrderAction` requires `holdSessionId`, validates active hold + same
cookie, derives `order_items` from `hold_items` + `products.price`, then
`convert_hold_session` (not sold). (5) MP preference metadata includes
`hold_session_id`; on `approved`, convert hold if needed then mark sold via
SN-05 inventory machine (D80). (6) Legacy `/api/cart/*` remains for dual-read
safety; primary UX is Hold.
**Consequência**: No new Supabase migration for SN-04. Orchestrator has nothing
to apply remotely for this issue.

---

## D80 — SN-05: Inventory state machine owns sold/inactive; hold stays SN-02

**Data**: 2026-08-03
**Contexto**: Wave 3 needs one place for `products.status` transitions so webhook,
POS paid, and admin inactive paths do not scatter bare UPDATEs. SN-02 already
owns available↔hold atomically. SN-04 temporarily used `mark-sold-online`.
**Decisão**: (1) Pure `planTransition` covers the Slice N transition union
(including available↔hold for validation). (2) Runtime available↔hold **must**
call SN-02 RPCs — never bare status UPDATE. (3) SN-05 owns `hold|available → sold`
(+ `sold_channel`), `available ↔ inactive`, via SQL
`apply_inventory_transition` (`SELECT … FOR UPDATE`, hold_items cleanup on sold).
(4) `apply-mp-status` and admin deactivate/reactivate route through
`applyInventoryTransition` / `markProductsSoldForOrder`. (5) Contract:
`docs/slice-n/SN-05-contract.md`.
**Consequência**: Migration
`supabase/migrations/20260803140000_inventory_apply_transition.sql` — orchestrator
applies after merge. Unlocks SN-06 reconcile and SN-07 POS paid→sold consumers.

---

## D81 — SN-10: QR Passport URL + PDF/thermal label (no price, no migration)

**Data**: 2026-08-03
**Contexto**: D73/D64 define QR permanente na ativação; SN-09 already assigns
`staff_code`. SN-11 Passport page may still 404 — QR must still encode the deep
link. Need printable artifact without thermal printer dependency.
**Decisão**: (1) QR content =
`{NEXT_PUBLIC_SITE_URL}/admin/passport/{staff_code}` (D16 site URL). (2) Server-only
`qrcode` (SVG/PNG) + `@react-pdf/renderer` PDF at
`GET /admin/produto/[id]/label.pdf` (`requireAdminSession`, requires
`staff_code`). (3) HTML thermal label via `ProductLabel` + `@media print` 58mm
CSS; print page `/admin/produto/[id]/etiqueta`. (4) Labels **never** include
price (D73). (5) `qrcode` and `@react-pdf/renderer` in `serverExternalPackages`.
(6) Admin “Reimprimir” / “Imprimir Etiqueta” wired after activation; no DB
migration.
**Consequência**: Unlocks SN-11 Passport deep-link contract. Cloud agents must
not change QR payload shape without a new decision.

---

## D82 — SN-07: POS store Order create ≠ sold; confirm uses SN-05 store channel

**Data**: 2026-08-03
**Contexto**: Wave 4 POS precisa gravar venda de balcão no mesmo agregado `orders`
(D68) sem marcar inventário na criação (D71) e sem duplicar transição sold fora
da máquina SN-05 (D80). Issue API usa `cash | card_local | pix_local`; CHECK
SN-01 em `store_payment_method` é `cash | card | pix`.
**Decisão**: (1) `createStoreOrderAction` cria `orders` com `channel=store`,
`status=pending_payment`, `fulfillment_type=store_counter`,
`store_payment_method` mapeado (`card_local→card`, `pix_local→pix`),
`customer_id` nullable; `order_items` com preço do servidor; **não** muda
`products.status`. Aceita peças `available|hold` (D62). (2) `confirmStoreSaleAction`
só em Order store `pending_payment` → `paid` + `markProductsSoldForOrder({
channel: 'store' })` (SN-05). (3) Hold: após sold, finaliza sessões ainda
`active` via `release_hold_session(..., 'cancelled')` (SN-02) — sem orphan.
(4) `order_events` com `actor_type=admin` só no confirm aplicado; `already_paid`
é idempotente (sem segundo event; pode reparar inventário como apply-mp-status).
(5) Sem migration — `store_counter` / channel / store_payment_method já em SN-01.
(6) UI POS fica SN-08.
**Consequência**: Server actions em `features/pos/*`. Unlock SN-08 UI, SN-14
dashboard, SN-15 histórico. SN-13 Override continua o caminho formal para
quebrar hold online antes da venda quando a operação exigir auditoria completa.

---

## D83 — SN-06: Paid online priority — override block + late webhook reconcile

**Data**: 2026-08-03
**Contexto**: D62 makes paid online untouchable and requires late MP webhooks after
Override to reconcile (cancel/refund), never mark the Peça sold. D46/D50 already
give `already_paid` idempotency + sold repair on retry. SN-05 owns sold via
`markProductsSoldForOrder`. SN-13 Override UI may land in parallel.
**Decisão**: (1) Pure `assertOverrideAllowed` in `features/override/` returns
`{ ok: false, reason: "already_paid" }` for `paid` and post-payment fulfillment
statuses; SN-13 **must** call it inside the same transaction as Override
(`SELECT … FOR UPDATE` on product + order) — no Override UI in this ticket.
(2) `applyMercadoPagoPaymentStatus`: when order is `cancelled` and MP maps to
`paid`, call `reconcileLatePayment` → outcome `reconciled_after_override`
(or `noop` if already reconciled). (3) `reconcileLatePayment`: payments row →
`cancelled` + note in `raw_payload_json`; default **stub** MP Refunds API with
clear `console.warn` (injectable real `createMercadoPagoRefund`); insert
`order_events.late_webhook_reconciled` (`actor_type = system`); stub customer
notify log; **never** call `markProductsSoldForOrder`. (4) Keep `already_paid`
path for paid→paid (D46/D50). (5) No migration.
**Consequência**: Unlocks SN-13 Override action to consume the gate; late webhooks
cannot resurrect cancelled claims into sold inventory. Live MP refund homolog is
orchestrator/HITL — not Cloud Agent scope.

---

## D84 — SN-11: Garment Passport deep link + status quick actions (no migration)

**Data**: 2026-08-03
**Contexto**: D81 locked QR payload to `/admin/passport/{staff_code}`; D73/D64
define scan → staff ficha; SN-09 assigns `staff_code`; SN-10 PDF/print paths
exist; SN-08 POS UI and SN-13 Override UI still open.
**Decisão**: (1) Route `app/admin/(protected)/passport/[rpCode]` resolves product
by `staff_code` (normalized trim/decode/uppercase) via service role;
`notFound()` if missing. (2) Page shows identity header, status bar (hold
countdown + browser session label when hold), status-dependent quick actions,
and sale snippet (`orders.public_code` / channel / date) when sold. (3) Sell →
`/admin/pos?product=<id>` stub (SN-08); Override → `/admin/override?product=<id>`
(SN-13); Reprint → SN-10 `/admin/produto/[id]/label.pdf`; Edit →
`/admin/produtos/[id]`; Archive/Reativar → existing `deactivateProductAction` /
`activateProductAction` (SN-09). (4) Data loader `features/passport/data.ts`
(`getPassportData`) — no client inventory writes. (5) No DB migration.
**Consequência**: QR scan lands on Passport. SN-08 wires real POS modal into the
Sell deep link; SN-13 replaces Override stub; SN-15 may enrich history/events.

---

## D85 — SN-13: Override action in `features/override/` + atomic RPC

**Data**: 2026-08-03
**Contexto**: Issue #79 needs an atomic cancel of Hold Session / `pending_payment`
plus `override_events` (D72). SN-06 already shipped `assertOverrideAllowed` under
`features/override/`. PostgREST cannot cleanly run multi-step `FOR UPDATE` +
hold release + order cancel + audit in one client transaction.
**Decisão**: (1) Place `executeOverrideAction` in `features/override/` next to
`assertOverrideAllowed` (not `features/pos/override.ts`) so the paid-block gate
and mutation share one module; POS/Passport consume via
`OverrideActionButton` + `executeOverrideActionFromAdmin`. (2) Atomicity via
SQL RPC `execute_override_action` (`SECURITY DEFINER`, service_role) with
product `FOR UPDATE`; migration
`20260803150000_execute_override_action.sql` — orchestrator applies remotely.
(3) TS **must** call `assertOverrideAllowed` before RPC; RPC re-checks paid/sold.
(4) Hold release only through SN-02: active → `release_hold_session(...,
'cancelled')`; converted (pending checkout) → `_finalize_hold_session` to clear
`hold_items` + restore `available`. (5) Cancel online `pending_payment` +
`order_events.cancelled_by_override` so SN-06 late webhook reconciles. (6)
Idempotent double override → `outcome: noop` without a second `override_events`
row. (7) Stub customer notify (`console.info` + TODO WhatsApp/email). (8)
Minimal reusable dialog only — full POS is SN-08. (9) `/admin/override` deep
link from Passport hosts the shared button (replaces SN-11 stub).
**Consequência**: Unlocks SN-14 override counts and SN-15 Passport history;
SN-08 wires the shared button into POS. Contract: `docs/slice-n/SN-13-contract.md`.

---

## D86 — SN-08: POS UI scan-first com Override + create/confirm SN-07

**Data**: 2026-08-03
**Contexto**: SN-07 entregou `createStoreOrderAction` / `confirmStoreSaleAction`
(D82); SN-11 deep-linka Vender → `/admin/pos?product=<id>` (D84); SN-13
oferece `OverrideActionButton` + `executeOverrideActionFromAdmin` (D85). Falta
a UI de balcão mobile-first (D73 scan-first, D62 override, D71 paid→sold).
**Decisão**: (1) Rota real `app/admin/(protected)/pos` substitui o stub; mantém
contrato `?product=<uuid>` do Passaporte. (2) `lookupProductForPos` em
`features/pos/lookup-product.ts` resolve por `staff_code` (RP-…) **ou** `id`
(service role), devolve hold ativo (countdown / minutos restantes) e flags de
pedido online `pending_payment` / pago. (3) Gate de UI: `available` → toggle
Dinheiro/Cartão/Pix (`cash` / `card_local` / `pix_local`) → Confirmar venda;
`hold` / `pending_payment` → aviso + `OverrideActionButton` antes de vender;
`sold`/`paid` e `inactive` → bloqueio com cópia clara, sem ação de venda.
(4) Confirmação chama `completePosSaleFromAdmin` = create + confirm SN-07 em
sequência; staff id da sessão admin. (5) Sucesso mostra card com
`orders.public_code`. (6) Sem migration — reusa schema/actions existentes.
**Consequência**: Unlock smoke de balcão e contagens SN-14; Passaporte continua
ponto de entrada do QR; Override auditado permanece em SN-13.

---

## D87 — SN-14: Dashboard KPIs via `hold_sessions` + Realtime inventário no provider

**Data**: 2026-08-03
**Contexto**: Issue #80 / SN-14. D40 contava "Reservadas" em `cart_reservations`;
D66 define Hold Session como verdade. D47 assina `orders` no
`FulfillmentQueueProvider`; o painel precisa refletir holds ativos, holds
expirando (<5 min), vendas loja e overrides do dia, sem migration nova.
**Decisão**: (1) `getAdminDashboardKpis` (service role, D40) passa a contar
`hold_sessions WHERE status = 'active' AND expires_at > now()` como
**Holds ativos** — não `cart_reservations` nem `products.status = hold`.
(2) Novos KPIs: `holdsExpiringSoon` (active + `expires_at <= now+5min`),
`storeOrdersToday` (`orders.channel = 'store'` no dia civil BRT),
`overridesToday` (`override_events` no dia BRT). Helpers puros em
`features/admin/dashboard/kpi-helpers.ts`. (3) UI `/admin`: tile renomeado
"Holds ativos"; seção "Hold e loja" com "Expirando em breve" (âmbar se > 0),
"Vendas loja hoje", "Overrides hoje". (4) Realtime: mesmo canal
`fulfillment-queue` ganha `products` UPDATE (cache em memória hold/available;
`sold` remove) + `hold_sessions` `*` → `router.refresh()` só em `/admin` para
KPIs. Handlers best-effort (não derrubam a fila). **Sem migration** neste
ticket — `hold_sessions` já está na publication (SN-01); entrega de eventos
`products` depende da publication/RLS já existentes no projeto remoto.
**Consequência**: KPI alinhado a D66; POS/Passport futuros podem ler
`productStatusCache` do provider. Catálogo público / listing não muda.

---

## D88 — SN-15: `product_status_events` (Option A) + SQL RPC emitters

**Data**: 2026-08-03
**Contexto**: Passport needs a minimal Peça lifecycle trail (D72 ops audit, D65
sale channel, D73/D84 Passport). Extending `order_events` with optional
`product_id` would mix order workflow with inventory projection history.
**Decisão**: (1) **Option A** — dedicated `product_status_events` (not Option B
on `order_events`). (2) Columns: `from_status`, `to_status`, `actor_type`
(`admin|system|customer`), `actor_id`, `context`, `order_id`, optional `notes`
(override reason / RP code / hold label). (3) RLS: **service_role only** — no
anon/authenticated policies (stricter than `override_events` admin SELECT).
(4) Emitters prefer **SQL hooks** inside SN-02/SN-05/SN-13 RPCs so the event
commits with the status change; activation emits from TS
(`activateProductAction` → `emit_product_status_event`) because `staff_code`
assignment is outside inventory RPCs. (5) Override hold→available calls
`_finalize_hold_session(..., context=override, actor=admin)` so the timeline
shows Override (not a generic release). (6) Passport collapsible Histórico +
sale snippet (channel / date / order / payment). Contract:
`docs/slice-n/SN-15-contract.md`.
**Consequência**: Migration
`supabase/migrations/20260803160000_product_status_events.sql` — orchestrator
applies remotely + regenerates types after merge. Cloud agents do not apply.

---

## D89 — Mercado Pago homolog: webhook payment-not-found ack + sandbox detect

**Data**: 2026-08-04
**Contexto**: Homologação MVP. Credenciais ativas eram `APP_USR-…` de vendedor
`test_user` (não `TEST-…`). Checkout com conta/cartão real falhava (“Uma das
partes … é de teste”). Simular notificação no painel MP (`data.id=123456`)
retornava **500** porque `GET /v1/payments/123456` → 404 e o webhook tratava
qualquer throw como `processing_failed`.
**Decisão**: (1) `MercadoPagoPaymentNotFoundError` em fetch de pagamento;
webhook responde **200** `{ ignored: true, reason: "payment_not_found" }` —
igual espírito de `order_not_found` (evita retry / falha do simulador). (2)
Sandbox: `TEST-` prefix **ou** `MERCADOPAGO_SANDBOX=1|true` **ou** probe
`/users/me` com tag `test_user` (cache por processo) ao criar preferência,
para preferir `sandbox_init_point` quando existir. (3) Ops: cartões de teste /
TESTUSER comprador enquanto o seller for teste; doc em `docs/07-setup.md`.
**Consequência**: Homologação sem misturar prod/test; simulador do painel
verde; produção real continua falhando alto em erros de processamento
genuínos.

---

## D90 — Legacy `/api/cart/reserve|release` → 410 Gone

**Data**: 2026-08-05
**Contexto**: Issue #96. SN-04 / D79 já apontam PDP e CartSheet para Hold
Session (`/api/hold/*`). Rotas legadas ainda mutavam `cart_reservations`,
risco de lock paralelo à verdade SN-02.
**Decisão**: (1) `POST /api/cart/reserve` e `POST /api/cart/release` respondem
**410** com `{ error: "gone", message }` em PT-BR apontando Hold Session —
sem ler/gravar `cart_reservations` nem inventário. (2) UI comprador já usa
só `/api/hold/*`; remove-se o client morto `releaseReservationClient`.
(3) Tabela `cart_reservations` permanece (drop fora de escopo). (4) Smokes /
QA assertem 410 nas rotas legadas; Hold continua em `qa-hold-stress.mjs`.
**Consequência**: Única via HTTP de reserva de Peça = Hold Session. Contrato
SN-02 atualizado. Sem migration.

---

## D91 — `reserve_hold_item` não deixa Hold Session active vazia em conflict

**Data**: 2026-08-05
**Contexto**: Soft-launch (#95). Em corrida N:1 pela mesma Peça, perdedores
recebiam `unavailable` mas a RPC já tinha feito `INSERT` em `hold_sessions`
antes do `hold_items` / check de disponibilidade — sessões fantasma `active`
com 0 itens sob carga.
**Decisão**: (1) Confirmar `products.status = available` (com `FOR UPDATE`)
**antes** de criar `hold_sessions`. (2) Em `unique_violation` (ou unavailable
com sessão active já existente e vazia), chamar
`_finalize_hold_session(..., 'cancelled')` — nunca retornar conflict deixando
`active` + 0 `hold_items`. (3) Respostas da RPC e contrato SN-02
(`ok` / `unavailable` / `limit_reached`) permanecem iguais.
**Consequência**: Migration aditiva
`supabase/migrations/20260805050000_reserve_hold_item_no_empty_session.sql`.
Orquestrador aplica no projeto `wcgpamsvnhpgonxzbzlg` após merge; smoke
concorrente (0 sessões vazias) em WAVES-soft-launch.

---

## D92 — pending_payment online TTL 10 min + auto-cancel (issue #99)

**Data**: 2026-08-05
**Contexto**: Pedido online abandonado em `pending_payment` (cliente não conclui
MP) deixava a Peça em `hold` via Hold Session convertida sem liberação
automática. Soft-launch exige TTL curto e honestidade de inventário. D29 ainda
documentava `orders.expires_at` DEFAULT de 30 minutos como TTL de pagamento —
desalinhado do gate de 10 min.
**Decisão**: (1) TTL **10 minutos** após criação do pedido (`orders.expires_at`
DEFAULT + constante `PENDING_PAYMENT_TTL_MINUTES` + `createOrderAction`).
(2) Job `expire_due_pending_payment_orders()` (pg_cron `* * * * *` + Edge
`expire-pending-payment-orders`) cancela só `channel = online` +
`pending_payment` com `expires_at <= now()`. (3) Inventário: SN-02
`_finalize_hold_session` na sessão `converted` ligada por
`checkout_order_id` — sem reinventar sold (SN-05). (4) Status do pedido =
`cancelled` + `order_events.cancelled_by_payment_ttl` para preservar SN-06
`reconcileLatePayment` em late webhook (não usar `expired`, que só espelha
payment fields). (5) POS `channel = store` nunca é tocado.
**Consequência**: Migration
`supabase/migrations/20260805120100_expire_pending_payment_orders.sql` —
orquestrador aplica no remoto + agenda/deploy Edge se necessário. D29 TTL de
reserva (20 min hold) permanece; só o relógio de pagamento do pedido muda.

---

## D93 — Soft-launch polish: hide debug seed + normalize store name typo + favicon

**Data**: 2026-08-05
**Contexto**: Antes do link VIP (#100), a home listava peças Debug/E2E de
scripts de verificação; secrets/dashboard às vezes tinham o nome da loja
com **t extra** em "Repeti" (typo) na etiqueta; `/favicon.ico` 404.
**Decisão**: (1) Migration idempotente desativa produtos cujo slug/nome
bate `debug`/`e2e`/`t10-agente` e banners de título/CTA de teste.
(2) `normalizeStoreName` em `lib/env/public.ts` corrige esse typo para
`Repeti Petit` no load de env (etiquetas/PDF/UI). Orchestrator deve
corrigir o valor canônico nos Secrets/Vercel. (3) Favicon via
`app/favicon.ico` + `public/favicon.ico` (+ `icon.png` / `apple-icon.png`)
gerados a partir de `public/brand/logo.png`.
**Consequência**: Storefront soft-launch sem lixo de QA; typo não vaza na
etiqueta mesmo com secret errado; handoff: aplicar migration remota +
alinhar `NEXT_PUBLIC_STORE_NAME=Repeti Petit` no dashboard.


---

## D94 — Doc operacional: impressão térmica de etiquetas

**Data**: 2026-08-05
**Contexto**: Soft launch (#101). Hardware térmico chega depois; PDF/browser
print já existem (D81). Equipe precisa de passos do zero sem secrets.
**Decisão**: Documentar em `docs/thermal-label-print.md` (tamanho 58×40 mm,
fluxo Admin → Etiqueta → Imprimir, opções de driver, fallback PDF, sem QZ
Tray no MVP). Link a partir de `docs/07-setup.md`.
**Consequência**: Ops configura impressora sem código novo; bridge nativo
continua fora de escopo.

---

## D95 — Catálogo/PDP: anon SELECT `hold` + Reservada (dona vs outras)

**Data**: 2026-08-05
**Contexto**: Soft go-live (#97). Peças em Hold sumiam do catálogo/PDP porque
RLS anon só permitia `status = available`. Grill: jornada sem login; dona vê
countdown/Finalizar/Liberar; outras veem **Reservada** sem TTL alheio; fechar
browser não libera (só TTL ou Liberar via SN-02).
**Decisão**: (1) RLS anon `products` / `product_images`: `status IN
('available','hold')` — sem expor `hold_sessions`/`hold_items`/PII.
(2) Catálogo padrão = available+hold; filtro URL `disponiveis=1` = só available.
(3) PDP: `resolvePdpPurchaseState` — own → countdown + Finalizar + Liberar
(confirm) + Voltar (`history.back()` senão `/catalogo`); other → Reservada
sem compra; consume `POST /api/hold/release` (SN-02), não reimplementa reserve.
(4) Card mostra badge **Reservada** quando `status=hold`. (5) Home novidades
permanece só `available`.
**Consequência**: Migration
`20260805120200_products_anon_select_hold.sql` — orchestrator aplica no projeto
remoto. Realtime hold↔available = #98 / D96.


---

## D96 — Catálogo/PDP Realtime hold↔available (toast + refresh)

**Data**: 2026-08-05
**Contexto**: Soft go-live (#98). Com catálogo/PDP abertos, mudanças
hold↔available precisam refletir sem F5. Toast preferido; update silencioso
aceitável.
**Decisão**: (1) `CatalogStatusRealtime` assina `products` UPDATE via anon
browser client — catálogo: canal único sem filtro de id; PDP: `id=eq.<uuid>`.
(2) Helpers puros em `catalog-realtime.ts` decidem refresh + copy toast
(“Peça disponível de novo” / “Peça reservada”); falha de toast → só
`router.refresh()`. (3) Publication `supabase_realtime` inclui `products`
(migration idempotente) + `REPLICA IDENTITY FULL` para `payload.old.status`.
Depende de D95 (RLS anon hold|available) para entrega de eventos.
**Consequência**: Migration
`20260805120300_products_realtime_publication.sql` — orchestrator aplica.
Sem waitlist / WhatsApp.


---

## D96 — Storefront SELECT para `authenticated` (= vitrine anon)

**Data**: 2026-08-05
**Contexto**: UI inspection — admin com cookie Auth via
`createServerSupabaseClient` lia role `authenticated`; policies de catálogo
eram só `TO anon` → empty state / PDP 404 na mesma sessão do painel.
**Decisão**: (1) Policies de vitrine (`products`, `product_images`,
`categories`, `banners`, `settings`, `shipping_rules`) passam a
`FOR SELECT TO anon, authenticated` com o **mesmo predicado** do anon.
(2) Renomear para `*_public_select` (padrão storage). (3) Writes sensíveis
continuam `service_role` / policies admin — sem SELECT de pedidos/PII extra.
**Consequência**: Migration
`20260805143000_storefront_select_authenticated.sql`. Soft-launch: operador
pode testar a loja logado sem “sumir” o acervo.


---

## D97 — Máscara de telefone BR no checkout e desapegue

**Data**: 2026-08-05
**Contexto**: Inspection + craft Leleco (números formatados no input e display).
Schema já normalizava dígitos; UI mostrava cru.
**Decisão**: Helper `lib/phone.ts` + `PhoneInput` compartilhado; estado guarda
dígitos; display `(45) 99999-9999` / fixo 10 dígitos. E-mail checkout permanece
obrigatório (D77).
**Consequência**: Menos erro de digitação; docs/05 atualizado.

---

## D98 — Marca canônica Repetit Petit + Checkout Pro sem boleto

**Data**: 2026-08-05
**Contexto**: D93 tratou "Repetit" (dois t) como typo e forçava `Repeti Petit`.
Operador confirma que a marca real / nome comercial é **Repetit Petit**.
No Checkout Pro, boleto aparecia e PIX às vezes não (conta sandbox / UI MP);
D45 deixava preferência sem `excluded_payment_types`. Soft launch permanece
em **sandbox** até validar paid→sold.
**Decisão**: (1) `STORE_DISPLAY_NAME` / `normalizeStoreName` canônico =
`Repetit Petit`; valor `Repeti Petit` (um t) é corrigido para o canônico.
(2) Preference `payment_methods.excluded_payment_types = [{ id: "ticket" }]`
remove boleto/lotérica; PIX (`bank_transfer` / `pix`) e cartão ficam.
(3) Credenciais MP Production **não** trocam nesta entrega — sandbox até
HITL de pagamento.
**Consequência**: Etiquetas/statement_descriptor e Vercel env devem usar
`NEXT_PUBLIC_STORE_NAME=Repetit Petit`. Strings hardcoded "Repeti Petit" na
UI ainda existem (passagem de copy em follow-up). PIX no sandbox depende
da conta de teste MP estar habilitada para PIX no Brasil; exclusão de
ticket não força PIX a aparecer se a conta não o oferece.

---

## D100 — Marca canônica Repeti Petit (fecha D93/D98/D99)

**Data**: 2026-08-06
**Contexto**: Oscilação de spelling (Repetit / Petite). Operador confirma:
marca real = **Repeti Petit** (um t em *Repeti*; *Petit* sem e).
**Decisão**: (1) `STORE_DISPLAY_NAME` / `normalizeStoreName` → `Repeti Petit`.
Variantes `Repetit Petit`, `Repetit Petite`, `Repeti Petite` → canônico.
(2) Vercel `NEXT_PUBLIC_STORE_NAME=Repeti Petit` (Production + Preview).
(3) MP `statement_descriptor` segue o env; exclusão de boleto (D98) permanece.
**Consequência**: D93 direção correta para o nome; D98/D99 supersedidos neste ponto.

---

## D101 — Slice O: Sacolinha canônica; consignação apagada do glossário

**Data**: 2026-08-07
**Contexto**: Grill pós-Slice N. D60 já define Sacolinha como bag pós-pago; docs
legado (brief/PRD/roadmap) ainda citavam consignação / pedido mensal.
**Decisão**: (1) Sacolinha = única bolsa aberta por Customer de peças **pagas**
aguardando retirada (default) ou settle via entrega. (2) Remover de docs de produto
qualquer referência a consignação / assinatura mensal / “Sacolinha mensal”.
(3) `order_type = 'sacolinha'` permanece enum legado no schema até migration de
purge (ticket dedicado) — **não** modela o conceito de negócio.
**Consequência**: Agentes usam só D60/D101 + `CONTEXT.md`. Ver `docs/slice-o/`.
*(Purge concluído em D113 / #123 — CHECK bloqueia writes; label PG permanece.)*

---

## D102 — Checkout: Sacolinha default vs entrega imediata (Correios fora)

**Data**: 2026-08-07
**Contexto**: Mães compram várias vezes e decidem retirada depois; urgência precisa
de frete antes do MP.
**Decisão**: (1) No checkout, escolha binária com **Sacolinha pré-selecionada**
(“Guarde na Sacolinha — retire quando quiser”). (2) Entrega imediata é ramo
opcional: CEP + “Calcular frete” obrigatórios; pagar só habilita com frete OK.
(3) Path Sacolinha: contato mínimo (nome, telefone, e-mail) — sem endereço.
(4) Correios **fora** deste slice.
**Consequência**: Atualiza UX de fulfillment (revisa ênfase de D12 no path default).

---

## D103 — Auth comprador: magic link pós-compra, não bloqueante (supersede D69 portal)

**Data**: 2026-08-07
**Contexto**: D69 adiou área logada; Slice O precisa Sacolinha do comprador sem
fricção pré-pagamento.
**Decisão**: (1) Guest-first até o pagamento. (2) Pós-MP sempre `/pedido/[codigo]`
primeiro — **nunca** redirect duro para login. (3) Nudge discreto (sheet/tooltip)
para magic link (Supabase Auth, role distinta de admin); e-mail pré-preenchido.
(4) Conta não bloqueia ver pedido; bloqueia só área agregada (Sacolinha, histórico,
preferência). (5) Merge automático `customer` + `anonymous_id`/sessão pelo e-mail.
**Consequência**: D69 permanece válido para Slice N histórico; portal mínimo entra
em Slice O P1.

---

## D104 — Frete entrega imediata: ViaCEP + haversine + knobs admin

**Data**: 2026-08-07
**Decisão**: `distância_km` = haversine(CEP loja ViaCEP, CEP cliente ViaCEP);
`frete = max(mínimo, distância_km × taxa_km × multiplicador)`. Admin configura
taxa/km, multiplicador, mínimo, raio máximo (fora = só Sacolinha). Sem tabela
manual de bairros; Distance Matrix externo fora.
**Consequência**: Settings/shipping config no admin; botão Calcular frete no checkout.

---

## D105 — Fila admin única; entrega urgente com prioridade visual

**Data**: 2026-08-07
**Decisão**: Uma fila Realtime de pedidos pagos; ordenação `entrega_imediata`
primeiro; badge “ENTREGA URGENTE”. Status Sacolinha:
`pago → separando → na_sacolinha → concluído`. Entrega:
`pago → separando → em_rota → concluído`. Job/notificação 30d só modelo neste slice.
**Consequência**: Estende fila D47/D48; sem Slack/e-mail/push novo.

---

## D106 — Sessão anônima: cookie + merge; sem geo/push

**Data**: 2026-08-07
**Decisão**: Persist `anonymous_id` + preferência de recebimento; merge no magic
link. Geolocalização browser e Notification API **fora**. LGPD: texto mínimo +
privacidade, sem CMP complexo.
**Consequência**: Reusa cookie de hold (`rp_cart_session` / D79) como âncora.

---

## D107 — Intake IA: áudio+fotos → preview → confirm + print térmico sequencial

**Data**: 2026-08-07
**Decisão**: Admin “Cadastrar com IA”: fotos + áudio → preview editável (schema Zod)
→ confirm cria produto + `staff_code` → enfileira etiqueta térmica **uma a uma**
com ACK (retry 1x). Print falha não reverte o produto (`label_print=failed`).
Bridge local ESC/POS (modelo TBD). XLSX permanece fallback. Multimodal via AI
Gateway/provider do stack.
**Consequência**: Alinha Intake Pipeline do `CONTEXT.md`; D94 (térmica) vira
obrigatória no lote IA.

---

## D108 — Slice O ordem: D0 redesign TipTop→Repeti antes de features

**Data**: 2026-08-07
**Decisão**: (1) Hard copy de **layout/estrutura** TipTop (rounded, fluido, clean,
kids-like tipografia) com **palette/logo Repeti** — não skin TipTop.
(2) Protótipo UI `/prototype/tiptop-redesign` → pick → docs de sistema → redesign
full storefront **antes** de implementar Sacolinha/frete/IA em cima do visual antigo.
(3) Waves: **D0** redesign; **P0** Sacolinha default + fix checkout empty + IA/print;
**P1** frete + prioridade + magic link + área Sacolinha; **P2** 30d, polish, cupom.
**Consequência**: Cloud agents não abrem feature P0 até D0 tokens/docs alinhados
(ou issues D0 explícitas primeiro).

---

## D109 — Pós-pagamento: pedido primeiro + nudge Sacolinha/conta

**Data**: 2026-08-07
**Decisão**: Retorno MP → `/pedido/[codigo]` com status. Sem sessão comprador:
sheet/tooltip “Crie seu acesso para ver a Sacolinha”. Com sessão: CTA “Ver minha
Sacolinha”. WhatsApp suporte permanece.
**Consequência**: Fecha atrito briefing vs D103; implementa com D103 em P1.

---

## D110 — Redesign TipTop→Repeti: Variant A (+ tokens soft de B)

**Data**: 2026-08-07
**Contexto**: Protótipo `/prototype/tiptop-redesign` (A Dense / B Soft / C Editorial).
Grill pediu hard copy TipTop + cores Repeti.
**Decisão**: Vencedor **A (Dense commerce)** como estrutura canônica do redesign D0;
incorporar de B radius/display mais generosos em cards e títulos; C só como
experimento futuro de landing. Veredicto em
`app/prototype/tiptop-redesign/VERDICT.md`. Tokens e `docs/12-ui-system.md`
atualizados para orientar cloud agents.
**Consequência**: Features P0+ nascem no visual A; protótipo é throwaway.

---

## D111 — Protótipo TipTop rev.2: Variant T + Omnes/Becca (supersede D110 visual)

**Data**: 2026-08-07
**Contexto**: HITL vs TipTop real: A não era TipTop-shaped; B arredondado certo mas
espaçamento desktop exagerado. Tipografia precisa Omnes (UI) + Becca (display)
em tamanhos bem visíveis.
**Decisão**: (1) Vencedor de protótipo = **Variant T** (`?variant=T`): hard-copy
de estrutura TipTop (header pill search, nav ícones, filtro idade, catálogo
sidebar, PDP card, mini-cart sheet, checkout pills) com **palette Repeti**.
(2) Tipografia alvo **Omnes + Becca**; protótipo usa stand-ins Fredoka/Caveat
até arquivos licenciados. (3) Mobile herda radius kids-like de B; desktop usa
`max-w-6xl` e gaps menores (corrige ar de B). (4) D110 permanece histórico;
D0 implementa T, não A. (5) **Não** iniciar implementação D0 até HITL OK no T.
**Consequência**: Atualizar brand/UI docs + issue #122; P0 UI espera aceite do T.

---

## D112 — Protótipo T rev.3: nav Lucide, BottomBar, cores verde/azul/rosa, legal soft

**Data**: 2026-08-07
**Contexto**: HITL vs TipTop header real + páginas soft iFraldas.
**Decisão**: (1) Categorias do header = texto + ícone Lucide centralizado, gap
generoso do centro às bordas — sem thumbnails circulares. (2) Hover/elevation e
popover de Conta. (3) Hierarquia de cor: verde neutro/CTA, azul meninos, rosa
meninas/promo (logo intacto). (4) BottomBar mobile Home/Catálogo/Sacolinha/Conta;
hambúrguer para o resto; cart mobile fullscreen. (5) “Você pode gostar também”
(Becca) em PDP e Checkout. (6) Telas Sobre/FAQ, Privacidade e Termos no protótipo
com footer soft compartilhado; textos legais **adaptados** a Repeti (não copiar
lista de chá TipTop). (7) D0 permanece gated a HITL do T.
**Consequência**: VERDICT rev.3; #122 só após aceite.

---

## D113 — Purge: `order_type = 'sacolinha'` retired (writes blocked)

**Data**: 2026-08-07
**Contexto**: D101 pediu migration dedicada (#123) para aposentar o misuse do enum
como “Sacolinha mensal / consignação”. Sacolinha de negócio continua = bolsa de
peças pagas (D60), fora deste enum.
**Decisão**: (1) Migration aditiva `20260807184500_retire_legacy_order_type_sacolinha`:
normaliza rows `order_type = 'sacolinha'` → `'standard'`; COMMENT no type/coluna;
CHECK `orders_order_type_no_legacy_sacolinha` impede novos writes do label legado.
(2) Label `sacolinha` permanece no enum Postgres (drop de enum value é invasivo).
(3) App: `ORDER_TYPE_STANDARD` em inserts (checkout + POS). (4) Docs de produto
não ensinam consignação como Sacolinha; D11 permanece só histórico.
**Consequência**: Orchestrator aplica a migration no projeto shared após merge.
Tipos gerados podem ainda listar o label legado — código não o escreve.

---

## D114 — D0 production storefront = Variant T rev.3 (stand-in fonts)

**Data**: 2026-08-07
**Decisão**: (1) Storefront produção reescrito para TipTop chrome + palette Repeti
conforme VERDICT T rev.3 / #122 — **sem** promover `app/prototype/*`.
(2) Tokens: `--primary` = verde CTA; `--gender-menino` azul; `--gender-menina`
rosa; `--radius` 1rem; `--font-sans`/`--font-heading` = Fredoka (Omnes stand-in);
`--font-display` = Caveat (Becca stand-in) até arquivos licenciados.
(3) Chrome: header pill search + nav Lucide + Conta popover; BottomBar mobile;
cart fullscreen; soft footer; rotas `/sobre`, `/privacidade`, `/termos`.
(4) Hold Session / Mercado Pago / Realtime intactos.
**Consequência**: Features P0 nascem no visual T; admin permanece Inter via
`.admin-shell`.

---

## D115 — Checkout P0: Sacolinha pay-only + MP handoff estável (#124)

**Data**: 2026-08-07
**Contexto**: SO-02 P0 / D102; frete haversine é #127 (P1). Empty flash ao limpar
hold antes do redirect MP.
**Decisão**: (1) UI pré-seleciona Sacolinha (`fulfillment_type=pickup`) com copy
“Guarde na Sacolinha — retire quando quiser”; path = contato só (sem endereço).
(2) Toggle “Entrega imediata” visível como stub; `isCheckoutPayEnabled` só libera
pagar em Sacolinha até `deliveryFreteReady` (#127). (3) Antes de `clearHold` +
`location.assign(init_point)`, marca handoff e renderiza `CheckoutMpHandoff`
(skeleton estável) — sem empty-state “Nenhuma peça reservada”.
**Consequência**: Schema/action de delivery permanece para P1; P0 não coleta CEP.

---

## D116 — `na_sacolinha` no enum; `ready_for_pickup` permanece até `em_rota`

**Data**: 2026-08-07
**Contexto**: D105 / SO-05 P0 (#125) exige path Sacolinha
`pago → separando → na_sacolinha → concluído`. O enum já tinha
`ready_for_pickup` (retirada genérica / D48).
**Decisão**: (1) Additive `ALTER TYPE … ADD VALUE 'na_sacolinha'`.
(2) Pickup (Sacolinha): `confirmed → na_sacolinha → completed` com
`ready_since` + `pickup_deadline` (+30d) na transição — sem job/notificador.
(3) `ready_for_pickup` permanece para delivery até o status `em_rota` (#128).
(4) Override SQL / `isOrderPastPendingPayment` incluem `na_sacolinha`.
**Consequência**: Orchestrator aplica
`20260807191000_order_status_na_sacolinha` após merge + regen types.

---

## D117 — SO-04: `label_print_jobs` + bridge ESC/POS offline-first (#126)

**Data**: 2026-08-07
**Contexto**: D107 / SO-04 — intake IA com fila térmica sequencial ACK;
Vercel não fala USB; chave de IA pode estar ausente no Cloud Agent.
**Decisão**: (1) Tabela `label_print_jobs` (`pending|printing|printed|failed`,
`batch_id`, `attempt_count`/`max_attempts=2`) — falha de print **não** reverte
produto; espelha `metadata_json.label_print`. (2) Bridge abstrata ESC/POS;
`THERMAL_PRINT_BRIDGE_URL` opcional → sem URL = offline → job `failed` + UI
reprint + fallback HTML `/etiqueta`. (3) AI via `OPENAI_API_KEY` ou
`AI_GATEWAY_API_KEY` opcionais em `lib/env` — sem chave: preview editável
manual. (4) Rota `/admin/produtos/intake-ia`; XLSX permanece.
**Consequência**: Migration `20260807192000_label_print_jobs`; orchestrator
aplica no projeto compartilhado + secrets AI/bridge quando homologar.

---

## D118 — Frete P1: geocode CEP (Nominatim/Photon) + knobs em `settings` (#127)

**Data**: 2026-08-07
**Contexto**: D104 / SO-02 P1 — ViaCEP não devolve lat/lng; BrasilAPI v2
retornou `coordinates` vazio nos CEPs de Foz testados.
**Decisão**: (1) ViaCEP continua no autofill de endereço no checkout.
(2) Distância = haversine(coords loja, coords CEP cliente); geocode server-side
via Nominatim (postalcode) com fallback Photon. (3) Knobs admin em `settings`:
`store_postal_code`, `store_latitude`/`store_longitude` (cache no save),
`delivery_rate_per_km`, `delivery_multiplier`, `delivery_min_amount`,
`delivery_max_radius_km`. UI `/admin/configuracoes`. (4) Pay gate:
`isCheckoutPayEnabled(delivery)` só com frete OK; `createOrderAction` recalcula
frete no server e persiste em `orders.shipping_amount` +
`pricing_snapshot_json.frete`. Correios / tabela de bairros fora.
**Consequência**: Migration `20260807200000_delivery_frete_settings`;
orchestrator aplica no projeto compartilhado + regen types se divergir.

---

## D119 — Buyer magic link + `customers.auth_user_id` + painel `/sacolinha` (#129)

**Data**: 2026-08-07
**Contexto**: SO-03 / D103 / D106 / D109 — guest-first; pós-MP soft nudge;
área agregada Sacolinha. (D118 = frete #127; este ticket era D118 no branch
paralelo — renumerado no rebase.)
**Decisão**: (1) Coluna `customers.auth_user_id` (unique parcial) liga Auth
user do comprador; gate `requireBuyerSession()` ≠ `requireAdminSession()`.
(2) Magic link via `signInWithOtp` → `/auth/callback` → merge por e-mail +
anexa `hold_sessions` do cookie `rp_cart_session`. E-mails de admin ativo
não recebem OTP buyer (anti bypass de senha). (3) MP `back_urls` →
`/pedido/[codigo]` (não `/checkout/sucesso`); nudge sheet dismissível.
(4) Painel `/sacolinha` lista itens em `paid|confirmed|ready_for_pickup|na_sacolinha`.
**Consequência**: Migration `20260807210000_customers_auth_user_id`;
orchestrator aplica + configura Redirect URLs do Supabase Auth
(`…/auth/callback`) local + Vercel.


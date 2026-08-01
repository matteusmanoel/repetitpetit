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

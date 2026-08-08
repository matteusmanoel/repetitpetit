# Slice S — Audit & Technical Planning

**Data**: 2026-08-08  
**Modo**: auditoria somente leitura — **nenhuma implementação autorizada**.  
**Escopo**: catálogo/filtros/header · checkout/frete/pagamento · identidade comprador · order tracking · admin produto/IA/CRUD/override · design system.

---

## A. Executive Summary

### O que já funciona

| Área | Evidência |
|---|---|
| Filtros catálogo (chips sexo/idade/tamanho/conservação, checkbox disponibilidade, marca multiselect, URL params PT) | `CatalogFilters.tsx`, `filters.ts`, `use-catalog-filters` |
| Home “filtre por sexo e idade” + idade só após sexo | `home-age-filter.tsx` · D130 |
| Cards com `truncate` + bloco texto `min-h-[5.75rem]` | `ProductCard.tsx` · D130/SQ-3 |
| Logo header ~240px (`BrandLogo`) | `site-header.tsx` · D130 |
| Favicon brand + `InstagramIcon` no footer | `app/favicon.ico`, `app/icon.png`, `site-footer.tsx` · D130 |
| Font vars no `<html>` (anti-Times) | `app/layout.tsx`, `globals.css` · D130 |
| Pay gate frete: pickup livre; delivery exige frete OK | `pay-gate.ts` + `CheckoutForm` |
| ViaCEP autofill + haversine + geocode (sem centro-município) | `CheckoutAddressSection`, `calculate-frete.ts`, `cep-geocode.ts` · #151 |
| Customer row no checkout; magic link → `/auth/callback` → merge → `/sacolinha` | `checkout/actions.ts`, `PedidoAuthNudge`, SO-03 |
| Painel mínimo Sacolinha | `app/(public)/sacolinha/page.tsx` |
| Order tracking público `/pedido/[codigo]` + progress + MP retry | `pedido/[codigo]/page.tsx` |
| Override **já** na grade de produtos (hold) | `AdminProductsClient` + `OverrideActionButton` |
| Intake IA com CTA “Gerar preview” | `AdminAiIntakeClient`, `mass-capture.ts` |
| Modal produto (create/edit) | `AdminProductDialog.tsx` |

### O que está quebrado / incompleto / ausente

| Severidade | Item |
|---|---|
| **Missing** | Autocomplete/busca real do header (hoje só chrome → `/catalogo` sem query) |
| **Missing** | Slider de preço no `/catalogo` (ainda chips `PRICE_RANGES`; slider só no protótipo Slice R) |
| **Missing** | Hover “Adicionar ao Carrinho” no card desktop |
| **Missing** | Tabs no modal de produto (info / fotos / áudio / IA / ordem) |
| **Missing** | Indicador persistente de estados de áudio (além de toast/botão) |
| **Missing** | CRUD modal de banners **e** categorias (ambos ainda página `/novo` + `/[id]`) |
| **Partial** | Copy “+10 min” fora do botão; botão ainda “Pagar com Mercado Pago” |
| **Partial** | Área do cliente = só peças em status Sacolinha (sem histórico amplo) |
| **Partial** | Order tracking funcional mas visualmente mínimo |
| **Partial** | Override ainda na sidebar secundária apesar de já existir na grade |
| **Conflict** | **Option A desta wave** vs **D131** (preço dual-thumb + drawer marca/conservação) |
| **Needs validation** | Frete em CEPs edge (geocode externo); logo “ainda pequeno?”; Times residual em runtime; câmera intake em HTTPS/mobile |

### Principais riscos

1. **Conflito D131 ↔ Option A** — promover Option A sem ADR append gera Cloud Agents implementando modelos de preço/drawer diferentes.
2. **Hotspot `ProductCard` / `site-header` / `CatalogFilters`** — várias tasks tocam os mesmos arquivos se não forem particionadas.
3. **Copy “10 minutos extras” vs backend** — ao criar pedido, hold vira `pending_payment` com TTL **10 min absoluto** (`PENDING_PAYMENT_TTL_MINUTES`), não “hold + 10”. Mensagem imprecisa pode gerar expectativa errada.
4. **Auth redirect home** — depende de Supabase Redirect URLs / Site URL / cookie `next` (HITL dashboard); código já aponta default `/sacolinha`.
5. **Admin modal produto monolítico** — refactor em tabs + IA mass capture compartilham mídia; risco alto de conflito se paralelo.

### Principais dependências

```text
HITL: Option A vs D131
  → Filter model (preco_max-only vs dual) + drawer policy
    → Catalog filter UI + query params
Header search API/query
  → Autocomplete UI
Frete quote OK
  → Pay enable (já existe)
Checkout createOrder (customer + pending_payment TTL)
  → Magic link / merge
    → Sacolinha + Order tracking UX
Admin search DS token
  → Products / Banners / Categories search chrome
Product dialog tabs
  ↔ AI intake media patterns (coordenar, não paralelizar no mesmo PR)
```

---

## B. Gap Map

| ID | Área | Requisito | Estado atual | Gap | Arquivos/componentes | Dependências | Risco |
|---|---|---|---|---|---|---|---|
| S-01 | Filtros | Card limpo: chips + checkbox + slider max-only; sem “Mais filtros”; sem labels reduntantes; marca multiselect | **Partially** — card completo com *labels de seção*, preço em **chips**, marca OK, “Mais filtros” **só no protótipo**; produção já mostra tudo no card | Substituir chips preço por slider `0…preco_max`; reduzir labels; alinhar Option A vs D131 | `CatalogFilters.tsx`, `CatalogFiltersMobile.tsx`, `filters.ts`, `filters.test.ts`, `ActiveFilterChips.tsx`, protótipo `app/prototype/catalog-filters/*` | HITL ADR (S-DEC-1) | Alto — muda query params / UX |
| S-02 | Filtros | Sexo menino/menina · idade · disponibilidade · preço · combo · reset · URL · responsive | **Already** (salvo preço slider) — URL PT, reset via chips ativos, drawer mobile | Validar regressão após slider; Unissex no toggle (manter?) | idem + `use-catalog-filters.ts`, `catalogo/page.tsx` | S-01 | Médio |
| S-03 | Header search | Dropdown autocomplete, typing, results, loading, empty, mobile | **Missing** no storefront; **Partial** no protótipo (`ProtoHeader`) | Promover padrão + query real (`q` / busca nome-marca) | `site-header.tsx`, novo `features/catalog/search/*`, `data.ts` | API/lista leve | Médio |
| S-04 | Header logo | Validar ~240px / proporção / header height | **Already** `max-w-[240px]`; asset SVG wordmark; PNG `logo.png` 335×597 (vertical, não header) | Validar visual HITL; não forçar 240px cegamente; evitar PNG alto | `BrandEmptyState.tsx`, `site-header.tsx`, `public/brand/*` | — | Baixo |
| S-05 | Cards | Hover Add to Cart desktop; touch OK; altura fixa; truncate; override actions | **Partial** — altura/truncate OK; **sem** ATC hover; card inteiro é `Link`; override só admin | Overlay ATC `pointer-events`; mobile mantém tap→PDP; não crescer card | `ProductCard.tsx`, `AddToCartButton.tsx`, `ProductGrid.tsx` | Hold reserve API | Alto hotspot |
| S-06 | Catálogo copy | “filtrar por sexo e idade”; chips após sexo; slider; drawer; favicon; Instagram | **Already** home + catálogo sexo/idade; favicon/IG D130; **Missing** slider; drawer produção = `CatalogFiltersMobile` (não “Mais filtros”) | Slider + limpeza labels; smoke favicon/IG | `home-age-filter.tsx`, footer, `app/icon.png` | S-01 | Baixo |
| S-07 | Frete | Cálculo correto CEP→quote | **Partial** — pipeline completo pós-#151; falhas possíveis em geocode externo / CEP sem rua | Diagnóstico prod por CEP; UX erro; não reintroduzir centro-município | `cep-geocode.ts`, `calculate-frete.ts`, `frete.ts`, `CheckoutAddressSection.tsx` | Settings loja | Alto ops |
| S-08 | Pagamento gate | Só após frete OK (delivery) | **Already** `isCheckoutPayEnabled` + reset frete ao mudar CEP | Garantir UI desabilita CTA + mensagem; invalidar frete se endereço/CEP mudar além do CEP | `pay-gate.ts`, `CheckoutForm.tsx`, `CheckoutSubmitButton.tsx` | S-07 | Médio |
| S-09 | Reserva copy | Botão “Finalizar Pagamento” + “+10 minutos extras” bold centrado | **Partial** — texto em cart/checkout; botão “Pagar com Mercado Pago”; TTL 10 min no order create | Redesign CTA; alinhar copy à regra D92 (TTL pagamento, não “hold+10”) | `CheckoutSubmitButton.tsx`, `CartSheet.tsx`, `CheckoutForm.tsx` | Entender D92 | Médio produto |
| S-10 | Identidade | Customer create/link/session/order/auth/email/redirect | **Partial** — customer no checkout; Auth no magic link; merge D106; default next `/sacolinha`; home = config/HITL residual | Documentar + harden redirects; painel ampliado | `checkout/actions.ts`, `resolve-customer*`, `merge-buyer-session.ts`, `auth/callback`, `PedidoAuthNudge` | Supabase Auth config | Alto |
| S-11 | Área cliente | Sacolinha/pedidos/status/compra | **Partial** — `/sacolinha` mínimo (status Sacolinha only) | Expandir lista pedidos + deep link `/pedido` | `sacolinha/*`, `features/buyer/*` | S-10 | Médio |
| S-12 | Order tracking | Timeline/info pagamento/frete/responsive/erros | **Partial** — progress steps + items + support; visual simples | Redesign estrutura (sem só “embelezar”) | `pedido/[codigo]/*`, `OrderProgressBar`, `orders/status.ts` | — | Médio |
| S-13 | Admin produto | Modal mobile-first tabs (info/fotos/áudio/IA/ordem); tipografia; toque | **Partial** — Dialog scroll único; fotos+áudio lateral; sem tabs; IA embutida via áudio | Introduzir tabs; priorizar tab IA; touch targets | `AdminProductDialog.tsx`, `AdminProductImageManager.tsx` | — | Alto hotspot |
| S-14 | Áudio estados | Persistente: gravado/aguardando/processando/ok/erro | **Partial** — botão Mic + Processar + toast | Badge/status strip persistente | `AdminProductDialog.tsx`, `product-dialog-actions.ts` | S-13 | Médio |
| S-15 | Fotos câmera | Camera mobile, multi, pós-áudio, ordem, preview, upload | **Partial** no dialog; **Partial/fragile** no intake (`getUserMedia`) | Estabilizar permissions/HTTPS; fluxo contínuo | `AdminProductImageManager`, `AdminAiIntakeClient`, `ai-intake/*` | Secure context | Alto |
| S-16 | Cadastro massa IA | Fluxo foto→áudio→IA→preview→finalizar; CTA explícito; preview DX | **Partial** — fluxo e “Gerar preview” existem; textos longos; câmera instável | Explicit CTA polish; preview UI desktop/mobile; menos copy | `intake-ia/page.tsx`, `AdminAiIntakeClient.tsx`, `mass-capture.ts` | S-15 | Alto |
| S-17 | Admin busca DS | Reutilizar padrão visual bom (Separação `h-14 rounded-2xl`) | **Partial** — Separação tem padrão forte; Produtos usa `Input` shadcn `h-11` | Extrair `AdminSearchField`; aplicar produtos (+ banners/cats se lista) | `SeparacaoSplitHub.tsx`, `AdminProductsClient.tsx`, novo shared | — | Baixo |
| S-18 | Times New Roman | Remover Times / serif fallback indevido | **Already** mitigado D130 (sem hardcode Times no repo app); **Needs validation** runtime | Smoke fonts; não tocar display Caveat | `layout.tsx`, `globals.css` | — | Baixo |
| S-19 | Banners CRUD | Modal create/edit/delete; sem página edição | **Missing** modal — páginas `banners/novo`, `banners/[id]` | Modal CRUD; list page only | `BannerList/Form`, `app/admin/.../banners/*`, `features/banners/*` | Padrão modal (S-20) | Médio |
| S-20 | Categorias CRUD | Mesmo padrão modal que banners | **Missing** modal — espelha banners em páginas | Modal CRUD alinhado a banners | `CategoryList/Form`, `categorias/*`, `features/categories/*` | Decidir owner do shared DialogForm | Médio — conflito se paralelo cego |
| S-21 | Override | Remover sidebar; acesso via produtos hold; confirm/feedback | **Partial** — já na grade produtos; **ainda** em `ADMIN_SECONDARY_NAV` + página deep link | Remover nav; manter deep link Passport opcional; UX confirmação | `admin-nav-config.ts`, `override/page.tsx`, `AdminProductsClient.tsx` | Hold Session rules | Médio inventário |
| S-22 | Padrões gerais | Mobile-first admin, cards altura, touch, modais, tabs, busca | **Partial** — Variant C admin (D121); regressões pós-SQ-3 possíveis | Checklist + fixes por wave, sem redesign global | Admin chrome, cards | Waves 2–4 | Médio |

### Respostas identidade (S-10) — contrato atual

| # | Pergunta | Resposta (código atual) |
|---|---|---|
| 1 | Cliente criado? | **Sim** — row `customers` no `createOrderAction` |
| 2 | Quando? | No submit do checkout (antes do MP), não no magic link |
| 3 | Identificador? | `customers.id` (UUID); match email/phone via `planCustomerResolve` |
| 4 | Sessão? | Hold: cookie `rp_cart_session` / `holdSessionId`; pós-auth: `customers.auth_user_id` + merge hold |
| 5 | Pedido? | `orders.customer_id` + snapshots contato/endereço |
| 6 | Refresh? | Pedido público por `public_code` sim; Sacolinha exige cookie Auth |
| 7 | Novo device? | Magic link no mesmo email → merge por email |
| 8 | Link Supabase? | `emailRedirectTo` → `{SITE}/auth/callback?next=…` (+ cookie fallback) |
| 9 | Por que home? | Site URL / Redirect allow-list / `next` strip / falha exchange → `/entrar` ou fallback externo; default código é `/sacolinha` não `/` |
| 10 | Destino correto? | **`/sacolinha`** (D128); opcional `next=/pedido/{codigo}` se produto quiser |

### TTL “+10 minutos” (S-09) — nuance crítica

- Carrinho: hold session TTL (~20 min, D28/D66).
- Ao **criar pedido**: status `pending_payment`, `expires_at = now + 10 min` (`PENDING_PAYMENT_TTL_MINUTES` / D92).
- **Não** há “extend hold by +10” no click do botão; a UI comunica a **janela de pagamento** pós-checkout.
- Recomendação: copy no botão deve refletir “+10 min para pagar no MP”, não “extras na reserva do carrinho”, **ou** alterar backend (fora do escopo cosmético — nova decision).

---

## C. Dependency Map

```text
[HITL] S-DEC-1 Option A vs D131
        │
        ▼
   S-01 Filter model + UI ──────────────┐
        │                               │
        ▼                               ▼
   S-02 Regression filters         S-03 Header search
        │                               │
        └──────────┬────────────────────┘
                   ▼
              S-05 ProductCard ATC (após filtros estáveis)
                   │
S-07 Frete diagnose/fix ──► S-08 Pay gate polish ──► S-09 CTA copy (+ ADR TTL)
                   │
                   ▼
         Checkout createOrder (já)
                   │
                   ▼
         S-10 Auth redirect harden (HITL Supabase)
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
      S-11 Customer area   S-12 Order tracking UX
         │
Admin track (paralelo storefront se ownership disjoint):
  S-17 Search DS ──► S-19 Banners modal ──► S-20 Categories modal
  S-21 Override nav cleanup (produtos já tem botão)
  S-13 Product dialog tabs ──► S-14 Audio status ──► (coordena) S-15/S-16 Intake
  S-18 Times smoke (qualquer wave)
  S-04 Logo HITL (qualquer wave)
  S-06 Favicon/IG smoke (já D130)
```

---

## D. Implementation Waves (futuras)

> Pensadas para **Cloud Agents em paralelo** com zonas de arquivo disjoint.

### Wave S0 — Decisions & smoke (orchestrator / HITL)

| | |
|---|---|
| **Objetivo** | Fechar conflitos ADR antes de código |
| **Tasks** | S-DEC-1 Option A vs D131; S-DEC-2 copy TTL vs backend; validar Supabase Auth URLs; smoke logo/favicon/fonts |
| **Deps** | — |
| **Arquivos** | `docs/09-decisions.md` (append only), run notes |
| **Risco** | Sem isso, Wave S1 diverge |
| **Paralelo** | N/A (humano + orquestrador) |

### Wave S1 — Storefront discovery (3 agents)

| Agent | Tasks | Zona | Não tocar |
|---|---|---|---|
| A | S-01 + S-02 filtros Option A | `features/catalog/filters*`, `CatalogFilters*`, `ActiveFilterChips` | `site-header`, `ProductCard` |
| B | S-03 busca header | `site-header.tsx`, `features/catalog/search/**` (novo) | `CatalogFilters*` |
| C | S-05 ATC hover card | `ProductCard.tsx`, `AddToCartButton` (composição) | filtros/header search |

| | |
|---|---|
| **Deps** | S0 |
| **Risco** | Médio — Agent C espera contrato ATC estável |
| **Paralelo** | A ∥ B ∥ C após S0 |

### Wave S2 — Checkout trust (2 agents)

| Agent | Tasks | Zona |
|---|---|---|
| D | S-07 frete diagnose/fix + S-08 gate UX | `lib/cep-geocode*`, `features/checkout/calculate-frete*`, `CheckoutAddress*`, `pay-gate*` |
| E | S-09 CTA pagamento + cart copy | `CheckoutSubmitButton`, `CheckoutForm` (copy only), `CartSheet` (copy) |

| | |
|---|---|
| **Deps** | S-DEC-2; Agent D antes se frete quebrado bloquear QA pagamento |
| **Paralelo** | D ∥ E se E só copy/UI botão |

### Wave S3 — Buyer identity & tracking (2 agents)

| Agent | Tasks | Zona |
|---|---|---|
| F | S-10 harden + S-11 área cliente | `features/buyer/**`, `sacolinha`, `entrar`, `auth/callback` |
| G | S-12 order tracking UX | `app/(public)/pedido/**`, `features/orders/components/**` |

| | |
|---|---|
| **Deps** | Wave S2 verde em smoke pagamento |
| **Paralelo** | F ∥ G (rotas disjoint) |

### Wave S4 — Admin CRUD & nav (3 agents)

| Agent | Tasks | Zona |
|---|---|---|
| H | S-17 `AdminSearchField` + aplicar produtos | `components/admin/AdminSearchField.tsx` (novo), `AdminProductsClient` |
| I | S-19 banners modal CRUD | `features/banners/**`, `components/admin/Banner*`, `app/admin/.../banners` |
| J | S-20 categories modal CRUD | `features/categories/**`, `Category*`, `app/admin/.../categorias` |
| K | S-21 override sidebar removal | `admin-nav-config.ts`, docs deep-link Passport |

| | |
|---|---|
| **Deps** | Preferir H primeiro (shared search); I e J **sequenciais** ou shared `AdminEntityDialog` num PR base |
| **Risco** | I+J paralelo sem shared = duplicação |
| **Paralelo** | H → (I ∥ J se shared pronto) ∥ K |

### Wave S5 — Admin product & IA (2 agents sequenciais)

| Agent | Tasks | Zona |
|---|---|---|
| L | S-13 tabs + S-14 audio status | `AdminProductDialog*`, image manager |
| M | S-15/S-16 intake camera + preview polish | `AdminAiIntakeClient`, `features/admin/ai-intake/**` |

| | |
|---|---|
| **Deps** | L antes de M se compartilharem componentes de mídia; senão M pode seguir com ownership estrito em intake only |
| **Paralelo** | Evitar L ∥ M no mesmo componente de captura |

### Wave S6 — QA / regression (orquestrador)

Checklist H + I abaixo; smoke mobile 375px; promote só após gate.

---

## E. Agent Ownership

| Task | Responsabilidade | Arquivos prováveis | Não editar em paralelo |
|---|---|---|---|
| S-01/02 | Catalog filters owner | `features/catalog/filters.ts`, `CatalogFilters.tsx`, `CatalogFiltersMobile.tsx`, `ActiveFilterChips.tsx`, tests | `site-header`, `ProductCard` |
| S-03 | Header search owner | `site-header.tsx`, `features/catalog/search/**`, catalog data search helper | `CatalogFilters*` |
| S-04 | Brand polish | `BrandEmptyState.tsx`, assets | evitar layout global |
| S-05 | Product card ATC | `ProductCard.tsx`, poss. `AddToCartButton.tsx` | grid layout shared com S-01 |
| S-07/08 | Checkout frete | `cep-geocode.ts`, `calculate-frete.ts`, `CheckoutAddressSection`, `pay-gate`, `CheckoutForm` (estado frete) | payments webhook |
| S-09 | Checkout CTA copy | `CheckoutSubmitButton.tsx`, `CartSheet.tsx` | frete logic |
| S-10/11 | Buyer auth/panel | `features/buyer/**`, `auth/callback`, `sacolinha` | checkout createOrder core |
| S-12 | Order public UX | `pedido/[codigo]`, `OrderProgressBar`, order components | buyer magic link form (exceto nudge visual) |
| S-13/14 | Product dialog | `AdminProductDialog.tsx`, image/audio actions | intake-ia page |
| S-15/16 | AI intake | `AdminAiIntakeClient.tsx`, `ai-intake/**` | `AdminProductDialog` |
| S-17 | Admin search DS | novo shared + `AdminProductsClient` / Separação | banners forms |
| S-19 | Banners | banners feature + admin banners routes | categories |
| S-20 | Categories | categories feature + routes | banners |
| S-21 | Override nav | `admin-nav-config.ts`, override page | execute-override RPC |

---

## F. Task Breakdown

### S-DEC-1 — ADR: Option A filtros vs D131

- **Contexto**: D131 travou dual-thumb + drawer marca/conservação no protótipo.
- **Objetivo**: Append ADR escolhendo Option A (max-only, sem Mais filtros, tudo no card) **ou** manter D131.
- **Escopo**: `docs/09-decisions.md` + atualizar `docs/slice-r` status.
- **Fora**: implementação UI.
- **AC**: decisão explícita; query param shape documentado (`preco_max` vs `preco_min`/`preco_max`).
- **Testes**: n/a.

### S-DEC-2 — ADR: copy TTL pagamento

- **Objetivo**: Confirmar se UI fala “+10 min para pagar” alinhado a D92 sem mudar backend.
- **AC**: texto aprovado; se backend mudar, ticket separado.

### S-01 — Filtros Option A no `/catalogo`

- **Objetivo**: Card limpo; slider max-only min=0; remover labels redundantes; manter sexo/idade/disponibilidade/preço/marca; sem Mais filtros.
- **Escopo**: UI + `filters.ts` parse/serialize + testes unit.
- **Fora**: autocomplete header; ATC card.
- **Deps**: S-DEC-1.
- **AC**:
  - Desktop sidebar e mobile drawer mostram os mesmos controles sem trigger “Mais filtros”.
  - Slider define apenas máximo; produtos com `price <= max`; min implícito 0.
  - Marca multiselect preservada.
  - Sem labels de seção quando o controle já comunica (ex. placeholder marca).
  - URL bookmarkable; refresh restaura estado.
- **Testes**: `filters.test.ts`; smoke manual 375/1280.

### S-03 — Header search autocomplete

- **Objetivo**: Popover resultados (~8) + “Ver todos no catálogo”; loading/empty; mobile.
- **Escopo**: client UI + endpoint/server helper busca nome/marca/tamanho.
- **Fora**: full-text Postgres avançado se não existir (começar com `ilike` limitado).
- **Deps**: —
- **AC**: digitar ≥2 chars mostra estados; Enter/`Ver todos` → `/catalogo?q=…`; teclado Esc fecha; touch não quebra scroll.
- **Testes**: unit debounce helper; E2E smoke busca.

### S-05 — ProductCard ATC hover

- **Objetivo**: Desktop hover “Adicionar ao Carrinho”; mobile sem hover trap; altura estável.
- **Escopo**: `ProductCard` overlay + reuso `AddToCartButton`/reserve.
- **Fora**: redesign grid.
- **AC**: hover não altera altura do card; click ATC não navega PDP; hold/own states coerentes; touch abre PDP no card body.
- **Testes**: component/interaction; hold reserve integration.

### S-07 — Frete diagnose & fix

- **Objetivo**: Identificar CEPs que falham em prod; corrigir gaps sem centro-município.
- **Escopo**: geocode/frete + UX mensagens.
- **AC**: CEP Foz válido → quote; CEP fora raio → erro claro + Sacolinha; CEP inválido → validation; delivery CTA só com quote OK.
- **Testes**: `cep-geocode.test.ts`, `pay-gate.test.ts`, smoke manual.

### S-08 — Pay enablement polish

- **Objetivo**: CTA disabled + motivo quando delivery sem frete; invalidar quote em mudança de CEP.
- **AC**: `delivery` + frete idle/error → botão disabled; após OK → enabled; mudar CEP → disabled até recalcular.
- **Testes**: `pay-gate.test.ts` + form integration.

### S-09 — CTA Finalizar Pagamento +10min

- **Objetivo**: Botão com título + subtítulo bold centrado “+10 minutos extras”.
- **Escopo**: `CheckoutSubmitButton` (+ cart se aplicável); remover parágrafo redundante se duplicar.
- **AC**: layout botão conforme spec; copy alinhada S-DEC-2; loading state preserva altura.
- **Testes**: snapshot/unit render.

### S-10 — Auth redirect & identity harden

- **Objetivo**: Garantir magic link → `/sacolinha` (ou next seguro); documentar HITL Supabase.
- **AC**: callback com `next` cookie/query; admin OTP blocked; merge email; não aterrissa em `/` com config correta.
- **Testes**: `resolve-auth-next` tests; checklist HITL.

### S-11 — Customer area expansion

- **Objetivo**: Painel com pedidos/status/info compra além do subset Sacolinha.
- **Escopo**: rotas sob auth buyer; RLS por `customer_id`/`auth_user_id`.
- **Fora**: address book completo.
- **AC**: lista pedidos do customer logado; deep link tracking; empty/loading/error; outro customer → 404/vazio (sem leak).
- **Testes**: data layer + E2E login magic (staging).

### S-12 — Order tracking UX

- **Objetivo**: Estrutura clara: status/timeline, itens, pagamento, frete/entrega, terminais.
- **AC**: passos coerentes com `getProgressSteps`; pending mostra CTA MP; cancelled/expired copy; 375px legível.
- **Testes**: `status.test.ts`; visual QA.

### S-13 — Product dialog tabs

- **Objetivo**: Tabs: Informações · Fotos · Áudio · IA/mídia (default create) · Ordenação.
- **AC**: mobile-first; touch ≥44px; sem Times; default tab IA em create.
- **Testes**: interaction; a11y tablist.

### S-14 — Audio persistent status

- **Objetivo**: Indicador para gravado / aguardando / processando / ok / erro.
- **AC**: visível sem toast; toast opcional complemento.
- **Testes**: state matrix unit.

### S-15/S-16 — Intake camera + preview

- **Objetivo**: Estabilizar câmera; multi-foto pós-áudio; CTA “Gerar preview com IA”; preview review/finalize/fechar.
- **AC**: secure context messaging; continuar fotos após áudio; preview editável; Finalizar/Fechar claros; menos texto explicativo.
- **Testes**: `mass-capture.test.ts`; device QA HITL.

### S-17 — AdminSearchField

- **Objetivo**: Extrair padrão Separação; aplicar em Produtos.
- **AC**: visual parity Separação; produtos usa o mesmo componente.
- **Testes**: visual smoke.

### S-19 / S-20 — Banners & Categories modal CRUD

- **Objetivo**: Create/edit/delete em Dialog na list page; remover rotas página de form (ou redirect).
- **Deps**: shared pattern (base PR) **antes** de paralelizar.
- **AC**: validação/loading/erro/sucesso; delete confirma; mobile.
- **Testes**: actions + UI.

### S-21 — Override via produtos only

- **Objetivo**: Remover Override da sidebar; manter ação na grade hold + deep link Passport se necessário.
- **AC**: nav sem Override; hold card mostra ação; confirmação + lista atualiza; inventário rules inalteradas (`execute_override_action`).
- **Testes**: `assert-override-allowed`, nav config tests.

---

## G. Acceptance Criteria (por requisito — objetivos)

1. **Filtros Option A**: no card único, controles = chips (sexo/idade/tamanho/conservação conforme decisão) + checkbox “Só disponíveis” + slider máximo + marca multiselect; zero botão “Mais filtros”; refresh preserva query.
2. **Busca header**: com ≥2 caracteres, popover com loading → resultados ou empty; “Ver todos” aplica `q` no catálogo.
3. **Logo**: header usa wordmark SVG; largura visual aprovada HITL (baseline atual `max-w-[240px]`); não estica PNG 335×597.
4. **Card ATC**: desktop hover revela CTA sem mudar altura; mobile sem CTA hover obrigatório; truncate nome 1 linha.
5. **Frete**: delivery só paga com `frete.status==='ok'` e CEP matching; erros tipados exibidos.
6. **CTA pagamento**: botão mostra “Finalizar Pagamento” e linha “+10 minutos extras” bold centrada.
7. **Identidade**: pós magic link autenticado → `/sacolinha` (config HITL); customer row existe pós-checkout.
8. **Área cliente**: autenticado vê só seus pedidos; empty state com CTA catálogo.
9. **Tracking**: timeline + blocos pagamento/entrega/itens; terminais com mensagem acionável.
10. **Admin produto**: tabs presentes; tab IA default no create; audio status persistente.
11. **Intake**: “Gerar preview com IA” explícito; preview permite editar e Finalizar/Fechar.
12. **Banners/Categorias**: CRUD completo em modal na listagem.
13. **Override**: ausente da sidebar; presente em produtos `hold`.
14. **Times**: inspeção computed `font-family` no storefront/admin ≠ Times New Roman.

---

## H. QA Plan

### Unit

- `filters` parse/serialize + slider max
- `pay-gate`, frete quote pure
- `resolve-auth-next`, `planCustomerResolve`, merge plans
- `mass-capture` labels/CTA
- `admin-nav-config` sem Override
- order `getProgressStepIndex`

### Integration

- Filtros → `getAvailableProducts`
- Reserve hold → cart → checkout validate
- `calculateFreteAction` + settings
- createOrder + customer link
- override RPC allowed/denied
- banners/categories actions

### E2E (críticos)

1. Navegação catálogo  
2. Filtragem multi + reset + refresh  
3. Add to cart (PDP + hover card)  
4. Hold Session countdown  
5. Checkout pickup  
6. Checkout delivery + frete  
7. Pagamento MP sandbox  
8. Magic link → Sacolinha  
9. Área cliente  
10. `/pedido/[codigo]` estados  
11. Intake IA foto→áudio→preview→finalizar  
12. Camera multi-foto  
13. Áudio estados  
14. Preview IA  
15. Banners CRUD modal  
16. Categorias CRUD modal  
17. Override hold na grade produtos  

### Responsive QA

| Breakpoint | Foco |
|---|---|
| 375 | filtros drawer, header search mobile, checkout, pedido, admin bottom nav, product dialog tabs, intake camera |
| 768 | split admin, cards grid |
| 1280 | sidebar filtros, hover ATC, admin rail |

---

## I. Regression Checklist

- [ ] Catálogo available+hold default; `disponiveis=1` só available (D66/D90)
- [ ] Hold próprio vs alheio na PDP (`OwnHoldActions` / reserved)
- [ ] Cart TTL e expire job
- [ ] Pickup paga sem frete; delivery bloqueado sem quote
- [ ] Sem geocode centro-município
- [ ] Webhook MP / sync success poll (D46)
- [ ] pending_payment expire 10 min
- [ ] Sacolinha statuses subset (D105)
- [ ] Admin Separação realtime / paid queue
- [ ] POS sell gate vs hold/override
- [ ] Passport deep link override ainda funciona se mantido
- [ ] Favicon / Instagram footer
- [ ] Fontes Fredoka/Caveat (não Times)
- [ ] Prototype `/prototype/*` não vaza para prod nav
- [ ] RLS: buyer não lê pedido alheio por id interno (só `public_code` público)

---

## Open Questions (HITL)

| ID | Achado | Decisão necessária | Impacto | Recomendação |
|---|---|---|---|---|
| Q1 | D131 dual-thumb + drawer vs Option A max-only + all-in-card | Qual manda? | Toda Wave S1 filtros | **Append ADR** adotando Option A *ou* rejeitar Option A |
| Q2 | Toggle inclui **Unissex** além menino/menina | Manter Unissex? | Filtros/home | Manter (dados `gender`) |
| Q3 | “+10 min” é TTL pagamento, não extensão hold | Copy vs backend change | Confiança comprador | Copy alinhada a D92; sem mudar TTL nesta wave |
| Q4 | Logo já 240px — ainda “pequeno”? | Ajustar px/altura header? | Header layout | HITL visual antes de ticket |
| Q5 | Ampliar Sacolinha para histórico completo vs só awaiting pickup | Escopo S-11 | Buyer panel size | Fase 1: pedidos paid+; histórico completed depois |
| Q6 | Remover rotas `/admin/banners/[id]` ou só redirect | Cleanup | SEO admin n/a | Redirect → list + `?edit=` |
| Q7 | Intake e ProductDialog compartilham captura? | Shared module? | Conflito agents | Shared só após Wave S5 base; senão duplicate thin wrappers |

---

## Recommended Implementation Order

Ordem **ajustada** vs hierarquia vertical do brief (com justificativa):

| Ordem | Wave | Por quê (≠ ordem cega do brief) |
|---|---|---|
| 1 | **S0 Decisions** | Option A vs D131 e TTL copy bloqueiam implementação correta |
| 2 | **S1 Storefront** (filtros ∥ search ∥ card ATC) | Brief prioriza catálogo; zones disjoint após S0 |
| 3 | **S2 Checkout** (frete → gate → CTA) | Pagamento depende de frete; CTA copy depende S-DEC-2 |
| 4 | **S3 Buyer + tracking** | Identidade/área/tracking dependem checkout confiável |
| 5 | **S4 Admin CRUD/nav/search** | Independente do storefront; banners→categories sequenciais ou shared base |
| 6 | **S5 Product dialog → Intake** | Tabs/áudio antes ou ownership estrito vs intake; IA priorizada no dialog create |
| 7 | **S6 QA gate** | Regressão + E2E matrix |

**Desvios explícitos da lista vertical do usuário:**

- **Logo / favicon / Instagram / Times / “sexo e idade”** — majoritariamente **Already (D130)**; só smoke/HITL, não wave de build.
- **Banners antes de Categories na hierarquia**, mas ambos usam o **mesmo anti-pattern de páginas** — extrair shared modal **antes** de dois agents paralelos.
- **Override** depois de produtos search DS opcional; remoção de nav é pequena e pode ir em S4∥.
- **Admin product/IA** depois do storefront/checkout porque não bloqueia receita self-service; brief os listou depois — mantido, mas **sequenciar** dialog→intake.

---

## Critério de conclusão desta wave (audit)

- [x] Auditoria estado atual  
- [x] Gap map  
- [x] Dependências  
- [x] Riscos  
- [x] Conflitos entre agents  
- [x] Waves futuras  
- [x] Ownership  
- [x] Task breakdown  
- [x] Acceptance criteria  
- [x] QA plan  
- [x] Regression checklist  
- [x] Recommended order  

**Nenhum código de produto foi alterado nesta wave.**

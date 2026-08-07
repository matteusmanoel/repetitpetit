# 12 — Sistema de UI

Spec visual viva da loja pública, resultado do refactor de UI executado em
tickets T0–T8 (branch `feature/ui-t0-foundation` → `feature/ui-t8-admin`,
uma PR por ticket para `develop`). Complementa — não substitui —
`docs/01-brand.md` (marca) e `docs/05-ux-direction.md` (fluxos/prioridades de
UX). Este documento descreve **como os tokens viram componentes**.

## Escopo

Loja pública (header, home, catálogo, filtros, PDP, carrinho). `/admin` tem
identidade própria — ver seção [Admin vs loja](#admin-vs-loja) no fim.
Checkout e `/desapegue` não têm ticket próprio: herdam tokens via `Button`/
`Input` sem redesign dedicado (decisão da sessão de refactor).

## Slice O — TipTop→Repeti redesign (D108 / D111)

**Antes** de features P0/P1, o storefront passa por redesign full alinhado ao
protótipo vencedor **Variant T** (TipTop hard-copy + Omnes/Becca + cores Repeti).
Fonte: `app/prototype/tiptop-redesign/VERDICT.md`. **Não implementar D0 até HITL OK.**

### Princípios de layout (cloud agents)

1. **TipTop chrome**: header busca pill; categorias **texto+Lucide** (não fotos); Conta com popover.
2. **Cores**: verde neutro/CTA; azul meninos; rosa meninas/promo (D112).
3. **Home**: hero + filtro idade (Becca) + grids.
4. **Catálogo**: sidebar desktop; grid 2/3; preço verde; acentos de gênero azul/rosa.
5. **PDP / Checkout**: CTA pill verde; bloco Becca “você pode gostar também”.
6. **Carrinho**: sheet desktop; **fullscreen mobile**.
7. **Mobile**: BottomBar Home/Catálogo/Sacolinha/Conta; hambúrguer para Desapegue/Sobre/Legal/Admin.
8. **Sobre/FAQ + Privacidade + Termos** + footer soft em todas as rotas públicas.
9. **Tipografia**: Omnes + Becca em escala grande.

### Escopo do rollout D0

Home, catálogo, PDP, cart sheet, checkout, `/pedido/[codigo]`, header/footer.
Admin (fila/IA) herda densidade/radius mas mantém identidade ferramenta.

## Tokens de condição e gênero (D57)

Definidos em `app/globals.css` (`@theme inline`) e consumidos só através de
`features/catalog/ui-tokens.ts` — nunca hardcodear hex ou montar classe
condicional inline num componente.

| Token | Uso | Mapa em `ui-tokens.ts` |
|---|---|---|
| `--color-condition-{novo,seminovo,bom-estado,com-detalhes}` (+ `-foreground`) | Pill de conservação no card, PDP e filtro | `CONDITION_PILL_CLASS` |
| `--color-gender-{menino,menina,unissex}` | Borda do card, pill de atributo na PDP, fundo ativo do filtro | `GENDER_BORDER_CLASS`, `GENDER_PILL_CLASS`, `GENDER_TOGGLE_ACTIVE_CLASS` |

`GENDER_TOGGLE_ACTIVE_CLASS` guarda strings **completas e literais**
(`"data-[state=on]:bg-gender-menino"`) porque o Tailwind v4 escaneia o
texto-fonte do arquivo para gerar a classe — concatenar o variant em runtime
não é detectado pelo JIT.

## Card de produto

Ver anatomia completa em `docs/05-ux-direction.md` (seção "Card de
produto"). Resumo: borda 2px por gênero, `rounded-2xl`, badge "Peça única"
coral quando `quantity === 1`, pill de condição colorida, preço em
`--primary`. Implementado em `features/catalog/components/ProductCard.tsx`;
o skeleton (`ProductCardSkeleton.tsx`) espelha a mesma estrutura com shimmer
(`--animate-shimmer`, ver `Skeleton` em `components/ui/skeleton.tsx` com
`shimmer` prop) em vez do `animate-pulse` padrão do shadcn.

## Filtros

Ver `docs/05-ux-direction.md` ("Layout dos filtros"). `ToggleGroup` colorido
por gênero, pills de conservação, drawer inferior no mobile / sidebar fixa
no desktop. Chips ativos (`ActiveFilterChips.tsx`) saem com fade+scale via
`motion`/`AnimatePresence`. `use-catalog-filters.ts` e `filters.ts`
continuam intocados — filtros são só apresentação.

## PDP

- Galeria: scroll-snap nativo mantido; dots repaginados — o ativo vira uma
  pill alongada (`w-5 bg-primary`) em vez de um círculo cheio.
- Badge "Peça única": sólido coral igual ao card + `animate-badge-pulse`
  (`@keyframes badge-pulse`, opacidade 100→70→100 a cada 2s).
- Atributos: pills horizontais scrolláveis (marca/tamanho neutros, condição
  e gênero coloridos) em vez da grade `dl` anterior —
  `features/catalog/components/ProductAttributes.tsx`.
- CTA: `h-13` (52px), `rounded-full`. Após reservar com sucesso, mostra
  "Adicionado" com ícone de check por 1.5s (crossfade via `motion`) antes de
  virar "Ver carrinho" — decoração visual só; não toca no
  `fetch("/api/hold/reserve")` nem na máquina de estados de
  `AddToCartButton.tsx`.
- "Você pode gostar": scroll horizontal com snap
  (`RelatedProductsCarousel.tsx`), não o grid do catálogo.

## Carrinho

`features/cart/components/CartSheet.tsx` monta seu próprio `Dialog` do
`radix-ui` (não o `Sheet` compartilhado — ver D56) para animar com `motion`:
overlay com fade + `backdrop-blur-sm`, painel com slide-in `x: 100% → 0` via
spring. Countdown por item vira coral/semibold abaixo de 5 minutos restantes.
Itens saem da lista com fade+slide-up, tanto ao remover manualmente quanto
ao expirar — a lógica de expiração (`setInterval`,
`releaseHoldItemClient` / `releaseHoldSessionClient`, `removeItem`, o store em
`features/cart/store.tsx`) não muda. Rotas `/api/cart/*` estão **410 Gone**
(D90 / #96); reserva só via Hold Session.

## Header e home

- Header: mais respiro ao redor do logo, nav em Inter 500 com indicador de
  link ativo, `backdrop-blur`/sombra só depois do scroll (não permanente).
  Badge do carrinho anima scale+fade ao mudar a contagem.
- Home: hero full-bleed (`16/9` desktop / `4/3` mobile) com overlay escuro e
  copy sobreposta à imagem (revisa D39 — ver D58); fallback sem foto usa
  `--primary` com padrão geométrico de pontos. Seções alternam fundo branco
  ↔ `--muted` para separação visual sem depender só de espaçamento.

## Regras de animação

- Lib única: `motion` (`motion/react`), nunca `framer-motion` legado nem uma
  segunda lib (D56).
- Nenhum hover-only como único indicador de estado — sempre acompanhado de
  active/focus (regra herdada de `docs/05-ux-direction.md`).
- Pulso (`badge-pulse`) reservado para o badge "Peça única" da PDP — não
  duplicar em outros elementos da mesma tela.
- Spring/`AnimatePresence` ficam na loja pública. `/admin` não usa nenhum
  dos dois (ver abaixo).

## Admin vs loja

`/admin/(protected)` tem identidade de **ferramenta**, não de loja — ver
`components/admin/AdminShell.tsx` e a regra `.admin-shell` em
`app/globals.css`.

| | Loja pública | Admin |
|---|---|---|
| Tipografia de título | Nunito 700/800 (`font-heading`) | Inter 600 (`.admin-shell` sobrescreve `font-heading`/`h1`–`h6` para `var(--font-inter)`) |
| Cor funcional | Lima/coral por gênero/condição | Só tokens shadcn neutros (`primary`, `muted`, `destructive` sóbrio) |
| Animação | `motion` (spring, pulso, crossfade) | Nenhuma — transições CSS padrão do shadcn |
| Densidade de controles | Botões grandes (`size="lg"`, CTA 52px) | `size="sm"` nos controles, tabelas compactas |
| Confirmação destrutiva | — | `Dialog` do shadcn (nunca `window.confirm`) |
| Ações de tabela | — | `DropdownMenu` em vez de botão solto por ação |

`/admin/login` fica fora do escopo de `.admin-shell` (renderiza antes da
sessão existir) e mantém a identidade da loja.

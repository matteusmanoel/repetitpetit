# Slice S — Waves

Frontier: **Wave S1** (+ SS-4 CTA opcional em paralelo).

Fonte: [`AUDIT-TECHNICAL-PLAN.md`](./AUDIT-TECHNICAL-PLAN.md) · decisões **D132**, **D133**.

| Wave | Issues | Status | Gate |
|---|---|---|---|
| S0 | D132 · D133 | **DONE** | ADR append |
| S1 | [#160](https://github.com/matteusmanoel/repetitpetit/issues/160) · [#161](https://github.com/matteusmanoel/repetitpetit/issues/161) · [#162](https://github.com/matteusmanoel/repetitpetit/issues/162) | **frontier** (`ready-for-agent`) | 3 PRs disjoint → `develop` |
| S2 | [#163](https://github.com/matteusmanoel/repetitpetit/issues/163) CTA · [#164](https://github.com/matteusmanoel/repetitpetit/issues/164) frete/gate | #163 ready ∥; #164 após/coord form | smoke checkout |
| S3 | [#165](https://github.com/matteusmanoel/repetitpetit/issues/165) · [#166](https://github.com/matteusmanoel/repetitpetit/issues/166) | blocked | após smoke checkout |
| S4 | [#167](https://github.com/matteusmanoel/repetitpetit/issues/167) · [#168](https://github.com/matteusmanoel/repetitpetit/issues/168) · [#169](https://github.com/matteusmanoel/repetitpetit/issues/169) · [#170](https://github.com/matteusmanoel/repetitpetit/issues/170) | blocked | #168 antes de #169 |
| S5 | [#171](https://github.com/matteusmanoel/repetitpetit/issues/171) · [#172](https://github.com/matteusmanoel/repetitpetit/issues/172) | blocked | #171 antes de #172 se shared media |
| S6 | QA / regression | blocked | checklist audit §I |

## Ownership (evitar conflito)

| Issue | Zona principal | Não tocar |
|---|---|---|
| #160 SS-1 | `features/catalog/filters*`, `CatalogFilters*` | `site-header`, `ProductCard` |
| #161 SS-2 | `site-header`, `features/catalog/search/**` | `CatalogFilters*` |
| #162 SS-3 | `ProductCard`, composição ATC | filtros / header search |
| #163 SS-4 | `CheckoutSubmitButton`, `CartSheet` copy | frete geocode |
| #164 SS-5 | checkout address / pay-gate UX | CTA button chrome (#163) |
| #165 SS-6 | `features/buyer/**`, `/sacolinha` | `pedido` visual (#166) |
| #166 SS-7 | `pedido/[codigo]`, `OrderProgressBar` | buyer auth core |
| #167 SS-8 | `AdminSearchField` + produtos | banners forms |
| #168 SS-9 | banners feature + admin banners | categories |
| #169 SS-10 | categories feature + admin cats | banners |
| #170 SS-11 | `admin-nav-config`, override page | execute-override RPC |
| #171 SS-12 | `AdminProductDialog*` | intake-ia |
| #172 SS-13 | `AdminAiIntakeClient`, `ai-intake/**` | product dialog |

## Dispatch (Wave S1)

Até **3–4** Cloud Agents em paralelo:

1. `#160` filtros  
2. `#161` search  
3. `#162` card ATC  
4. (opc.) `#163` CTA checkout  

Base: `develop`. Prompt: `docs/agents/cloud-dispatch.md`.

## MCP Handoff Schedule

| Wave | Após merge | Orchestrator |
|---|---|---|
| S1 | #161 | Confirmar busca sem índice novo no Supabase |
| S2 | #164 | Smoke CEP Foz se geocode tocado |
| S3 | #165 | HITL Auth Redirect URLs se cair em `/` |
| S5 | #172 | Device QA câmera HTTPS |

## Anti-goals

- Não promover `/prototype/*` para nav de produção
- Não reabrir frete centro-município
- Não mudar TTL pending_payment sem ADR nova
- Não dois agents em product dialog + intake no mesmo componente de captura

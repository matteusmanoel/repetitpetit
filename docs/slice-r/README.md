# Slice R — Catálogo: filtros + search (protótipo)

Guia vivo do grill. Protótipo **antes** de tickets no storefront real.
Decisão: **D131**.

**Status**: grill fechado · protótipo pronto · aguardando HITL veredito

## Pergunta do protótipo (UI)

> Como composição de filtros “sempre à mão” + drawer + busca com autocomplete
> devem parecer no header e no `/catalogo`?

**Run:** `pnpm dev` → `/prototype/catalog-filters?variant=A`  
**README:** `app/prototype/catalog-filters/README.md`

## Decisões travadas

| # | Tema | Decisão |
|---|---|---|
| Q1 | Escopo do protótipo | **B** — filtros do catálogo **+** search autocomplete no mesmo protótipo |
| Q2 | Sempre visível vs drawer | **B** — sempre: gênero · idade · disponibilidade · preço slider · **tamanho**; drawer: marca, conservação |
| Q3 | Preço | **A** — range contínuo `preco_min` + `preco_max` (dual thumb); substitui faixas chip |
| Q4 | Autocomplete | **A** — até ~8 peças (nome/marca/tamanho) + “Ver todos no catálogo” |
| Q5 | Eixo variantes | **A** — composição do “sempre à mão”; search chrome igual nas 3 |
| Q6 | Matriz | **A** Faixa · **B** Sticky slim · **C** Chips+sheet |
| Q7 | Host | **C** — HITL em `/prototype/catalog-filters`; tickets no `/catalogo` após veredito |
| Q8 | Fechamento | **A** — gerar protótipo + D131 |

## Anti-goals

- Não promover `/prototype/*` para produção.
- Não implementar no `/catalogo` real antes do veredito.
- Não misturar redesign admin neste slice.

## Artefatos

| Artefato | Path |
|---|---|
| Protótipo | `app/prototype/catalog-filters/` |
| Decisão | D131 em `docs/09-decisions.md` |

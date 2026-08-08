# Slice O — Redesign TipTop + Sacolinha

Guia para cloud agents. Decisões: **D101–D114** em `docs/09-decisions.md`.
Protótipo: `app/prototype/tiptop-redesign?variant=T` (vencedor T rev.3 — ver `VERDICT.md`).
**HITL OK 2026-08-07** · **D0 merged** (#122 / D114). Admin UI polish fica pós-features.
Wave 2 P0 frontier: #124 · #125 (depois #126 com secret AI).

## Glossário

| Termo | Significado |
|---|---|
| **Sacolinha** | Bolsa única por Customer de peças **pagas** aguardando retirada (default) ou settle |
| **Entrega imediata** | Ramo opcional no checkout; frete haversine antes do MP; prioridade na fila |
| **Hold Session** | Reserva pré-pago (Slice N) — não é Sacolinha |
| **Consignação / Sacolinha mensal** | **Apagado** do glossário (D101); schema purge em #123 / D113 |

## Waves

| Wave | Objetivo | Bloqueia VIP? |
|---|---|---|
| **D0** | Design tokens + redesign storefront no visual **T** (após HITL) | Sim (antes de features novas) |
| **Purge** | Remover docs/schema legado consignação/`order_type` misuse (#123 / D113) | Não (paralelo a D0) |
| **P0** | Sacolinha default + fix empty checkout + IA lote + térmica sequencial | Sim (catálogo real + compra retirar) |
| **P1** | Frete haversine + prioridade fila + magic link + área Sacolinha | Não (pós-VIP ok) |
| **P2** | Notify 30d, polish, cupom real | Não |

## Contratos

- [SO-01 — Redesign D0](./SO-01-redesign.md)
- [SO-02 — Checkout Sacolinha / frete](./SO-02-checkout-fulfillment.md)
- [SO-03 — Auth comprador + Sacolinha panel](./SO-03-buyer-auth-sacolinha.md)
- [SO-04 — Intake IA + print térmico](./SO-04-ai-intake-print.md)
- [SO-05 — Fila admin prioridade](./SO-05-admin-queue.md)

## GitHub issues (cloud agents)

| Issue | Wave |
|---|---|
| [#122](https://github.com/matteusmanoel/repetitpetit/issues/122) SO-D0 redesign | D0 |
| [#123](https://github.com/matteusmanoel/repetitpetit/issues/123) Purge consignação | Purge |
| [#124](https://github.com/matteusmanoel/repetitpetit/issues/124) Checkout Sacolinha + empty MP fix | P0 |
| [#125](https://github.com/matteusmanoel/repetitpetit/issues/125) Status `na_sacolinha` | P0 |
| [#126](https://github.com/matteusmanoel/repetitpetit/issues/126) AI intake + thermal print | P0 |
| [#127](https://github.com/matteusmanoel/repetitpetit/issues/127) Frete haversine | P1 |
| [#128](https://github.com/matteusmanoel/repetitpetit/issues/128) Queue priority urgente | P1 |
| [#129](https://github.com/matteusmanoel/repetitpetit/issues/129) Magic link + Sacolinha panel | P1 |

## Anti-goals

- Não implementar P0 visual em cima do UI antigo sem D0.
- Não redirect duro pós-MP para login (D109).
- Não geo/push (D106).
- Não Correios neste slice (D102).
- Não promover código do `/prototype/*` para produção.

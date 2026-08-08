# Slice P — Admin Ops UX

Guia vivo do grill → protótipo → tickets. **Não promover** `/prototype/*` para prod.
Decisões: **D120** (grill), **D121** (veredito C); ADR **0002** (`packed_at`).
Termos: `CONTEXT.md`. UI craft ref: Leleco/Leen adaptado a tokens Repeti / Variant T.

**Status**: HITL **aprovado** · SP-1…SP-6 **merged** · prod `main` (#150) READY  
**Handoff prévio**: Slice O fechado em código (#122–#129); VIP/Auth fora do foco.

## Pergunta do protótipo (UI)

> Como deve parecer e fluir o admin mobile-first: shell + separação + cadastro em massa + notificações + dashboard operacional?

**Run (referência):** `pnpm dev` → `/prototype/admin-ops-ux?variant=C`  
**VERDICT:** `app/prototype/admin-ops-ux/VERDICT.md`

## Decisões travadas (grill + HITL)

| # | Tema | Decisão |
|---|---|---|
| Q1 | Prioridade vs Slice O residual | Epic admin agora; Auth redirect VIP opcional curto |
| Q2 | Veículo | Protótipo HITL primeiro; tickets no `/admin` após veredito |
| Q3 | Escopo v1 | Shell + Separação + Cadastro em massa + Notif + Dashboard + CRUD dialog |
| Q4 | Identidade | Híbrido: shell/dashboard brand; listas/CRUD/intake densos |
| Q5 | Separação | Fila + Painel; HITL C = **split** cliente + grade |
| Q5b | Hierarquia | Destaque = data/hora + Customer; código secundário |
| Q6 | Default | Mobile → Separação |
| Q7–8 | Intake | Evolui intake-ia; 1 foto/peça no loop massa; IA background; preview pós-série |
| Q9–10 | Notificações | Drawer: urgente > venda > Sacolinha prazo |
| Q11–12 | Dashboard | Ops + séries; acessos mock; analytics fora |
| Q13 | Bottom bar | Separação · Em massa · Produtos · Painel (+ hamburger = sidebar) |
| Q15 | CRUD | Dialogs no lugar de páginas; categoria inline; multi-foto; áudio→campos |
| Q17–18 | Check | `packed_at`; sem auto-avançar (ADR 0002) |
| HITL | Winner | **Variant C** (rail + split) |

## Anti-goals

- Não reabrir #122–#129 salvo regressão.
- Não instrumentar analytics neste epic.
- Não promover `/prototype/*` para produção.
- Não auto-avançar pedido quando 100% checked.
- Notif drawer ≠ centro de logs.

## Artefatos

| Artefato | Path |
|---|---|
| Protótipo | `app/prototype/admin-ops-ux/` |
| VERDICT | `app/prototype/admin-ops-ux/VERDICT.md` |
| Issues | [#138](https://github.com/matteusmanoel/repetitpetit/issues/138) SP-1 shell · [#139](https://github.com/matteusmanoel/repetitpetit/issues/139) SP-2 Separação · [#140](https://github.com/matteusmanoel/repetitpetit/issues/140) SP-3 Cadastro em massa · [#141](https://github.com/matteusmanoel/repetitpetit/issues/141) SP-4 Produtos · [#142](https://github.com/matteusmanoel/repetitpetit/issues/142) SP-5 Notif · [#143](https://github.com/matteusmanoel/repetitpetit/issues/143) SP-6 Dashboard |

**Frontier:** SP-1 (#138) — demais bloqueados por ele.


## HITL notes

- **rev.2–4**: densidade, notif macOS, C=alvo, modal produto, holds, echarts, hamburger, próxima ação…
- **Final**: C aprovado; Cadastro em massa; modal shadcn + multi-foto + Áudio/Processar; status PT.

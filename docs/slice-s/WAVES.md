# Slice S — Waves

Fonte: [`AUDIT-TECHNICAL-PLAN.md`](./AUDIT-TECHNICAL-PLAN.md) · decisões **D132**, **D133**.

| Wave | Issues | Status | Gate |
|---|---|---|---|
| S0 | D132 · D133 | **DONE** | ADR em `docs/09-decisions.md` |
| S1 | [#160](https://github.com/matteusmanoel/repetitpetit/issues/160) · [#161](https://github.com/matteusmanoel/repetitpetit/issues/161) · [#162](https://github.com/matteusmanoel/repetitpetit/issues/162) · [#163](https://github.com/matteusmanoel/repetitpetit/issues/163) | **DONE** | [PR #173](https://github.com/matteusmanoel/repetitpetit/pull/173) → `develop` |
| S2 | [#164](https://github.com/matteusmanoel/repetitpetit/issues/164) frete/gate | **DONE** | [PR #174](https://github.com/matteusmanoel/repetitpetit/pull/174) |
| S3 | [#165](https://github.com/matteusmanoel/repetitpetit/issues/165) · [#166](https://github.com/matteusmanoel/repetitpetit/issues/166) | **DONE** | PR #174 |
| S4 | [#167](https://github.com/matteusmanoel/repetitpetit/issues/167) · [#168](https://github.com/matteusmanoel/repetitpetit/issues/168) · [#169](https://github.com/matteusmanoel/repetitpetit/issues/169) · [#170](https://github.com/matteusmanoel/repetitpetit/issues/170) | **DONE** | PR #174 |
| S5 | [#171](https://github.com/matteusmanoel/repetitpetit/issues/171) · [#172](https://github.com/matteusmanoel/repetitpetit/issues/172) | **DONE** (tabs product dialog deferred) | áudio strip + CTA intake; tabs full → follow-up |
| S6 | QA / regression | **DONE** (smoke A) | prod `main`@`bde4a38` Ready; search API OK |

## Production

- Commit: `bde4a38` (inclui #173 + #174)
- URL: https://repetitpetit.vercel.app
- Smoke (2026-08-08): `/api/catalog/search?q=ga` → JSON; catálogo slider + “Só disponíveis”; home brand; favicon 200

## Residual / follow-up

1. **AdminProductDialog tabs** (info/fotos/áudio/IA/ordem) — #171 entregou status de áudio persistente; tabs completas ficaram de fora
2. **Intake câmera em device real** — não exercitado no smoke A
3. **MP paid E2E** — fora do escopo (opção A)

## Anti-goals (mantidos)

- Não promover `/prototype/*` para nav de produção
- Não reabrir frete centro-município
- Não mudar TTL pending_payment sem ADR nova

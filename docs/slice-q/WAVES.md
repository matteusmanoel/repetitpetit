# Slice Q — Waves

Frontier: **Wave 1** (P0 + polish + intake bug) em paralelo — áreas de arquivo disjoint.

| Wave | Issues | Status | Gate |
|---|---|---|---|
| 1 | #151 frete · #152 magic link · #153 polish · #154 intake | **DONE** merged → `main` (#159) | CI + smoke |
| 2 | (depois) protótipo filtros · Auth brand · admin UX visual | blocked | após Wave 1 verde em prod |

## Ownership (evitar conflito)

| Issue | Zona principal |
|---|---|
| #151 | `lib/cep-geocode.ts`, `features/checkout/calculate-frete*`, testes geocode |
| #152 | `features/buyer/*`, `app/auth/callback`, `/sacolinha`, `/entrar` |
| #153 | storefront header/footer/favicon/catalog cards/filters copy/hold copy |
| #154 | `features/admin/ai-intake/*`, `/admin/produtos/intake-ia` |

## MCP Handoff Schedule

| Wave | Após merge | Orchestrator |
|---|---|---|
| 1 | #152 | Checklist HITL Auth (Redirect URLs + templates PT) — dashboard Supabase |
| 1 | #151 | Smoke CEP Foz em prod após promote |
| 1 | todos | Promote `develop` → `main` (autorizado nesta sessão); smoke VIP |

## Anti-goals

- Sem fallback frete centro-município
- Sem mini-admin comprador
- Sem redesign visual admin (#154 só bug funcional)

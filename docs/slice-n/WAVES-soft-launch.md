# Soft launch — Reservada / Hold honesty — Execution Plan

**Slice:** MVP soft go-live gate (grill 2026-08-04/05)  
**Status:** Wave 1 active  
**Base branch:** `develop`  
**Approved by:** Mateus (GO + AFK orchestrate)

## Waves

### Wave 1 — Frontier (parallel, disjoint)

| Issue | Title | Cohesion | Cloud |
|---|---|---|---|
| #95 | Hold Session: não criar sessão vazia em conflict | standalone | cloud-safe (migration file; orchestrator applies) |
| #96 | Cart legado → 410 | standalone | cloud-safe |
| #97 + #98 | Catálogo/PDP Reservada + Realtime toast/silent | one-shot (#97+#98) | cloud-safe (RLS migration → orchestrator) |
| #99 | Auto-cancel pending_payment 10 min | standalone | cloud-safe (migration/cron → orchestrator) |
| #100 | Polish seed/banner/typo/favicon | standalone | cloud-safe |
| #101 | Doc térmica | standalone | cloud-safe |

### Wave 2 — After Wave 1 merge + public-link gate

| Issue | Notes |
|---|---|
| #102 | Epic deferido waitlist + OAuth — **não despachar** até soft go-live estável |

## Ownership matrix (Wave 1)

| Resource | Writer |
|---|---|
| `reserve_hold_item` / hold RPC migrations | #95 |
| `app/api/cart/*` | #96 |
| Catalog/PDP/RLS `products` SELECT hold+available | #97 |
| Realtime subscription catalog/PDP | #98 (same agent as #97) |
| pending_payment expire job + order cancel | #99 |
| Seed/banners/favicon/label copy | #100 |
| `docs/thermal-label-print.md` | #101 |

No same-wave single-writer conflict if #95 and #99 use **separate additive migrations**.

## MCP Handoff Schedule

After Wave 1 merges to `develop`:

1. Apply new migrations on Supabase project `wcgpamsvnhpgonxzbzlg` (`supabase db push` / MCP)
2. `supabase gen types typescript --linked` → commit or confirm PR already regenerated
3. Smoke: concurrent reserve (0 empty sessions); cart 410; held PDP owner vs other; pending expire after 10m (or forced clock in test)
4. Deploy production when human returns

## Wave 1 gate

- [ ] All Wave 1 PRs merged to `develop`
- [ ] `pnpm typecheck && pnpm lint && pnpm build && pnpm test` on develop
- [ ] Migrations applied remotely
- [ ] Human: soft go-live link OK?

## Contract docs

- Existing: `docs/slice-n/SN-02-contract.md`, `SN-05`, `SN-06`
- #97 must not reimplement hold reserve — consume SN-02 only

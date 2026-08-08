# Slice P — Waves (Admin Ops UX)

**Status:** Wave 1 active (2026-08-08)  
**VERDICT:** `app/prototype/admin-ops-ux/VERDICT.md` · **D121**  
**Do not promote** `app/prototype/*` into production routes.

## Ownership matrix

| Ticket | Owns (approx.) | Must not touch |
|---|---|---|
| SP-1 #138 | `components/admin/AdminShell.tsx`, admin layout nav, mobile bottom bar / hamburger | order_items schema, intake pipeline, product form core |
| SP-2 #139 | Separação / fulfillment queue UI, `order_items.packed_at` migration | shell chrome, product CRUD dialog, intake |
| SP-3 #140 | Cadastro em massa / `intake-ia` UX | Separação packed_at, dashboard charts |
| SP-4 #141 | Produtos list/dialog, multi-foto, áudio→campos, holds UI | Separação hub, notif drawer |
| SP-5 #142 | Notifications drawer + bell wiring | product schema, Separação checks |
| SP-6 #143 | Admin dashboard / Painel + ECharts | shell structure (consume nav only) |

## Waves

### Wave 1 — Shell frontier

| Issue | Title | Blocked by | Status |
|---|---|---|---|
| #138 | SP-1 Admin shell (rail + bottom bar + hamburger) | — | **MERGED** #144 2026-08-08 |

**Gate:** PR merged to `develop`; CI green; smoke `/admin` mobile 375 + desktop rail. **OPEN for Wave 2.**


### Wave 2 — Parallel surfaces (after #138 closed)

| Issue | Title | Blocked by | Status |
|---|---|---|---|
| #139 | SP-2 Separação + `packed_at` | #138 | **MERGED** #148 |
| #140 | SP-3 Cadastro em massa | #138 | **MERGED** #147 |
| #141 | SP-4 Produtos dialog | #138 | **MERGED** #146 |
| #142 | SP-5 Notificações | #138 | **MERGED** #149 |
| #143 | SP-6 Dashboard | #138 | **MERGED** #145 |

**Parallelism:** up to 5 agents on disjoint areas per matrix. Prefer merge order SP-2 (migration) before long-running UI if type regen needed.

**Gate:** all PRs merged; typecheck/lint/build/test on `develop`; orchestrator MCP handoffs done. **IN PROGRESS 2026-08-08.**


## MCP Handoff Schedule

| After wave | Orchestrator (local) |
|---|---|
| Wave 1 | None required (UI shell) |
| Wave 2 / #139 | Apply `packed_at` migration on project `wcgpamsvnhpgonxzbzlg`; `generate_typescript_types` if needed |
| Wave 2 / others | Smoke admin routes; Vercel preview OK |
| Slice close | Promote `develop` → production (authorized HITL 2026-08-08); soft-launch recheck `docs/11-soft-launch.md` |

## Frontier

Wave 2 closed (#139–#143). Slice P implementation complete → gate + prod promote.

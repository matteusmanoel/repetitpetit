# SN-02 — Hold Session RPC contract

**Issue**: [#68](https://github.com/matteusmanoel/repetitpetit/issues/68)  
**Status**: Applied (Wave 1 inventory foundation)  
**Decisions**: D61, D66, D14, D30, D74  
**Migration**: `supabase/migrations/20260803110000_hold_session_rpcs.sql`

This document is the **runtime inventory reservation contract**. Downstream Slice N
agents must consume these primitives and must **not** reimplement hold/release
`products.status` updates.

---

## Lifecycle

```text
available
    ↓  reserve_hold_item
hold  (products.status projection; hold_sessions + hold_items = truth)
    ↓  release_hold_item / release_hold_session(cancelled|expired)
available

hold
    ↓  convert_hold_session(order_id)     ← NOT sold
converted session (products remain hold; hold_items kept)
    ↓  paid confirmation (SN-05 / SN-06)
sold
```

---

## RPCs

All functions are `SECURITY DEFINER`, `search_path = public`, **EXECUTE for
`service_role` only**.

| Function | Purpose |
|---|---|
| `reserve_hold_item(p_session_id text, p_product_id uuid) → jsonb` | Find/create active session; max 5; insert item; `products.status = hold` |
| `release_hold_item(p_session_id text, p_product_id uuid) → jsonb` | Remove one item; restore `available` |
| `release_hold_session(p_session_id text, p_final_status text default 'cancelled') → jsonb` | Release all items; set session `cancelled` or `expired` |
| `convert_hold_session(p_session_id text, p_order_id uuid) → jsonb` | Mark session `converted`, link order; **does not** set `sold` |
| `_finalize_hold_session(uuid, text)` | Internal helper for cancel/expire |

### `reserve_hold_item` responses

```json
{ "status": "ok", "hold_session_id": "<uuid>", "expires_at": "<timestamptz>" }
{ "status": "limit_reached" }
{ "status": "unavailable" }
```

Behavior notes:

- Idempotent if the same session already holds the product → `ok`.
- Clears stale `hold_items` for the product on `expired`/`cancelled` sessions (D14).
- Auto-expires the caller’s own active session when `expires_at <= now()` before creating a new one.
- Concurrency: `FOR UPDATE` on product + `UNIQUE(hold_items.product_id)`.

### `release_hold_item` responses

```json
{ "status": "ok", "hold_session_id": "<uuid>", "product_id": "<uuid>" }
{ "status": "not_found" }
```

### `release_hold_session` responses

```json
{ "status": "ok", "hold_session_id": "<uuid>", "final_status": "cancelled"|"expired" }
{ "status": "not_found" }
{ "status": "invalid_status" }
```

Use `p_final_status = 'expired'` from SN-03. Use `'cancelled'` for customer cancel / Override.

### `convert_hold_session` responses

```json
{ "status": "ok", "hold_session_id": "<uuid>", "order_id": "<uuid>" }
{ "status": "not_found" }
{ "status": "order_not_found" }
{ "status": "expired" }
{ "status": "empty" }
```

**Critical:** convert leaves `products.status = hold` and keeps `hold_items`.
Paid → sold cleanup belongs to SN-05/SN-06.

---

## TypeScript wrappers

File: `features/cart/hold-session.ts`

| Export | Maps to |
|---|---|
| `reserveHoldItem` | `reserve_hold_item` |
| `releaseHoldItem` | `release_hold_item` |
| `releaseHoldSession` | `release_hold_session` |
| `convertHoldSession` | `convert_hold_session` |
| `getHoldSession` | service-role read of active session + items |

### HTTP routes

| Route | Status |
|---|---|
| `POST /api/hold/reserve` | **Active contract** (new inventory locks) |
| `POST /api/hold/release` | **Active contract** |
| `POST /api/cart/reserve` | Legacy dual-read until SN-04 cutover |
| `POST /api/cart/release` | Legacy dual-read until SN-04 cutover |

Browser cookie `rp_cart_session` remains the Hold Session `session_id` (SN-04 / D79 — no rename).

---

## Allowed callers

| Caller | Allowed RPCs |
|---|---|
| SN-04 Hold checkout / API | `reserve_hold_item`, `release_hold_item`, `getHoldSession`, `convert_hold_session` |
| SN-03 Expiration job | `release_hold_session(..., 'expired')` only (or `_finalize_hold_session` via that wrapper) |
| SN-05 Inventory state machine | Must **call** SN-02 for hold↔available; owns sold transitions separately |
| SN-06 MP webhook | Must **not** reserve/release; may observe converted session; owns paid reconcile → calls SN-05 for sold |
| SN-07 POS | No Hold Session for store sale; if breaking an online hold → SN-13 → SN-02 release |
| SN-13 Override | `release_hold_session` / `release_hold_item` + `override_events` insert |

---

## Forbidden behaviors

Downstream agents **MUST NOT**:

1. `UPDATE products SET status = 'hold'|'available'` for reservation reasons outside these RPCs.
2. Insert/delete `hold_items` outside these RPCs (except SN-05/SN-06 cleanup after **sold**).
3. Implement a second expire path that updates status without calling `release_hold_session`.
4. Treat `convert_hold_session` as sold.
5. Put Mercado Pago / payment-provider logic inside reservation RPCs.
6. Create Hold Sessions for POS store sales.

`cart_reservations` / `reserve_cart_product` remain in the DB for dual-read until SN-04 cutover, but **new inventory locks must use Hold Session RPCs**.

---

## Integration notes

### SN-03 — Expiration

**Shipped** — see `docs/slice-n/SN-03-contract.md` / D76.

- Batch entrypoint: `expire_due_hold_sessions()` → `_finalize_hold_session(id, 'expired')`.
- Primary schedule: pg_cron `expire-hold-sessions` every 5 minutes.
- Edge Function `expire-hold-sessions` is a thin RPC wrapper (manual/ops).
- **Do not** duplicate status SQL in future agents.

### SN-04 — Hold checkout

- PDP “Comprar Agora” → `POST /api/hold/reserve`.
- Sheet reads `getHoldSession` / Zustand mirror of hold state + countdown from `expires_at`.
- `createOrderAction` must validate against `hold_items`, then call `convert_hold_session` after creating `pending_payment` order (recommended) — **not** mark sold.
- Stop using `cart_reservations` as inventory lock.

### SN-05 — Inventory state machine

- Owns: `hold|available → sold`, `sold_channel`, store/online paid completion helpers.
- Does **not** reimplement reserve/release.
- Hold → available must go through SN-02 release RPCs.
- After paid→sold, may delete converted session `hold_items` and clear hold projection as part of the sold transition transaction.

### SN-06 — Mercado Pago

- Owns webhook idempotency + late payment after Override.
- Must not call `reserve_hold_item`.
- On paid: use SN-05 transition; inspect `hold_sessions.checkout_order_id` / converted session as needed.
- Payment provider details stay out of SN-02.

### SN-07 — POS

- Store orders: `channel = store`; **no** Hold Session creation.
- Selling a product currently `hold` requires Override (SN-13) first → SN-02 release → then SN-05/SN-07 sold path.

### SN-13 — Override

1. `release_hold_session` / `release_hold_item` (SN-02).
2. Insert `override_events`.
3. Cancel `pending_payment` order if applicable (SN-06 rules for paid block).
4. Proceed to store sale via SN-05/SN-07 — no duplicate release SQL.

---

## Validation performed (local)

- Migration/RPC applied to project `wcgpamsvnhpgonxzbzlg`
- Types regenerated (`lib/supabase/types.ts`)
- SQL checks: concurrent reserve winner/loser, max 5, release restores available, convert leaves `hold`
- Unit tests for wrapper mapping
- `pnpm typecheck` / `pnpm build` / `pnpm test` (see PR/report)

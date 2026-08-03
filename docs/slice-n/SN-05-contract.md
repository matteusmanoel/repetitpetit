# SN-05 — Inventory state machine contract

**Issue**: [#71](https://github.com/matteusmanoel/repetitpetit/issues/71)  
**Depends on**: SN-01 (schema), SN-02 (Hold Session RPCs)  
**Decisions**: D65, D66, D67, D71, D75, D79  
**Migration**: `supabase/migrations/20260803140000_inventory_apply_transition.sql`  
**(Orchestrator must apply remotely after merge — cloud agents do not apply.)**

---

## Ownership

| Edge | Owner | Runtime |
|---|---|---|
| `available → hold` | **SN-02** | `reserve_hold_item` (via `applyInventoryTransition` delegate or direct wrapper) |
| `hold → available` | **SN-02** | `release_hold_item` / `release_hold_session` |
| `hold → sold` | **SN-05** | `apply_inventory_transition` RPC (`FOR UPDATE` + `sold_channel` + delete `hold_items`) |
| `available → sold` | **SN-05** | same RPC (store POS or online slip-through) |
| `available ↔ inactive` | **SN-05** | same RPC |

`planTransition` models **all** edges (including available↔hold) for validation/docs.
Runtime available↔hold **never** uses bare `UPDATE products.status`.

---

## TypeScript API

| Export | File | Role |
|---|---|---|
| `planTransition` | `features/inventory/transitions.ts` | Pure planner |
| `applyInventoryTransition` | `features/inventory/apply-transition.ts` | Service-role apply |
| `markProductsSoldForOrder` | `features/inventory/apply-transition.ts` | Paid → sold helper for webhooks/POS |

### `holdSessionId` meaning

| Transition | `context.holdSessionId` |
|---|---|
| available↔hold | Client cookie `session_id` (SN-02 RPC arg) |
| hold→sold | `hold_sessions.id` UUID (must match `hold_items.hold_session_id`) |

---

## SQL RPC

`apply_inventory_transition(product_id, from, to, sold_channel?, hold_session_id?, order_id?) → jsonb`

- `SECURITY DEFINER`, `service_role` only
- Locks product `FOR UPDATE`
- Rejects available↔hold with `{ status: "use_sn02" }`
- Idempotent: already `sold` + `to=sold` → `{ status: "ok", outcome: "already_sold" }`
- On sold: sets `sold_channel`, deletes `hold_items` + legacy `cart_reservations` for the product

---

## Callers

| Caller | Usage |
|---|---|
| SN-06 / `apply-mp-status` | `markProductsSoldForOrder({ channel: "online" })` |
| SN-07 POS paid | `markProductsSoldForOrder({ channel: "store" })` or `available→sold` |
| Admin deactivate / activate | `available↔inactive` via `applyInventoryTransition` |
| SN-13 Override | Release via SN-02 first; then SN-05/SN-07 for store sold |

---

## Forbidden

1. Bare `UPDATE products SET status = 'sold'|'inactive'|…` outside this module / RPC
2. Reimplementing available↔hold status SQL (SN-02)
3. Treating `convert_hold_session` as sold
4. Moving inventory to sold before Order is `paid` (D71)

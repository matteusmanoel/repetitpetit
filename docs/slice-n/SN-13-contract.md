# SN-13 — Override action (atomic cancel + audit)

**Issue**: [#79](https://github.com/matteusmanoel/repetitpetit/issues/79)  
**Depends on**: SN-01 (`override_events`), SN-02 (hold release), SN-05, SN-06 (`assertOverrideAllowed`)  
**Decisions**: D62, D72, D83, D84  
**Migration**: `supabase/migrations/20260803150000_execute_override_action.sql`  
**(Orchestrator must apply remotely after merge — cloud agents do not apply.)**

---

## Ownership

| Concern | Owner |
|---|---|
| Paid-block gate | SN-06 / `assertOverrideAllowed` — **SN-13 must call it** |
| Hold → available | **SN-02** only (`release_hold_session` / `_finalize_hold_session`) |
| Cancel `pending_payment` online + `order_events.cancelled_by_override` | SN-13 |
| `override_events` insert | SN-13 (D72) |
| Late MP webhook after cancel | SN-06 / `reconcileLatePayment` |
| Full POS UI | SN-08 (not this ticket) |
| Passport wiring | SN-11 (consumes reusable button) |

---

## TypeScript API

| Export | File | Role |
|---|---|---|
| `executeOverrideAction` | `features/override/execute-override-action.ts` | Service-role override |
| `executeOverrideActionFromAdmin` | `features/override/override-action.ts` | Admin server action |
| `assertOverrideAllowed` | `features/override/assert-override-allowed.ts` | Pure gate (SN-06) |
| `isOverrideActionVisible` | `features/override/visibility.ts` | UI visibility helper |
| `OverrideActionButton` | `components/admin/OverrideActionButton.tsx` | Reusable dialog |

**Module choice (D84):** lives in `features/override/` next to the SN-06 gate — not `features/pos/override.ts`.

### Result shape

```ts
{ ok: true; outcome: "applied" | "noop"; overrideEventId; affectedHoldSessionId; affectedOrderId }
{ ok: false; reason: "already_paid" | "not_found" | "invalid_status" | "validation" | "db" | "hold_release_failed"; error }
```

---

## SQL RPC

`execute_override_action(product_id, staff_id, reason, context?) → jsonb`

- `SECURITY DEFINER`, `service_role` only
- Locks product `FOR UPDATE`
- Re-checks paid/sold → `{ status: "already_paid" }`
- Active hold → `release_hold_session(..., 'cancelled')`
- Converted hold (pending checkout) → `_finalize_hold_session` (clears items + available; session stays `converted`)
- Cancels online `pending_payment` + inserts `order_events` `cancelled_by_override`
- Inserts `override_events`
- Idempotent: available + no hold + no pending → `{ outcome: "noop" }` (no second audit row)

---

## SN-06 coordination

1. Override sets `orders.status = cancelled` and writes `cancelled_by_override`.
2. Late MP approved webhook → `applyMercadoPagoPaymentStatus` sees `cancelled` → `reconcileLatePayment` (`reconciled_after_override`), **never** sold.
3. SN-13 does **not** reimplement reconcile; it only leaves the cancelled + event flag SN-06 already consumes (order `cancelled` is sufficient; event is the audit/ops flag).

---

## Forbidden

1. Bare `UPDATE products SET status = 'available'` as the primary hold-release path
2. Skipping `assertOverrideAllowed` before mutate
3. Overriding `paid` / sold
4. Building full POS (SN-08) or Passport history (SN-15) in this ticket

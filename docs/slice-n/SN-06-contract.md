# SN-06 — Paid online priority + late webhook reconcile

**Issue**: [#72](https://github.com/matteusmanoel/repetitpetit/issues/72)  
**Depends on**: SN-01, SN-05 (`markProductsSoldForOrder`)  
**Decisions**: D62, D46, D50, D83  
**Migration**: none

---

## Ownership

| Concern | Owner |
|---|---|
| Paid → sold (online MP) | SN-05 via `markProductsSoldForOrder` (called from `apply-mp-status`) |
| `paid → paid` idempotency + sold repair | SN-06 / `applyMercadoPagoPaymentStatus` (`already_paid`) |
| Late webhook on `cancelled` order | SN-06 / `reconcileLatePayment` |
| Override of `paid` blocked | SN-06 helper `assertOverrideAllowed` — **SN-13 must call it** |
| Override UI / `override_events` / hold release | SN-13 (not this ticket) |

---

## TypeScript API

| Export | File | Role |
|---|---|---|
| `assertOverrideAllowed` | `features/override/assert-override-allowed.ts` | Pure gate → `already_paid` |
| `reconcileLatePayment` | `features/payments/reconcile-late-payment.ts` | Cancel payment row + stub refund + event |
| `applyMercadoPagoPaymentStatus` | `features/payments/apply-mp-status.ts` | Routes cancelled+approved → reconcile |
| `stubMercadoPagoRefund` / `createMercadoPagoRefund` | `lib/mercado-pago/create-refund.ts` | Stub default; real client injectable |

### Outcomes (apply)

| Condition | Outcome |
|---|---|
| order past pending + MP paid | `already_paid` (may repair sold) |
| order `cancelled` + MP paid (first) | `reconciled_after_override` |
| order `cancelled` + already reconciled | `noop` |
| order `pending_payment` + MP paid | `applied_paid` → SN-05 sold |

### SN-13 integration (mandatory)

```ts
import { assertOverrideAllowed } from "@/features/override";

// Inside Override transaction, after SELECT FOR UPDATE on order:
const gate = assertOverrideAllowed(order);
if (!gate.ok) {
  return { ok: false, reason: gate.reason }; // 'already_paid'
}
```

---

## Forbidden

1. Marking products `sold` on the late-reconcile path
2. Reimplementing hold/release (SN-02) or sold transitions (SN-05)
3. Building Override UI in SN-06
4. Live Mercado Pago refund homolog in Cloud Agent runs (stub/mock only)

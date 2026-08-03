# SN-15 — Product status history (Garment Passport)

**Issue**: [#81](https://github.com/matteusmanoel/repetitpetit/issues/81)  
**Depends on**: SN-01, SN-02, SN-05, SN-07, SN-09, SN-11, SN-13  
**Decisions**: D65, D72, D73, D84, **D88**  
**Migration**: `supabase/migrations/20260803160000_product_status_events.sql`  
**(Orchestrator must apply remotely after merge — cloud agents do not apply.)**

---

## Ownership

| Concern | Owner |
|---|---|
| `product_status_events` table + RLS | SN-15 (this migration) |
| Emit on available↔hold | SN-02 RPCs (`reserve_hold_item`, `release_hold_item`, `_finalize_hold_session`) |
| Emit on sold | SN-05 `apply_inventory_transition` (online + store) |
| Emit on override hold→available | SN-13 `execute_override_action` → `_finalize_hold_session(..., context=override)` |
| Emit on activation | TS `activateProductAction` → `emit_product_status_event` |
| Passport timeline UI | `PassportHistory` + `getPassportData` |

---

## Table (Option A)

`product_status_events`: product lifecycle audit separate from `order_events`.

- RLS: **service_role only** (no anon / authenticated policies)
- Optional `notes` for override reason / RP code / hold session label
- Context values: `activation` | `hold` | `release` | `expiration` | `override` | `sale`

---

## Emitter strategy (D88)

Prefer **SQL hooks inside existing inventory RPCs** so hold/sale/override stay atomic with the status change. Activation stays in TypeScript because `staff_code` assignment is outside `apply_inventory_transition`.

Do **not** scatter client inserts; Passport reads via service role loader only.

---

## Passport UI

- Collapsible **Histórico** (`features/passport/components/PassportHistory.tsx`)
- Timeline oldest → newest
- Sold snippet: channel, date, order `public_code` (link to `/admin/pedidos`), payment method

---

## Forbidden

1. Extending `order_events` with `product_id` for this trail (rejected — D88)
2. Applying this migration remotely from Cloud Agents
3. Building a compliance/SIEM platform on top of these rows

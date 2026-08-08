# Separação check is per Peça, Order status stays manual

Fulfillment lifecycle status remains on the **Order** (`paid` → `confirmed` → …).
Staff need a persistent per-line **Separação check** (`order_items.packed_at` or
equivalent) so pickers see done vs pending inside an Order without getting lost.
Checks do **not** auto-advance Order status — confirming/shipping stays an
explicit staff action. Session-only checks were rejected (multi-device ops).

**Status:** accepted (Slice P grill 2026-08-08)

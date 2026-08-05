# Pending payment TTL — auto-cancel contract

**Issue**: [#99](https://github.com/matteusmanoel/repetitpetit/issues/99)  
**Depends on**: SN-02 (`_finalize_hold_session`), SN-05 (sold ownership — not used here), SN-06 (`reconcileLatePayment`)  
**Decisions**: D92 (supersedes D29 payment-clock note of 30 min for online pending)  
**Migration**: `supabase/migrations/20260805120100_expire_pending_payment_orders.sql`  
**(Orchestrator must apply remotely after merge — cloud agents do not apply.)**

---

## What ships

| Piece | Location | Role |
|---|---|---|
| TTL | `PENDING_PAYMENT_TTL_MINUTES = 10` + `orders.expires_at` DEFAULT | Clock after order creation |
| SQL RPC | `expire_due_pending_payment_orders()` | Cancel due online pending; release via SN-02 |
| pg_cron | job `expire-pending-payment-orders` `* * * * *` | **Primary** schedule |
| Edge Function | `supabase/functions/expire-pending-payment-orders` | Thin service-role wrapper |
| TS wrappers | `features/orders/expire-pending-payment.ts` | Plan helpers + RPC call |

---

## Guarantees

1. Only `channel = 'online'` + `status = pending_payment` + `expires_at <= now()`.
2. Order → `cancelled` / `payment_status = cancelled` + `cancelled_by_payment_ttl` event.
3. Converted Hold Session → `_finalize_hold_session(..., 'cancelled')` (hold_items cleared, products `hold → available`). Session row may remain `converted` (same as Override).
4. **Never** marks sold (SN-05 ownership untouched).
5. Late MP paid webhook on cancelled order → existing SN-06 `reconcileLatePayment` (no sold).
6. Store POS `pending_payment` is untouched.

---

## Forbidden

- Bare `UPDATE products SET status` as the primary release path
- Setting order status to `expired` for this job (breaks SN-06 reconcile gate on `cancelled`)
- Cancelling `channel = store` orders
- Calling `markProductsSoldForOrder` from the expire path

---

## Invoke

```bash
SELECT public.expire_due_pending_payment_orders();

curl -X POST "$SUPABASE_URL/functions/v1/expire-pending-payment-orders" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```

Response shape:

```json
{
  "status": "ok",
  "expired_count": 0,
  "failed_count": 0,
  "order_ids": []
}
```

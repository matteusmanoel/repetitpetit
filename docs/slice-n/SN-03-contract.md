# SN-03 — Hold Session expiration contract

**Issue**: [#69](https://github.com/matteusmanoel/repetitpetit/issues/69)  
**Depends on**: SN-02 (`docs/slice-n/SN-02-contract.md`, D75)  
**Decisions**: D70, D66, D75

---

## What ships

| Piece | Location | Role |
|---|---|---|
| SQL RPC | `expire_due_hold_sessions()` | Finds due active sessions; calls SN-02 `_finalize_hold_session(id, 'expired')` |
| pg_cron | job `expire-hold-sessions` `*/5 * * * *` | **Primary** schedule → `SELECT public.expire_due_hold_sessions()` |
| Edge Function | `supabase/functions/expire-hold-sessions` | Thin service-role wrapper of the same RPC (manual/ops) |

Migration: `supabase/migrations/20260803120000_hold_expiration_cron.sql`

---

## Guarantees

1. Expire **reuses SN-02** — no duplicated `UPDATE products` / `DELETE hold_items` outside `_finalize_hold_session`.
2. Due session → `status = 'expired'`, items removed, products `hold → available`.
3. Non-expired active sessions are untouched.
4. Concurrent workers use `FOR UPDATE SKIP LOCKED`.

---

## Forbidden

- Edge Function / cron SQL that updates `products.status` directly
- Second expire implementation alongside `expire_due_hold_sessions`
- Relying on staff to clear holds

---

## Invoke

```bash
# SQL (same as cron)
SELECT public.expire_due_hold_sessions();

# Edge Function (service_role JWT)
curl -X POST "$SUPABASE_URL/functions/v1/expire-hold-sessions" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```

Response shape:

```json
{
  "status": "ok",
  "expired_count": 0,
  "failed_count": 0,
  "hold_session_ids": []
}
```

---

## Applied

- Project: `wcgpamsvnhpgonxzbzlg`
- Cron jobid registered alongside `release-expired-reservations`
- Edge Function version deployed (JWT verify enabled)

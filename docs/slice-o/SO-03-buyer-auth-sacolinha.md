# SO-03 — Buyer auth + Sacolinha panel

**Decisions:** D103, D106, D109 · **Wave:** P1

## Goal

Guest-first purchase; after paid order, soft magic-link nudge; merge anonymous session; minimal Sacolinha panel for logged-in buyers.

## In scope

- Supabase Auth magic link for buyers (separate from `admins`)
- Post-MP always `/pedido/[codigo]` first; sheet/tooltip nudge (not hard redirect)
- Merge by email: `anonymous_id` / hold cookie → `customers`
- Panel: list paid items awaiting pickup (`na_sacolinha` / packing states)

## Out

- Password auth, WhatsApp OTP, push, geolocation
- Full purchase history / address book (later)

## Acceptance

- [ ] Guest can pay without account
- [ ] Magic link with same email shows Sacolinha items from that customer
- [ ] `/pedido/[codigo]` works logged out

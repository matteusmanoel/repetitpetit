# SO-05 — Admin fulfillment queue priority

**Decisions:** D105 · **Wave:** P0 status + P1 sort/badge for delivery

## Goal

Single Realtime paid-orders queue; immediate delivery sorted first with urgent badge; Sacolinha statuses through `na_sacolinha`.

## Status

**Sacolinha:** `pago → separando → na_sacolinha → concluído`  
**Entrega:** `pago → separando → em_rota → concluído`

## In scope

- Sort: `entrega_imediata` first
- Badge “ENTREGA URGENTE”
- Persist `pickup_deadline` / `ready_since` fields for future 30d job (no notifier yet)

## Out

- Slack/email/push channels
- Active 30-day auto-notification job

## Acceptance

- [ ] Delivery orders appear above Sacolinha
- [ ] Badge visible at 375px admin width
- [ ] Sacolinha path can mark `na_sacolinha`

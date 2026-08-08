# SO-04 — Intake IA + thermal print

**Decisions:** D107, D94 · **Wave:** P0

## Goal

Admin batch intake: photos + audio → AI preview (editable) → confirm product → sequential thermal label print with ACK.

## Flow

1. Staff adds N garments in session (photos + one audio each or shared script)
2. “Gerar preview” → Zod-structured draft into product form fields
3. Confirm → create `available` product + `staff_code` RP
4. Enqueue label job: `pending → printing → printed|failed` (one at a time, ACK, 1 retry)
5. Print failure does **not** roll back product (`label_print=failed` + UI reprint)
6. Bridge: local ESC/POS (model TBD) — Vercel never talks USB

## Out

- Per-field confidence UI, auto-publish without human, WhatsApp→catalog

## Fallback

XLSX import remains (`/admin/produtos/importar`).

## Acceptance

- [ ] Preview editable before insert
- [ ] Confirm creates product + staff_code
- [ ] Print queue is sequential; UI shows progress; reprint works
- [ ] Offline bridge: product saved, print marked failed

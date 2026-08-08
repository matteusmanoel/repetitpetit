# SO-02 — Checkout fulfillment (Sacolinha default + entrega imediata)

**Decisions:** D102, D104 · **Wave:** P0 (Sacolinha path) + P1 (frete)

## Goal

Binary fulfillment at checkout: Sacolinha default (no address); optional immediate delivery with ViaCEP + haversine frete before MP enable.

## P0 — Sacolinha path

- Pre-select Sacolinha with copy: “Guarde na Sacolinha — retire quando quiser”
- Contact only: nome, telefone, e-mail
- Fix empty-state flash before MP preference render (loading skeleton / keep form)
- Order status pipeline supports `na_sacolinha` after packing

## P1 — Entrega imediata

- Toggle reveals CEP + “Calcular frete”
- `frete = max(min, km × rate × multiplier)`; admin knobs; max radius → ineligible
- Pay disabled until frete OK
- Persist fulfillment + frete on order

## Out

- Correios
- Manual neighborhood price tables

## Acceptance

- [ ] Default checkout completes Sacolinha without address
- [ ] Delivery path cannot create MP preference without frete
- [ ] Empty MP handoff state eliminated (skeleton or stable UI)

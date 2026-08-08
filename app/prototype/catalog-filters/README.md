# PROTOTYPE — Catalog filters + search (Slice R)

**Throwaway.** Do not promote to `/catalogo`.

## Question

> How should “always-on” filters + drawer + header search autocomplete compose?

## Run

```bash
pnpm dev
```

Open: [/prototype/catalog-filters?variant=A](http://localhost:3000/prototype/catalog-filters?variant=A)

| Key | Layout |
|---|---|
| **A** | Faixa horizontal acima do grid |
| **B** | Sticky slim (~200px) + grid |
| **C** | Chips + sheet (tela limpa) |

Arrow keys / bottom switcher cycle variants. State dump top-left.

## Locked (grill)

See `docs/slice-r/README.md` + **D131**.

## After verdict

Capture winner in `VERDICT.md`; open tickets against real `/catalogo` + header search.

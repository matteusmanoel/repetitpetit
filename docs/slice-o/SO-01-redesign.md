# SO-01 — Redesign TipTop→Repeti (D0)

**Decisions:** D108, D111, D112 · **Refs:** `docs/01-brand.md`, `docs/12-ui-system.md`, `app/prototype/tiptop-redesign/VERDICT.md`

## Goal

Roll out storefront UI matching **Variant T rev.3**.

## Gate

HITL accept `/prototype/tiptop-redesign?variant=T` (rev.3) before production coding.

## In scope

- TipTop chrome: pill search, Lucide category nav (text+icon), Conta popover
- Color hierarchy green → blue → pink
- BottomBar mobile + hamburger; cart fullscreen mobile
- Related “você pode gostar também” (Becca) on PDP + checkout
- Pages: home, catalog, PDP, cart, checkout, pedido, **sobre/FAQ**, **privacidade**, **termos**
- Soft footer on all public routes
- Fonts Omnes + Becca (licensed or documented stand-ins)
- Hold/MP/Realtime behavior unchanged

## Out of scope

- Promoting `/prototype/*` components
- Buyer magic-link (SO-03), AI intake (SO-04), frete (SO-02 P1)

## Acceptance

- [ ] Match T rev.3 at 375px and ≥1280px
- [ ] No circular photo category nav
- [ ] BottomBar + full cart mobile
- [ ] Legal + soft footer present
- [ ] `pnpm typecheck && pnpm lint && pnpm build`

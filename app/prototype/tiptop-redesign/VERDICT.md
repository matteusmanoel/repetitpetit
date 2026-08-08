# Prototype verdict — TipTop → Repeti

**Date:** 2026-08-07 (rev. 3 — HITL header/BottomBar/legal)  
**Route:** `/prototype/tiptop-redesign?variant=T`  
**Question:** How should Repeti look with TipTop structure + Repeti identity?

## Winner

**Variant T rev.3** (default).

### Locked from rev.2
TipTop structure, Omnes/Becca (Fredoka/Caveat stand-ins), Repeti logo, desktop `max-w-6xl`.

### Locked from rev.3 (HITL)

| Item | Spec |
|---|---|
| Category nav | **Texto + Lucide** (ícone acima, centralizado); **não** bolinhas com foto |
| Distribuição | `justify-center` + gap generoso (cresce do meio às bordas) — sem escala diferencial |
| Hover | `cursor-pointer`, elevação (`-translate-y` + shadow); Conta = popover |
| Cores | Hierarquia **verde → azul → rosa**: verde neutro/CTA/preço; azul=meninos; rosa=meninas/promo |
| Relacionados | Bloco **“você pode gostar também”** (Becca) na PDP e Checkout |
| Mobile | **BottomBar**: Home · Catálogo · Sacolinha · Conta; resto no **hambúrguer** |
| Carrinho mobile | **Fullscreen** |
| Sobre/FAQ | Layout suave (hero pontilhado, wave, cards coloridos, accordion FAQ) |
| Legal | Privacidade + Termos adaptados a Repeti (estrutura TipTop/iFraldas, conteúdo próprio) |
| Footer | Soft footer TipTop-like em todas as telas do storefront do protótipo |

## Gate

HITL OK em T rev.3 antes de implementação D0 (#122).

## Capture

Throwaway under `app/prototype/tiptop-redesign/`. Do not promote to production.

# Mapa de Reaproveitamento — flordoestudante

Repo fonte: `/Users/matteusmanoel/Projects/Personal/flordoestudante`

**Regra**: nunca copiar um arquivo inteiro cegamente. Adaptar sempre.
Antes de copiar, verificar se o path ainda existe no repo fonte com `ls` ou `Glob`.

---

## KEEP — Alta reutilização (copiar e adaptar)

### Infraestrutura Supabase (lib/)

| Fonte | Destino | Adaptar |
|---|---|---|
| `apps/floricultura-web/lib/supabase/browser.ts` | `lib/supabase/browser.ts` | Trocar tipos de `Database` |
| `apps/floricultura-web/lib/supabase/server.ts` | `lib/supabase/server.ts` | Idem |
| `apps/floricultura-web/lib/supabase/server-service.ts` | `lib/supabase/server-service.ts` | Idem |
| `apps/floricultura-web/lib/supabase/upload.ts` | `lib/supabase/upload.ts` | Trocar bucket names |
| `apps/floricultura-web/app/api/upload/route.ts` | `app/api/upload/route.ts` | Manter `requireAdminSession` |

### Mercado Pago (lib/ + api/)

| Fonte | Destino | Adaptar |
|---|---|---|
| `apps/floricultura-web/lib/mercado-pago/config.ts` | `lib/mercado-pago/config.ts` | Sem mudança |
| `apps/floricultura-web/lib/mercado-pago/create-preference.ts` | `lib/mercado-pago/create-preference.ts` | Remover gift_message, adaptar items |
| `apps/floricultura-web/lib/mercado-pago/fetch-payment.ts` | `lib/mercado-pago/fetch-payment.ts` | Sem mudança |
| `apps/floricultura-web/features/payments/apply-mercadopago-status.ts` | `features/payments/apply-mp-status.ts` | Adaptar para novos status |
| `apps/floricultura-web/app/api/webhooks/mercado-pago/route.ts` | `app/api/webhooks/mercadopago/route.ts` | Adaptar para novos status + marcar produto sold |
| `apps/floricultura-web/app/api/payments/sync/route.ts` | `app/api/payments/sync/route.ts` | Adaptar status |

### Auth admin

| Fonte | Destino | Adaptar |
|---|---|---|
| `apps/floricultura-web/features/admin/session.ts` | `features/admin/session.ts` | Trocar imports de DB types |
| `apps/floricultura-web/features/admin/sign-out-action.ts` | `features/admin/sign-out-action.ts` | Sem mudança |
| `apps/floricultura-web/app/admin/login/page.tsx` | `app/admin/login/page.tsx` | Rebrand |
| `apps/floricultura-web/components/admin/AdminLoginForm.tsx` | `components/admin/AdminLoginForm.tsx` | Rebrand |
| `apps/floricultura-web/app/api/auth/reset-request/route.ts` | `app/api/auth/reset-request/route.ts` | Sem mudança |
| `apps/floricultura-web/app/auth/reset/page.tsx` | `app/auth/reset/page.tsx` | Sem mudança |

### Importação XLSX

| Fonte | Destino | Adaptar |
|---|---|---|
| `apps/floricultura-web/features/admin/product-import-actions.ts` | `features/admin/product-import-actions.ts` | Novos campos (brand, size_group, gender, condition) |
| `apps/floricultura-web/components/admin/AdminProductsImportClient.tsx` | `components/admin/AdminProductsImportClient.tsx` | Rebrand |

Note: `packages/core/src/imports/products-xlsx.ts` (parser Zod+xlsx) — adaptar o schema
para campos do brechó.

### ViaCEP

| Fonte | Destino | Adaptar |
|---|---|---|
| `apps/floricultura-web/lib/viacep.ts` | `lib/viacep.ts` | Sem mudança |

### Checkout sections (base)

| Fonte | Destino | Adaptar |
|---|---|---|
| `apps/floricultura-web/features/checkout/components/CheckoutAddressSection.tsx` | `features/checkout/components/CheckoutAddressSection.tsx` | Sem gift_message |
| `apps/floricultura-web/features/checkout/components/CheckoutNotesSection.tsx` | ❌ Não copiar | Repeti não tem observações no MVP |
| `apps/floricultura-web/features/checkout/components/CheckoutSubmitButton.tsx` | `features/checkout/components/CheckoutSubmitButton.tsx` | Rebrand copy |
| `apps/floricultura-web/features/checkout/actions.ts` | `features/checkout/actions.ts` | Remover Stripe, gift_message; adicionar reserva |
| `apps/floricultura-web/features/checkout/types.ts` | `features/checkout/types.ts` | Adaptar campos |

### Pedido público

| Fonte | Destino | Adaptar |
|---|---|---|
| `apps/floricultura-web/features/orders/components/OrderProgressBar.tsx` | `features/orders/components/OrderProgressBar.tsx` | Novos status (confirmed, shipped) |
| `apps/floricultura-web/features/orders/components/OrderItemsList.tsx` | `features/orders/components/OrderItemsList.tsx` | Sem gift_message |
| `apps/floricultura-web/app/(public)/pedido/[codigo]/page.tsx` | `app/(public)/pedido/[codigo]/page.tsx` | Rebrand + novos status |

### Catálogo (components base)

| Fonte | Destino | Adaptar |
|---|---|---|
| `apps/floricultura-web/features/catalog/components/ProductCard.tsx` | `features/catalog/components/ProductCard.tsx` | Aspecto 3/4, badge "Peça única", brand/size |
| `apps/floricultura-web/features/catalog/components/ProductCardSkeleton.tsx` | `features/catalog/components/ProductCardSkeleton.tsx` | Sem mudança |
| `apps/floricultura-web/features/catalog/components/CatalogEmptyState.tsx` | `features/catalog/components/CatalogEmptyState.tsx` | Rebrand copy |
| `apps/floricultura-web/features/catalog/components/CategoryChip.tsx` | `features/catalog/components/CategoryChip.tsx` | Sem mudança |
| `apps/floricultura-web/components/shared/MediaThumb.tsx` | `components/shared/MediaThumb.tsx` | Sem mudança |

### Carrinho (store base)

| Fonte | Destino | Adaptar |
|---|---|---|
| `apps/floricultura-web/features/cart/store.tsx` | `features/cart/store.tsx` | Remover gift_message, preferredFulfillment; adicionar reservationId, expiresAt por item |

### Utilidades

| Fonte (packages) | Destino | Adaptar |
|---|---|---|
| `packages/utils/src/**` | `lib/utils/` (inline ou package) | Sem mudança |
| `packages/notifications/src/whatsapp.ts` (getWhatsAppUrl) | `lib/whatsapp.ts` | Sem mudança |

---

## ADAPT — Reutilizar com mudanças significativas

| O quê | Motivo da adaptação |
|---|---|
| `globals.css` tokens | Nova paleta (azul/lima/coral vs rosa/blush) |
| `tailwind.config.ts` | Nova paleta + Nunito como font-display |
| `features/admin/product-actions.ts` | Novos campos (brand, size_group, gender, condition, status) |
| `features/admin/dashboard/` | KPIs de brechó (peças disponíveis, reservadas, vendidas) |
| Admin nav/shell | Remover planos, complementos, assinaturas |
| `components/public/HomeTrustBar.tsx` | Trust signals de brechó (qualidade curada, preços justos...) |
| `components/public/HomeHero.tsx` | Copy e visual totalmente novos |

---

## DROP — Não copiar

| O quê | Por quê |
|---|---|
| `features/subscriptions/**` | Stripe/assinaturas fora do MVP |
| `app/(public)/assinaturas/**` | Idem |
| `app/admin/planos/**`, `app/admin/complementos/**` | Idem |
| `lib/stripe/**`, `app/api/webhooks/stripe/**` | Stripe não é usado |
| `packages/core/src/types/subscription.ts` | Idem |
| `workflows/FLOR*.json` | Agente n8n — não é o modelo de Repeti |
| `app/api/agent/**` | Agente WhatsApp — pós-MVP |
| Migrations `00013–00025` de flordoestudante | Stack de agente/conversações — não copiar |
| Migrations `00007`, `00010`, `00012` | Assinaturas/addons |
| `docs/progress.md` de flordoestudante (~51KB) | Histórico de Flor, não de Repeti |
| `components/public/HomeOccasionTiles.tsx` | Ocasiões florais |
| `features/catalog/components/CompleteSeuPresente.tsx` | Copy de presente floral |
| `public/branding/` de flordoestudante | Assets da Flor do Estudante |
| `gift_message` em qualquer lugar | Não é feature do MVP de brechó |
| Qualquer referência a Stripe, assinatura, dia das mães | Fora do escopo |

---

## Packages de flordoestudante utilizáveis como referência

```
packages/payments/src/mappers/status.ts  ← mapear status MP para status interno
packages/payments/src/contracts.ts       ← contratos de pagamento
packages/ui/src/components/*.tsx         ← primitivos ShadCN (button, dialog, sheet...)
packages/core/src/schemas/checkout.ts    ← base do schema Zod de checkout (adaptar)
packages/core/src/imports/products-xlsx.ts ← parser XLSX (adaptar schema)
```

Estes podem ser copiados para `lib/` ou `features/` diretamente (sem precisar do package system).

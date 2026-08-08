# Slice Q — HITL pós-prod (frete, Sacolinha, polish)

Guia vivo do grill 2026-08-08 após smoke VIP / storefront. Decisão guarda-chuva: **D128**.

**Status**: grill fechado · frete diagnose feito · issues [#151](https://github.com/matteusmanoel/repetitpetit/issues/151)–[#154](https://github.com/matteusmanoel/repetitpetit/issues/154)

## Pergunta do grill

> O que bloqueia compra VIP e o que é polish/protótipo depois?

## Decisões travadas

| # | Tema | Decisão |
|---|---|---|
| Q1 | Ordem | Bloco A (frete + magic link/`/sacolinha`) **+** polish barato em paralelo — não epic misturado com admin visual |
| Q2 | Área do cliente | Consertar contrato SO-03/D119 (`/sacolinha` + sessão); painel rico = slice depois. **Templates Auth com brand = depois** |
| Q3 | Frete | Conseratar geocode (Nominatim/Photon + knobs); **sem** fallback centro-município |
| Q4–5 | Storefront UX | Parallel “C” no desejo, mas execução **híbrida**: barato direto; drawer/slider/autocomplete só após **protótipo** e só **depois** frete+Sacolinha verdes |
| Q6 | Admin | Bugs **funcionais** (ex. intake preview/câmera) com A; redesign tabs/dialogs/rail = grill depois |
| Q7 | Magic link | Ticket **app** (callback/`next`/sessão) + checklist **HITL** Redirect URLs + templates PT; brand HTML depois |
| Q8 | Empacotamento | Issues separados; protótipo filtros só após 1–2 verdes em prod |
| Q9 | Fechamento | Documentar + diagnose frete + abrir issues 1–4 |

## Anti-goals

- Não construir “mini-admin” do comprador nesta wave.
- Não redesenhar templates Auth com identidade visual (ticket futuro).
- Não fallback frete por centro do município.
- Não misturar redesign admin (tabs/CRUD dialog/Override rail) com P0 compra.
- Não abrir protótipo de filtros enquanto frete/Sacolinha estiverem vermelhos.

## Diagnose frete (2026-08-08)

**Settings prod** (`settings`): `delivery_enabled=true`, CEP loja `85851207`, lat/lng preenchidos, knobs OK → `freteConfigured=true`. Não é “loja sem config”.

**Dois caminhos no checkout**:

1. Autofill endereço → ViaCEP (rua/bairro) — pode funcionar.
2. Calcular frete → `geocodeCep` (Nominatim → Photon) → haversine.

**Achados**:

| Camada | Status |
|---|---|
| Nominatim `postalcode=` | Funciona em vários CEPs Foz; **retorna `[]` em CEPs válidos** (ex. `85851100`, `85857000`) — ViaCEP ainda preenche endereço |
| Photon fallback | **Quebrado**: `lang=pt` → HTTP 400 (“supported: default, de, en, fr”). Fallback nunca salva Nominatim vazio |
| Mensagem UX | `geocode_failed` / `network` → “Não encontramos…” / “Não foi possível localizar o CEP…” |

**Direção do fix (issue frete)**: corrigir Photon (`lang=en` ou omitir); endurecer geocode (ex. query estruturada ViaCEP→Nominatim/Photon **sem** centro-município); erros claros; testes unitários do client geocode.

## Pacotes / issues

| # | Pacote | Issue | Notas |
|---|---|---|---|
| 1 | Frete geocode | [#151](https://github.com/matteusmanoel/repetitpetit/issues/151) | P0 — diagnose acima |
| 2 | Magic link → `/sacolinha` | [#152](https://github.com/matteusmanoel/repetitpetit/issues/152) | P0 app + HITL Auth checklist |
| 3 | Polish barato storefront | [#153](https://github.com/matteusmanoel/repetitpetit/issues/153) | favicon, logo, Times, copy, Instagram, cards, hold +10 min |
| 4 | Admin bugs funcionais | [#154](https://github.com/matteusmanoel/repetitpetit/issues/154) | intake preview/câmera — **não** redesign |
| 5 | (depois) Protótipo filtros | — | drawer + slider + autocomplete |
| 6 | (depois) Auth e-mail brand | — | identidade visual |
| 7 | (depois) Grill admin UX residual | — | tabs modal, dialogs, Override rail |

## Checklist HITL Auth (orchestrator — não agent cloud)

- [ ] Supabase Auth → URL Configuration: Site URL = `https://repetitpetit.vercel.app` (ou domínio final)
- [ ] Redirect URLs allowlist inclui `https://repetitpetit.vercel.app/auth/callback` e `…/auth/callback?**`
- [ ] Templates Magic Link / Confirm signup em **PT** (copy mínima; HTML brand = issue futuro)
- [ ] Smoke: pago → nudge → e-mail → clique → aterrissa em `/sacolinha` (não home) com sessão

## Artefatos

| Artefato | Path |
|---|---|
| Decisão | D128 em `docs/09-decisions.md` |
| Contrato Sacolinha | `docs/slice-o/SO-03-buyer-auth-sacolinha.md` |
| Frete | D104 / D118 · `lib/cep-geocode.ts` · `features/checkout/calculate-frete.ts` |

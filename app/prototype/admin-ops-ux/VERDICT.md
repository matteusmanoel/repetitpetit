# Prototype verdict — Admin Ops UX (Slice P)

**Date:** 2026-08-08 (HITL final)  
**Route:** `/prototype/admin-ops-ux?variant=C`  
**Question:** Como deve parecer e fluir o admin mobile-first (shell + Separação + Cadastro em massa + notificações + dashboard + CRUD)?

## Winner

**Variant C** — rail azul hover (desktop) + Separação **split** (lista cliente + grade de peças, herdada de B) + demais telas do pacote.

Não promover `app/prototype/*` para produção. Implementar no `/admin` via issues SP-*.

## Locked (HITL)

| Item | Spec |
|---|---|
| Shell desktop | Rail estreita azul; expand on hover; primary + secondary + footer conta (avatar · config · Sair) |
| Shell mobile | Bottom bar: **Separação · Em massa · Produtos · Painel**; hamburger fullscreen azul espelha sidebar (primary + secondary + conta) |
| Canvas / tipo | Fundo `#eceff3`; sans (sem Times/Caveat); alvos ~`h-11` ops / `h-8` inputs shadcn em CRUD |
| Separação | Split: cards cliente tamanho fixo (`h-40` × `w-60` mobile); chips filtram clientes; busca cliente/peça; status PT; paginação 6 |
| Check | `packed_at` por item; **não** auto-avançar Order (ADR 0002) |
| Próxima ação | Desktop: toolbar ao lado das chips (pedido selecionado completo). Mobile: ícones empilhados no canto do card do cliente |
| Cadastro em massa | Renomeia “Cadastro Rápido”; série foto+áudio; mic hold+lock; Preview pós-série; Finalizar só com obrigatórios |
| Produtos | Holds (timer + override) só nesta tela; CRUD em **dialog** (não página extra) |
| Modal produto | Input/Select/Textarea shadcn nativos; Categoria+Status ½; multi-foto (capa = 1ª); Áudio + Processar → campos; status labels PT |
| Notificações | Drawer estilo macOS; prioridade: entrega urgente > venda nova > Sacolinha prazo |
| Dashboard | ECharts ops (séries, canais, top clientes); acessos mock; analytics real fora |
| Toasts | Brand `protoToast` → produção sonner; posição **top-center** |

## Gate

HITL OK em **C**. Próximo: D121 + issues SP-1…SP-6 → implementação no `/admin`.

## Capture

Throwaway sob `app/prototype/admin-ops-ux/`. Spec viva: `docs/slice-p/README.md`.

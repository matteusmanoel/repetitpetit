# Slice T — Waves

Fonte: ADR **D135** · [`README.md`](./README.md)

| Wave | Issues | Status | Gate |
|---|---|---|---|
| T0 | D135 | **DONE** | ADR append |
| T1 | [#177](https://github.com/matteusmanoel/repetitpetit/issues/177) ST-1 `RN\|P\|M\|G` | **DONE** | [PR #182](https://github.com/matteusmanoel/repetitpetit/pull/182) |
| T2 | [#178](https://github.com/matteusmanoel/repetitpetit/issues/178) ST-2 STT+LLM | **DONE** | [PR #183](https://github.com/matteusmanoel/repetitpetit/pull/183) |
| T3 | [#179](https://github.com/matteusmanoel/repetitpetit/issues/179) · [#180](https://github.com/matteusmanoel/repetitpetit/issues/180) · [#181](https://github.com/matteusmanoel/repetitpetit/issues/181) | in PR | one-shot UX + finalize + categoria |

## Dispatch

1. `#177` sozinho → merged  
2. `#178` após T1 → merged  
3. `#179+#180+#181` juntos (one-shot) após T2  

Base: `develop`. Prompt: `docs/agents/cloud-dispatch.md`.

## Anti-goals

- Não reativar vision nos campos sem ADR nova  
- Não realce de imagem no caminho sync do MVP  
- Não parser rígido no lugar do LLM  
- Não persistir provenance no DB  
- Validador: conflito ≠ bloqueio de Finalizar  

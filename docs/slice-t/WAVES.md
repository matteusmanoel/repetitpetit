# Slice T — Waves

Fonte: ADR **D135** · [`README.md`](./README.md)

| Wave | Issues | Status | Gate |
|---|---|---|---|
| T0 | D135 | **DONE** | ADR append |
| T1 | [#177](https://github.com/matteusmanoel/repetitpetit/issues/177) ST-1 `RN\|P\|M\|G` | frontier (`ready-for-agent`) | typecheck + testes coerce |
| T2 | [#178](https://github.com/matteusmanoel/repetitpetit/issues/178) ST-2 STT+LLM | blocked by #177 | ping OpenAI + testes provider |
| T3 | [#179](https://github.com/matteusmanoel/repetitpetit/issues/179) · [#180](https://github.com/matteusmanoel/repetitpetit/issues/180) · [#181](https://github.com/matteusmanoel/repetitpetit/issues/181) | blocked by #178 | one-shot no `AdminAiIntakeClient` |

## Dispatch

1. `#177` sozinho  
2. `#178` após merge T1  
3. `#179+#180+#181` juntos (one-shot) após T2  

Base: `develop`. Prompt: `docs/agents/cloud-dispatch.md`.

## Anti-goals

- Não reativar vision nos campos sem ADR nova  
- Não realce de imagem no caminho sync do MVP  
- Não parser rígido no lugar do LLM  
- Não persistir provenance no DB  
- Validador: conflito ≠ bloqueio de Finalizar  

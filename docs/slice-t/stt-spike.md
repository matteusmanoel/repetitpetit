# STT spike — preços e vocabulário (Slice T)

Protocolo mínimo para validar o `prompt` de
[`voiceSttPrompt()`](../../features/admin/ai-intake/ai-config.ts) em
`gpt-4o-mini-transcribe` (D139).

## Como rodar

1. Grave ~10 áudios curtos (staff real, celular, ruído de loja OK).
2. Para cada arquivo, chame a mesma API do intake (`/audio/transcriptions`
   com `language=pt` + `prompt` = `voiceSttPrompt()`).
3. Anote se o **preço** e o **tamanho** aparecem na transcrição.

## Casos sugeridos

| # | Fala (aprox.) | Checar |
|---|---|---|
| 1 | Body Tip Top rosa 59,90 RN | `59,90` ou equivalente |
| 2 | Body … R$ 59,90 RN | preço |
| 3 | … cinquenta e nove e noventa RN | preço |
| 4 | … cinquenta e nove reais e noventa RN | preço |
| 5 | Vestido GAP M 39,90 | `39,90`, GAP, M |
| 6 | Casaco Carter's P | Carter's / Carters, P |
| 7 | Body Hello Kitty meia malha RN | Hello Kitty, RN |
| 8 | Calça 3 meses | idade/meses |
| 9 | Vestido 2 anos | anos |
| 10 | Frase rápida (tudo corrido) com 29,90 | preço sob velocidade |

## Métrica

- **Pass**: preço reconhecível na transcrição (número ou por extenso).
- Comparar mentalmente vs baseline sem prompt (gravações 1–4).
- Se após prompt ainda falhar ≥50% dos casos de preço → tip de fala
  (“reais”) e/ou avaliar `gpt-4o-transcribe`.

## Resultado

Preencher após HITL (não bloqueia merge do D139):

| Data | Pass preço | Notas |
|---|---|---|
| _pendente_ | _/_ | Prompt shipped; spike operador |

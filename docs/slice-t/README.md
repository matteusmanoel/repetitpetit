# Slice T — Voice AI mass intake

ADR: **D135** (`docs/09-decisions.md`).

Objetivo: cadastro em massa **foto + áudio** → STT → LLM → preview → Finalizar
(`inactive` por padrão) / Publicar (`available` com gate).

Não inclui: vision nos campos; fundo branco sync; parser rígido; provenance no DB.

Ver [WAVES.md](./WAVES.md).

Spike STT (preços): [stt-spike.md](./stt-spike.md).

## Checklist HITL pós-D140 (antes de produção)

Após implementação do refine (cardinalidade / condition / name):

- [ ] 1 peça → debug `items.length === 1`
- [ ] LLM com 2 items simulados → preview manual + warning
- [ ] Body falado → `category_name: Body`, `category_id` vazio até Finalizar
- [ ] Condição omitida → “Não informado” no preview
- [ ] Nome `Body Tip Top Rosa` (GAP permanece GAP)
- [ ] Spike STT (~10 áudios) em [stt-spike.md](./stt-spike.md)

## Checklist HITL pós-D141 (categoria / description / tags)

- [ ] Body inexistente no catálogo → Preview mostra **Body (nova)** (não “Sem categoria”)
- [ ] Finalizar cria/encontra Body e grava `category_id`
- [ ] “Sem categoria” limpa `category_name` (não cria cat no Finalizar)
- [ ] Alias Tiptop → `brand`, `name` e `description` com **Tip Top**
- [ ] Description natural (ex. meia malha + Hello Kitty), sem fatos inventados
- [ ] Tags incluem cor/categoria/atributos (e sugestões LLM só de fatos falados)
- [ ] Busca storefront inalterada neste patch

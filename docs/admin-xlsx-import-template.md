# Template XLSX — importação de produtos (T12)

Planilha usada em **Admin → Produtos → Importar** (`/admin/produtos/importar`).
O parser Zod vive em `lib/imports/products-xlsx.ts` e o log em `imports_log`.

## Como usar

1. Baixe o template pela tela de importação (botão **Baixar template XLSX**).
2. Preencha uma linha por peça na primeira aba.
3. Envie o arquivo `.xlsx` (máx. 5 MB).
4. Confira o resumo: total / importadas / com erro (e motivos por linha).

## Colunas (cabeçalho da linha 1)

| Coluna | Obrigatório | Exemplo | Notas |
|---|---|---|---|
| `nome` | sim | Casaco Moletom GAP | Mín. 2 caracteres |
| `slug` | não | casaco-moletom-gap | Se vazio, gera a partir do `nome` |
| `descricao` | não | Moletom azul… | Texto livre |
| `preco` | sim | 49,90 | Aceita `49.90` ou número do Excel |
| `preco_comparacao` | não | 89,90 | Preço riscado |
| `marca` | não | GAP | |
| `tamanho` | sim | 2 anos | Label exibida (`size_label`) |
| `grupo_tamanho` | sim | `2_3a` | Enum `size_group` |
| `genero` | não | `unissex` | Default `unissex` |
| `condicao` | não | `seminovo` | Default `seminovo` |
| `status` | não | `available` | Default `available` |
| `quantidade` | não | 1 | Peça única: `0` ou `1` (default `1`) |
| `destaque` | não | nao | `sim`/`nao`, `true`/`false`, `1`/`0` |
| `tags` | não | inverno, casaco | Separadas por vírgula |
| `categoria_slug` | não | casacos-e-moletons | Precisa existir em `categories` |
| `imagem_capa_url` | não | https://… | URL pública da capa |

Aliases em inglês (ex.: `name`, `brand`, `size_group`, `cover_image_url`) também
são aceitos — ver mapa em `HEADER_ALIASES` no parser.

## Enums válidos

**grupo_tamanho** (`size_group`):
`rn_3m`, `3_6m`, `6_12m`, `12_18m`, `18_24m`, `2_3a`, `4_5a`, `6_8a`, `9_12a`, `13_mais`

**genero** (`product_gender`):
`menino`, `menina`, `unissex`

**condicao** (`product_condition`):
`novo`, `seminovo`, `bom_estado`, `com_detalhes`

**status** (`product_status`):
`available`, `hold`, `sold`, `inactive`
(`reserved` still exists in the DB enum for legacy compatibility; do not import it.)

## Categorias seed (slug)

`vestidos-e-saias`, `conjuntos`, `blusas-e-camisetas`, `casacos-e-moletons`,
`calcas-e-leggings`, `calcados`, `acessorios`

## Resultado e auditoria

Cada upload cria uma linha em `imports_log` com:

- `total_rows`, `imported_rows`, `failed_rows`
- `error_report_json` — array `{ row, message }` das linhas que falharam
- `status`: `completed` | `partial` | `failed`

Produtos com `status = available` aparecem em `/catalogo` (RLS anon) e todos
os importados aparecem em `/admin/produtos`.

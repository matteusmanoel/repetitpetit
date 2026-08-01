# Seed Plan

## Objetivo

Prover dados de desenvolvimento realistas para que o catálogo nunca seja vazio
durante o desenvolvimento. Peças fictícias mas plausíveis de brechó infantil,
cobrindo todas as combinações relevantes de filtros.

## Cobertura do seed (24 peças)

| Gênero | Faixa etária | Condição | Marca | Qtd |
|---|---|---|---|---|
| Menina | RN–24m | Seminovo / Novo | GAP, Carter's | 6 |
| Menino | RN–24m | Bom estado | Zara, Nike | 4 |
| Menina | 2–5a | Seminovo / Novo | Zara, Ralph Lauren | 5 |
| Menino | 2–5a | Seminovo / Bom estado | Adidas, GAP | 4 |
| Unissex | 6–8a | Novo / Seminovo | Nike, Tommy Hilfiger | 3 |
| Menina | 9–12a | Bom estado | Shein, Renner | 2 |

## Categorias do seed

1. Vestidos e Saias
2. Conjuntos
3. Blusas e Camisetas
4. Casacos e Moletons
5. Calças e Leggings
6. Calçados
7. Acessórios

## Imagens

Usar URLs de placeholder externas (não dependem de Supabase Storage configurado):

```
https://placehold.co/400x533/F4F4F0/1A1A1A?text=Repeti+Petit
```

Substituir por fotos reais via admin CRUD ou importação XLSX após setup.

## Como aplicar o seed

```bash
# Via Supabase CLI (local)
supabase db reset

# Via MCP (ambiente cloud):
# use execute_sql com o conteúdo de supabase/seeds/seed.sql
```

O arquivo `supabase/seeds/seed.sql` depende que as migrations já tenham sido aplicadas
(enums e tabelas criados).

# 06 — Agent Playbook

## Fluxo obrigatório: AUDIT → PLAN → EXECUTE

### AUDIT (antes de qualquer implementação)

1. Leia `AGENTS.md` e os docs em ordem.
2. Verifique o estado atual do código: `git status`, estrutura de pastas, `package.json`.
3. Consulte `docs/09-decisions.md` para não re-abrir decisões fechadas.
4. Se for reutilizar algo de `flordoestudante`, consulte `docs/reference/reuse-map-flordoestudante.md`.
5. Use `docs/08-roadmap.md` para entender o milestone atual.

### PLAN (antes de mudanças grandes)

1. Proponha o que vai criar/alterar em formato de lista.
2. Indique o skill mais adequado (ver tabela abaixo).
3. Para decisões novas: anote a decisão proposta antes de implementar.
4. Estime risco de quebrar o build.

### EXECUTE (implementação)

1. Implemente em etapas menores buildáveis.
2. Após cada etapa: confirme que `pnpm build` não quebra.
3. Use MCP Supabase para rodar migrations, não SQL manual.
4. Atualize `docs/09-decisions.md` com qualquer decisão não-trivial.
5. Nunca commite `Co-authored-by: Cursor` ou `cursoragent@cursor.com`.

---

## Qual skill usar

| Situação | Skill |
|---|---|
| Primeira sessão no projeto | `wayfinder` |
| Precisa entender o domínio antes de codificar | `domain-modeling` |
| Precisa transformar uma história de usuário em spec detalhado | `to-spec` |
| Precisa quebrar um spec em tasks acionáveis | `to-tickets` |
| Pronto para implementar um ticket/spec | `implement` |
| Precisa de decisão de interface de módulo | `codebase-design` |
| Algo está quebrado / comportamento inesperado | `diagnosing-bugs` |
| Quer revisar um changeset ou branch | `code-review` |
| Construindo funcionalidade testada | `tdd` |
| Precisa de docs de biblioteca (Next.js, Supabase, MP...) | `research` + context7 MCP |
| Fim de sessão | `handoff` |

---

## MCP tools — quando usar cada um

### Supabase MCP (`wcgpamsvnhpgonxzbzlg`)

```
plugin-supabase-supabase ou user-supabase
```

| Ferramenta | Quando usar |
|---|---|
| `apply_migration` | Sempre que criar ou alterar schema |
| `execute_sql` | Verificar dados, testar queries, seed manual |
| `list_tables` | Antes de criar migration: checar estado atual |
| `list_migrations` | Verificar quais migrations já foram aplicadas |
| `get_logs` | Debug de erros em produção / funções |
| `get_advisors` | Checar performance antes de lançar |
| `generate_typescript_types` | Após cada migration para atualizar `lib/supabase/types.ts` |

**Regra**: sempre use `list_tables` + `list_migrations` antes de criar uma nova migration.
Nunca assuma o estado do banco.

### Vercel MCP (`plugin-vercel-vercel`)

| Situação | Ação |
|---|---|
| Primeiro deploy | Garantir Root Directory = `./`, framework = Next.js |
| Env vars | Configurar via MCP ou `vercel env add` |
| Deploy quebrou | Usar MCP para ver logs do build |

### shadcn MCP (`plugin-shadcn-shadcn`)

```
search_items_in_registries → view_items_in_registries → get_add_command_for_items
```

Sempre pesquisar pelo componente antes de implementar manualmente.

### context7 (`user-context7`)

Usar para buscar docs atualizadas de: Next.js App Router, Supabase, Mercado Pago SDK,
React Hook Form, Zod, Tailwind v4, shadcn/ui.
Não confiar em conhecimento de treinamento para APIs que mudam frequentemente.

---

## Conventions de código

### Estrutura de uma feature

```
features/catalog/
  data.ts          # queries Supabase — async functions que retornam tipos tipados
  types.ts         # tipos de domínio específicos da feature
  actions.ts       # server actions (use server)
  components/
    ProductCard.tsx
    ProductGrid.tsx
    ...
  index.ts         # re-exports públicos da feature
```

### Server actions

```ts
'use server'
// Sempre: import { requireAdminSession } from '@/features/admin/session'
// Sempre: validar input com Zod antes de qualquer DB call
// Sempre: usar createServiceSupabaseClient() para operações privilegiadas
```

### Tipagem Supabase

```ts
// lib/supabase/types.ts — gerado via MCP após cada migration
// Nunca escrever tipos manualmente para tabelas do DB
import type { Database } from '@/lib/supabase/types'
type Product = Database['public']['Tables']['products']['Row']
```

### Env vars

```ts
// lib/env.ts — validar com Zod no startup
// Usar NEXT_PUBLIC_ apenas para o que realmente precisa estar no cliente
// Nunca acessar process.env diretamente fora de lib/env.ts
```

---

## Definição de done para um milestone

- [ ] `pnpm build` limpo (zero erros TypeScript)
- [ ] `pnpm lint` sem erros críticos
- [ ] Migrations aplicadas via MCP Supabase
- [ ] Tipos Supabase regenerados (`generate_typescript_types`)
- [ ] Smoke test manual: fluxo principal funcionando em mobile (375px)
- [ ] `.env.example` atualizado com qualquer nova variável
- [ ] `docs/09-decisions.md` atualizado com decisões do milestone
- [ ] `docs/08-roadmap.md` atualizado com milestone concluído

---

## Regras imutáveis

1. **Nenhum código de `flordoestudante` entra sem revisão do reuse-map.**
2. **Nenhum Stripe, subscriptions, giftwrap ou agente WhatsApp.**
3. **Nenhuma server action sem `requireAdminSession()` nas rotas admin.**
4. **Nenhum `process.env` fora de `lib/env.ts`.**
5. **Nenhum commit com `Co-authored-by` atribuindo cursor/AI.**
6. **Sempre `pnpm` — jamais `npm install` ou `yarn add`.**
7. **Sempre consultar `docs/09-decisions.md` antes de reabrir uma decisão.**

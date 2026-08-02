# 06 — Agent Playbook

## Modelo de operação — local orquestra, cloud executa

```text
LOCAL (orquestrador)                    CLOUD (N VMs)
─────────────────────                   ─────────────────
wayfinder · to-tickets · grilling       implement (1 issue / agente)
review · merge · secrets · HITL    ──►  branch → PR → develop
MCP ricos (Mac + ~/.agents/skills)      AGENTS.md + docs + issue + .cursor/skills/
```

| Fase | Onde | Skills típicas |
|---|---|---|
| Descoberta / decisões | Local | `wayfinder`, `grill-me`, `domain-modeling` |
| Quebra de trabalho | Local | `to-tickets` → issues com AC completos |
| Implementação paralela | Cloud | `implement` (repo); ver `docs/agents/cloud-dispatch.md` |
| Review / merge | Local | `code-review` (repo); CI GitHub |
| Release / soft launch | Local + humano | `docs/11-soft-launch.md`, promote `main` |

**Invariante**: Cloud Agent não vê chat anterior nem skills globais do Mac. Tudo que o
executor precisa está no **issue**, **`docs/*`**, **`AGENTS.md`** (seção Cloud) e
**`.cursor/skills/`**.

**Hardware (M1 8 GB)**: preferir cloud para 2+ builds paralelos; local = 1 sessão
orquestradora leve (+ `gh`, review), não vários `pnpm dev` simultâneos.

---

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
| Orquestrar waves / dispatch cloud | `orchestrate` (local) + `docs/agents/cloud-dispatch.md` |
| Cloud Agent implementando issue | `implement` (`.cursor/skills/`) |
| Review de PR antes do merge | `code-review` (`.cursor/skills/`) |
| Precisa de decisão de interface de módulo | `codebase-design` |
| Algo está quebrado / comportamento inesperado | `diagnosing-bugs` |
| Construindo funcionalidade testada | `tdd` |
| Precisa de docs de biblioteca (Next.js, Supabase, MP...) | `research` + context7 MCP |
| Fim de sessão | `handoff` |

---

## MCP tools — quando usar cada um

### Ordem de preferência (evitar ferramenta errada)

1. **`docs/*` + código em `repetitpetit`** — decisões de domínio, schema, UX, decisões fechadas (`docs/09-decisions.md`).
2. **Ferramentas nativas do Cursor** (`Read`, `Write`, `Grep`, `Glob`, `Shell`) — qualquer arquivo dentro do workspace aberto.
3. **Supabase MCP** — estado real do banco, migrations, advisors, tipos gerados.
4. **Vercel / shadcn / Mercado Pago MCP** — infra, UI, pagamentos conforme a tarefa.
5. **Context7** — sintaxe/API de biblioteca quando (4) e docs internas não bastam.
6. **Filesystem MCP** — leitura em **outro** repo sob `~/Projects` (ex.: `flordoestudante`) sem trocar workspace.
7. **TestSprite** — validação E2E planejada (milestone / smoke), não substitui `pnpm build` nem review manual mobile 375px.

Config: `.cursor/mcp.json` no repo (Supabase + shadcn). Demais MCPs vêm do Cursor global do operador — ver `docs/07-setup.md`.

### Local vs Cloud Agent

| MCP / tool | Agente local (Mac) | Cloud Agent (VM) |
|---|---|---|
| Supabase, shadcn (repo `.cursor/mcp.json`) | Sim | **Não confiar** — MCP cloud often unavailable; migrations via PR + Supabase projeto compartilhado |
| Context7, Filesystem `~/Projects`, TestSprite | Global Mac | **Não** (sem MCP ou sem Mac paths) |
| Skills `~/.agents/skills/` | Sim | **Não** — usar `.cursor/skills/` no repo |
| Secrets `.env.local` | Local | [Cloud Secrets](https://cursor.com/dashboard/cloud-agents) |
| `flordoestudante` no disco | Filesystem MCP ou path | Multi-repo environment **ou** só reuse-map |

---

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

### Context7 (`user-context7`)

**Quando usar**

- Integração nova ou incerta: Next.js App Router, Mercado Pago SDK/webhooks, React Hook Form, Zod, Tailwind v4, `@supabase/ssr`.
- Skill `research` em ticket de biblioteca — Context7 como fonte primária **depois** de checar `docs/*`.

**Quando não usar**

- Schema/RLS deste projeto → `docs/04-data-model.md` + Supabase MCP (`list_tables`, `search_docs` do plugin Supabase).
- Regras de negócio Repeti Petit → docs internas.
- Refatoração, review ou debug só de lógica de app (sem dúvida de API).

**Fluxo obrigatório**

```
resolve-library-id(libraryName, query) → query-docs(libraryId, query)
```

- Uma **pergunta por chamada** de `query-docs` (ex.: assinatura de webhook MP ≠ cookies no App Router).
- Máximo **3 chamadas** por tópico (`resolve-library-id` + `query-docs` contam); se insuficiente, resumir lacuna e seguir com código existente no repo.
- **Nunca** colocar secrets, tokens ou PII no `query` (usar placeholders).

**Bibliotecas frequentes neste MVP**

| Tópico | `libraryName` sugerido |
|---|---|
| Next.js | `Next.js` |
| Supabase JS / SSR | `Supabase` |
| Mercado Pago | `Mercado Pago` ou SDK oficial |
| Forms | `React Hook Form`, `Zod` |
| UI | `shadcn/ui`, `Tailwind CSS` |

---

### Filesystem MCP (`user-filesystem`)

Raiz permitida típica: `~/Projects` (inclui `repetitpetit` e `flordoestudante`).

**Quando usar**

- Portar pattern de `flordoestudante` conforme `docs/reference/reuse-map-flordoestudante.md` **sem** abrir esse repo como workspace.
- `read_multiple_files` / `search_files` em árvore grande do Flor (catálogo, checkout, admin).
- `directory_tree` com `excludePatterns` (`node_modules`, `.next`, `.git`).

**Quando não usar**

- Arquivos dentro de **`repetitpetit`** → preferir `Read` / `Grep` / `Glob` nativos (menos latência, mesmo resultado).
- **Escrita** (`write_file`, `edit_file`) fora de `repetitpetit` — proibido salvo pedido explícito do operador.
- Substituir Supabase MCP ou Git — não é DB nem controle de versão.

**Fluxo recomendado**

1. `list_allowed_directories` se o path falhar.
2. Leitura somente; copiar/adaptar para `repetitpetit` via ferramentas nativas.
3. Nunca commitar paths ou credenciais do Flor.

---

### TestSprite (`user-testsprite`)

Requer `TESTSPRITE_API_KEY` no ambiente do Cursor (global). Testa app **local** via túnel; URL só em deploy → CLI TestSprite (fora deste playbook).

**Quando usar**

- Fechar critérios de milestone em `docs/08-roadmap.md` (smoke mobile, fluxo reserva, E2E pago→webhook quando aplicável).
- Gerar plano de teste frontend **depois** de feature estável e `pnpm build` ok.

**Quando não usar**

- Durante implementação ativa (preferir `pnpm dev` + review manual 375px).
- Substituir migrations, unit tests ou `diagnosing-bugs` em produção.
- Chamar `testsprite_bootstrap` se já existir `.testsprite/config.json`.

**Fluxo Repeti Petit (Next.js, porta 3000)**

1. **Primeira vez só**: `testsprite_bootstrap` com `projectPath` = raiz do repo, `localPort`: **3000**, `type`: `frontend`, `testScope`: `codebase`.
2. Subir app: preferir **`pnpm build && pnpm start`** (`serverMode`: `production` na execução). Dev (`pnpm dev`) limita quantidade de testes frontend.
3. `testsprite_generate_frontend_test_plan` — `needLogin`: `true` para admin; fluxos públicos podem rodar em sessão separada com `false`.
4. `testsprite_generate_code_and_execute` — instruções em PT-BR alinhadas ao PRD (catálogo, peça única, carrinho, checkout MP sandbox).
5. Revisar relatório; falhas de pagamento real → sandbox MP + webhook local (ngrok/CLI), não produção.

**Admin / checkout nos testes**

- Credenciais de teste vêm do operador (Supabase Auth admin de staging/local) — nunca hardcodar no plano TestSprite commitado.

---

### GitHub MCP (`user-github`) e Playwright MCP (`user-playwright`)

- **GitHub**: issues e PRs — neste repo o fluxo habitual é **`gh`** (issues #1–#24, PRs para `develop`/`main`). MCP quando `gh` não estiver disponível.
- **Playwright**: smoke pontual (PDP, catálogo 375px, FAB WhatsApp) — complementa TestSprite; não substitui checklist em `docs/11-soft-launch.md`.

---

### Mercado Pago MCP (`user-mercadopago-mcp-server`)

- Homologação, checklist de qualidade, `search_documentation` antes de alterar checkout/webhook.
- Implementação must match `docs/09-decisions.md` (webhook signature, idempotência) e código em `lib/mercado-pago/`, `app/api/webhooks/mercadopago/`.

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

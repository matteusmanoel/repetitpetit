# Repeti Petit — Agent Context

You are building a self-service e-commerce for **Repeti Petit**, a kids' thrift store
(brechó infantil) in Foz do Iguaçu, PR, Brazil.

## Read these docs before working

In order:

1. `docs/00-brief.md` — problem, goal, success metric
2. `docs/01-brand.md` — logo, palette, voice
3. `docs/02-prd.md` — MVP scope in / out, user stories
4. `docs/03-architecture.md` — folder structure, routes, flows
5. `docs/04-data-model.md` — full schema with enums and RLS
6. `docs/05-ux-direction.md` — mobile-first rules, filter priority, PDP
7. `docs/06-agent-playbook.md` — AUDIT → PLAN → EXECUTE, operação local/cloud, skill/MCP map
8. `docs/07-setup.md` — local bootstrap, Cloud Agent env/secrets
9. `docs/08-roadmap.md` — milestones
10. `docs/09-decisions.md` — closed decisions (append, never overwrite)
11. `docs/11-soft-launch.md` — gate VIP / checklist operacional (T24)
12. `docs/reference/reuse-map-flordoestudante.md` — what to port from Flor, what to skip

## Hard constraints

- **Self-service first**: every feature is evaluated against "does this let a buyer
  complete a purchase without messaging the store?"
- **Mobile-first**: test every screen at 375px before 1280px.
- **No floricultura carryover**: no subscriptions, no Stripe, no n8n/WhatsApp agent,
  no gift messages, no floral copy/tokens. Use the flor repo as a _pattern reference only_.
- **Peça única**: items are `quantity = 1` by default. The reservation system is critical.
- **Portuguese UI**: all user-facing copy is in Brazilian Portuguese.
- **pnpm only**: never use npm or yarn.
- **Append `docs/09-decisions.md`** for every non-trivial architectural choice made.

## MCP tools available

Detalhes, ordem de preferência e anti-patterns: **`docs/06-agent-playbook.md`** (seção MCP).

| MCP | Namespace típico | Papel neste repo |
|---|---|---|
| Supabase | `plugin-supabase-supabase` / `user-supabase` | Schema, migrations, SQL, logs, tipos TS |
| Vercel | `plugin-vercel-vercel` | Deploy, env, logs de build/runtime |
| shadcn | `plugin-shadcn-shadcn` | Instalar componentes UI |
| Context7 | `user-context7` | Docs oficiais de bibliotecas (APIs que mudam) |
| Filesystem | `user-filesystem` | Ler outros repos em `~/Projects` (ex.: Flor) |
| TestSprite | `user-testsprite` | Planos e execução E2E contra app local |
| GitHub | `user-github` | Issues/PRs (preferir `gh` quando bastar) |
| Playwright | `user-playwright` | Smoke manual guiado no browser |
| Mercado Pago | `user-mercadopago-mcp-server` | Homologação e docs de pagamento |

**Regra rápida**: docs internas (`docs/*`) e código do repo primeiro; Supabase MCP
para banco; Context7 só para lacuna de API externa; ferramentas nativas do Cursor
(`Read`, `Write`, `Grep`, `Shell`) para tudo dentro de `repetitpetit`; Filesystem MCP
só quando o workspace não incluir o outro path.

**Cloud Agents**: MCP do Mac e `~/.agents/skills/` **não** sobem para a VM. Custom MCP no cloud está **frequentemente indisponível** (UI Integrations); executores usam **Secrets + repo**. Skills: `.cursor/skills/`. Ver `docs/agents/env-matrix.md`.

## Modelo de operação (local + cloud)

| Papel | Onde roda | Responsabilidade |
|---|---|---|
| **Orquestrador** | Agente **local** (Mac) | wayfinder, tickets, grilling, dispatch, review, merge, HITL |
| **Executor** | **Cloud Agent** (VM) | Um issue por agente → branch → PR para `develop` |

Regra: o issue no GitHub deve bastar **sem** chat anterior. Dispatch: `docs/agents/cloud-dispatch.md`.

## Agent skills

### No repositório (`.cursor/skills/` — local **e** Cloud)

| Skill | When to use |
|---|---|
| `implement` | Executar um issue/spec; PR para `develop` |
| `code-review` | Revisar branch/PR vs standards + AC do issue |
| `orchestrate` | **Só local** — capitão; dispatch e merge (não rodar na VM) |

### Máquina do operador (`~/.agents/skills/` — **só local**)

| Skill | When to use |
|---|---|
| `wayfinder` | Mapa de decisões / orientação inicial |
| `to-spec` | História → spec detalhado |
| `to-tickets` | Spec → issues GitHub |
| `domain-modeling` | Decisões de domínio/schema |
| `codebase-design` | Interface de módulo |
| `diagnosing-bugs` | Incidente / bug |
| `tdd` | Testes em seams acordados |
| `research` | Docs externas (+ Context7 MCP local) |
| `grill-me` | Requisitos interativos |
| `handoff` | Fim de sessão |

---

## Cursor Cloud — instruções específicas

Você está em uma **VM Ubuntu** com o repo clonado na branch pedida. Não há `~/Projects`
do operador nem histórico de chat local.

### Boot

- Dependências: `.cursor/environment.json` roda `pnpm install` antes do agente.
- Secrets: variáveis do dashboard (mesmos nomes que `.env.example`), **não** commitar `.env.local`.

### Antes de codar

1. `AGENTS.md` + corpo do issue (`gh issue view N` se necessário).
2. Docs citados no issue (`docs/04-data-model.md`, `05`, reuse-map, etc.).
3. `docs/09-decisions.md` — não reabrir decisões fechadas.

### Validar

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
```

Subir `pnpm dev` só se o ticket exigir verificação manual no browser (computer use).

### Git / PR

- Base: **`develop`**. Branch: `feature/<issue>-<slug>`.
- PR com `Closes #N`; sem `Co-authored-by` Cursor/AI.
- **Não mergear** salvo instrução explícita no issue.

### Flor / reuse

- **Não** usar paths locais `flordoestudante`. Só `docs/reference/reuse-map-flordoestudante.md`.
- Se o environment for **multi-repo** com Flor clonado, ler só como referência; código entra adaptado neste repo.

### MCP na VM

- **Assume no custom MCP** unless your Cursor account shows a working Integrations/MCP UI.
- Database: commit migrations under `supabase/migrations/`; shared project `wcgpamsvnhpgonxzbzlg` is updated via local orchestrator MCP or Supabase dashboard after merge.
- Payments/docs: code + `docs/*`; local orchestrator uses Mercado Pago MCP when needed.

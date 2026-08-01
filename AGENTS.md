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
7. `docs/06-agent-playbook.md` — AUDIT → PLAN → EXECUTE, skill/MCP map
8. `docs/07-setup.md` — local bootstrap and env
9. `docs/08-roadmap.md` — milestones
10. `docs/09-decisions.md` — closed decisions (append, never overwrite)
11. `docs/reference/reuse-map-flordoestudante.md` — what to port from Flor, what to skip

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

- **Supabase MCP** (`wcgpamsvnhpgonxzbzlg`) — run migrations, execute SQL, view logs
- **Vercel MCP** — inspect deployments, env vars
- **shadcn MCP** — install components
- **context7** — fetch library docs

## Agent skills available (`~/.agents/skills/`)

| Skill | When to use |
|---|---|
| `wayfinder` | First-time orientation in any session |
| `implement` | Executing a spec or ticket |
| `to-spec` | Turning a user story into a detailed spec |
| `to-tickets` | Breaking a spec into tasks |
| `domain-modeling` | Schema decisions |
| `codebase-design` | Module interface design |
| `diagnosing-bugs` | Something is broken |
| `code-review` | Review a branch or changeset |
| `tdd` | Writing tests first |
| `research` | Fetching library/API docs before coding |
| `grill-me` | Gathering requirements interactively |
| `handoff` | Ending a session cleanly |

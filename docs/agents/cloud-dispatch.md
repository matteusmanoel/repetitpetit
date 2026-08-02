# Cloud Agent dispatch — Repeti Petit

Use when a **local orchestrator** starts parallel implementation on GitHub issues.

## Prerequisites (operator — Cursor dashboard)

One-time per environment ([Cloud Agents → Environments](https://cursor.com/dashboard/cloud-agents#environments)):

1. Repo linked; `.cursor/environment.json` runs `pnpm install` on boot.
2. **Secrets** — minimum set in [Secrets tab](https://cursor.com/dashboard/cloud-agents); see `docs/agents/env-matrix.md`.
3. **No MCP on cloud** — executors do not use Supabase/MP/Context7 MCP on the VM. When a ticket needs MCP, the **PR must state it** in a “Handoff to orchestrator” note; local session runs MCP after merge.
4. Optional **multi-repo** environment if `flordoestudante` is on GitHub.
5. Base branch **`develop`** for feature PRs.

## Agent settings

| Field | Value |
|---|---|
| Base branch | `develop` |
| Environment | `cloud` |
| Model | Team default or `cursor-grok-4.5-high-fast` for bulk UI/API tickets |

## Prompt skeleton

Copy and fill for each issue:

```markdown
You implement **one ticket** in Repeti Petit (GitHub: matteusmanoel/repetitpetit).
You have **no prior conversation** — everything needed is below or in the repo.

## Issue
#<N> — <title>
<paste body or instruct: run `gh issue view N`>

## Read first
1. AGENTS.md
2. <docs listed in issue, e.g. docs/04-data-model.md, docs/05-ux-direction.md>
3. docs/reference/reuse-map-flordoestudante.md — patterns only; no flor repo path

## Hard rules
- pnpm only; PR to `develop`; branch `feature/<N>-<slug>`
- Closes #<N> in PR body
- No Co-authored-by Cursor
- PT-BR UI; mobile 375px
- Run before PR: pnpm typecheck && pnpm lint && pnpm build && pnpm test

## Out of scope
<anything the issue excludes>
```

## Parallelism rules

1. Only dispatch issues with **all blockers closed/merged**.
2. Prefer 2–5 parallel agents on **disjoint file areas** (catalog vs admin vs API).
3. After merge wave, sync `develop` locally before next dispatch.

## After agents finish

1. Local orchestrator: `code-review` on the PR; squash-merge to `develop`; delete branch.
2. `git pull origin develop` on the Mac.
3. **MCP handoff (local only)** — if the PR or issue required tools unavailable on cloud, run on the **orchestrator session** (Mac):

| Need | Local action |
|---|---|
| Apply migration / `list_tables` / types | Supabase MCP or `supabase db push` + `generate_typescript_types` |
| MP homologation / webhook docs | Mercado Pago MCP + smoke |
| Flor pattern deep-dive | Filesystem MCP or local Flor path + reuse-map |
| Library API gap | Context7 + `research` skill |
| E2E / TestSprite | Local `pnpm build && pnpm start` + TestSprite MCP |

Cloud agents **must not** block waiting for MCP. They commit migration **files** and document “orchestrator applies after merge” when remote DB must change.

---
name: implement
description: Implement a GitHub issue or spec in Repeti Petit — build, typecheck, test, PR to develop. Use on Cloud Agents executing a ticket; local orchestrator may dispatch instead of coding inline.
---

Implement **one** scoped ticket or spec slice in `matteusmanoel/repetitpetit`.

## Before coding

1. Read `AGENTS.md` hard constraints and the issue body (AC + blockers). Note the cohesion tag (`[standalone]`, `[wave-dependent]`, `[one-shot-recommended]`).

1.5. **Contract docs** — if the issue body contains a `Contract doc:` or `Docs:` reference, or if the ticket is tagged `[wave-dependent]` or `[one-shot-recommended]`, read all referenced contract docs **before opening any file**. These define:
- The exact interface surface you must consume (do not infer it from the codebase — it goes stale)
- Forbidden behaviors (do not implement alternatives even if they seem cleaner)
- Downstream callers (do not break their import paths or rename exported symbols)

If no contract doc is referenced and the ticket is `[standalone]`, skip this step.

If `docs/slice-n/WAVES.md` exists, read the entry for this ticket's wave to understand MCP handoff expectations.

2. Read only the docs the ticket references (usually `docs/04-data-model.md`, `docs/05-ux-direction.md`, `docs/06-agent-playbook.md`, reuse-map).
3. Confirm base branch: **`develop`** for feature work unless the issue says otherwise.
4. Do **not** assume access to `flordoestudante` on disk — use `docs/reference/reuse-map-flordoestudante.md` only.

## While implementing

- **pnpm only** — never npm/yarn.
- Small buildable steps; run `pnpm typecheck` after non-trivial changes.
- Schema changes: Supabase MCP `list_tables` + `list_migrations`, then `apply_migration`; regenerate types when applicable.
- Admin routes: `requireAdminSession()`; validate with Zod; no raw `process.env` outside `lib/env.ts`.
- UI copy in **Brazilian Portuguese**; mobile-first (375px).

## Validation before PR

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Run the full test suite once at the end. Skip starting long-lived dev servers unless the ticket requires manual browser verification.

## Pull request

- Branch: `feature/<issue>-<short-slug>` from latest `develop`.
- Target: **`develop`** (not `main` unless release issue).
- Title: `feat(scope): summary` with `Closes #N` or `Fixes #N` in body.
- **Never** add `Co-authored-by: Cursor` or `cursoragent@cursor.com`.

PR body required sections:

```
## What this does
<one paragraph — the end-to-end behaviour now working>

## Acceptance criteria
<copy from issue; check each box>

## Handoff to orchestrator
<list any items the local orchestrator must run after this PR merges — MCP calls, CLI commands, smoke tests>
<if none, write: None.>

Examples of valid handoff items:
- [ ] `generate_typescript_types` after migration merge
- [ ] Apply migration to project ref via Supabase MCP
- [ ] MP homologation smoke: `quality_checklist`
- [ ] Regenerate reuse-map if new Flor pattern introduced
```

If unsure which MCP handoffs apply, check `docs/slice-n/WAVES.md` → "MCP Handoff Schedule" and find the entry for your wave. Copy the relevant items verbatim. If WAVES.md does not exist, write `TODO: orchestrator to confirm handoffs` in that section.

## After PR

Stop. Do not merge unless the issue explicitly assigns you merge rights. Local orchestrator reviews and merges.

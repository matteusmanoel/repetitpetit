---
name: implement
description: Implement a GitHub issue or spec in Repeti Petit — build, typecheck, test, PR to develop. Use on Cloud Agents executing a ticket; local orchestrator may dispatch instead of coding inline.
---

Implement **one** scoped ticket or spec slice in `matteusmanoel/repetitpetit`.

## Before coding

1. Read `AGENTS.md` hard constraints and the issue body (AC + blockers).
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
- PR body: link issue, checklist mapped to AC, how you tested.
- **Never** add `Co-authored-by: Cursor` or `cursoragent@cursor.com`.

## After PR

Stop. Do not merge unless the issue explicitly assigns you merge rights. Local orchestrator reviews and merges.

# Issue tracker — GitHub (Repeti Petit)

Repo: `matteusmanoel/repetitpetit`

## Fetch an issue

```bash
gh issue view <N> --repo matteusmanoel/repetitpetit --json title,body,state,labels
```

## Labels used in agent workflows

| Label | Meaning |
|---|---|
| `ready-for-agent` | Issue body complete; safe to dispatch Cloud Agent |
| `wave-*` | Delivery wave grouping (orchestrator) |
| `wayfinder:map` / `wayfinder:*` | Planning map tickets (local wayfinder) |

## PR ↔ issue

- Reference `Closes #N` or `Fixes #N` in PR body.
- Reviewers use issue AC as spec source (`code-review` skill).

## Blocking

GitHub **Blocked by** / native dependencies define dispatch order. Orchestrator must not parallelize tickets with unresolved blockers.

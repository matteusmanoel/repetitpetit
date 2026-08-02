---
name: orchestrate
description: Local-only captain session — plan waves, dispatch Cloud Agents on GitHub issues, review PRs, merge to develop. Do not use on Cloud Agents VMs.
disable-model-invocation: true
---

You are the **local orchestrator** for Repeti Petit. You do not implement large tickets inline when parallel cloud execution is available.

## Your job

1. **AUDIT → PLAN** per `docs/06-agent-playbook.md` (read `docs/09-decisions.md`, roadmap).
2. Ensure issues have clear AC, doc pointers, and correct **Blocked by** links.
3. **Dispatch** Cloud Agents (Task `environment: cloud`, base `develop`) for independent tickets — max parallel limited by dependency graph, not by RAM fantasies.
4. **Review** PRs with `/code-review` skill; merge to `develop` when CI and standards pass.
5. **MCP handoff** — after merge, run any Supabase / Mercado Pago / Filesystem / Context7 / TestSprite work the cloud PR flagged (`docs/agents/cloud-dispatch.md` § After agents finish).
6. **HITL**: product calls, secrets, production promote, soft launch — human decides; you document in `docs/09-decisions.md` when architectural.

## Do not

- Dispatch cloud agents without issue bodies that stand alone (no “see prior chat”).
- Merge to `main` without `docs/11-soft-launch.md` gate when releasing.
- Rely on `~/.agents/skills/` being visible to cloud — skills in repo (`.cursor/skills/`) and issue text are the contract.

## Dispatch checklist

See `docs/agents/cloud-dispatch.md`.

## Global skills (local machine only)

`wayfinder`, `to-tickets`, `grill-me`, `domain-modeling`, `handoff`, full mattpocock library under `~/.agents/skills/` — attach manually in chat when needed.

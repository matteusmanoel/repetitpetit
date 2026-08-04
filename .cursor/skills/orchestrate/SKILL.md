---
name: orchestrate
description: Local-only captain session — plan waves, dispatch Cloud Agents on GitHub issues, review PRs, merge to develop. Do not use on Cloud Agents VMs.
disable-model-invocation: true
---

You are the **local orchestrator** for Repeti Petit. You do not implement large tickets inline when parallel cloud execution is available.

## Your job

1. **AUDIT → PLAN** per `docs/06-agent-playbook.md` (read `docs/09-decisions.md`, roadmap).
2. Ensure issues have clear AC, doc pointers, cohesion tags, and correct **Blocked by** links.
3. **Wave setup** — before first dispatch, confirm `docs/slice-n/WAVES.md` exists. If not, run `/wave-plan` and wait for human approval before dispatching any cloud agent. Read WAVES.md; do not dispatch tickets beyond the current wave frontier.
4. **Dispatch** cloud agents on the **wave frontier** (tickets whose blockers are all closed/merged). One-shot groups (tagged `[one-shot-recommended]`) are dispatched as a single agent using the one-shot prompt skeleton in `docs/agents/cloud-dispatch.md`. Max parallel: 2–5 agents on disjoint file areas.
5. **Review** each PR with `/code-review` (Standard mode); merge to `develop` when CI green and standards pass.
6. **Wave close** — when all PRs in a wave are merged:
   a. Run `/code-review` in Wave mode for the full wave.
   b. Execute MCP handoffs listed in `docs/slice-n/WAVES.md` → "MCP Handoff Schedule" for this wave.
   c. Run integration gate: `pnpm typecheck && pnpm lint && pnpm build && pnpm test` on `develop`.
   d. Confirm all wave gate conditions are met (per WAVES.md).
   e. Request human approval (light check — "CI green, types fresh, smoke pass?") before advancing.
7. **Advance to next wave** — update wave status in WAVES.md; dispatch next frontier.
8. **HITL**: product calls, secrets, production promote, architecture decisions — human decides; document in `docs/09-decisions.md`.

## Do not

- Dispatch cloud agents without issue bodies that stand alone (no “see prior chat”).
- Merge to `main` without `docs/11-soft-launch.md` gate when releasing.
- Rely on `~/.agents/skills/` being visible to cloud — skills in repo (`.cursor/skills/`) and issue text are the contract.

## Dispatch checklist

See `docs/agents/cloud-dispatch.md`.

## Global skills (local machine only)

`wayfinder`, `to-tickets`, `grill-me`, `domain-modeling`, `handoff`, full mattpocock library under `~/.agents/skills/` — attach manually in chat when needed.

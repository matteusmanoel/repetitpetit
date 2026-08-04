---
name: code-review
description: Review a branch or PR against Repeti Petit standards (AGENTS.md, playbook, decisions) and the originating GitHub issue spec. Use after cloud implementation or before merge to develop/main.
---

## Mode

**Standard** (default) — single PR or branch. Follow the full process below.

**Wave** — invoked when the user passes a wave name (e.g. `wave: Wave 1`) or a list of PRs (e.g. `prs: #12 #13 #14`). Run Standard review on each PR first, then run the Wave Coherence Check below.

### Wave Coherence Check

After all individual PR reviews are complete:

1. Read `docs/slice-n/WAVES.md` for this wave's gate conditions and contract doc references.
2. For each contract doc listed (e.g. `docs/slice-n/SN-02-contract.md`): verify no PR in the wave violates the **Forbidden Behaviors** section of that contract.
3. **Type surface coherence**: do the PRs collectively produce a consistent type surface? Flag any case where two PRs define the same type or symbol differently.
4. **Migration file ordering**: are migration file names monotonically increasing with no gaps or collisions across the wave's PRs?
5. **Handoff completeness**: does each PR that touches schema, Supabase types, or MP webhooks have a non-empty "Handoff to orchestrator" section?
6. Report a **Wave Coherence** section appended to the aggregate report:

```
## Wave Coherence — Wave N: <name>

| Check | Status | Notes |
|---|---|---|
| Contract doc compliance | ✅ / ❌ | |
| Type surface coherence | ✅ / ❌ | |
| Migration file ordering | ✅ / ❌ | |
| Handoff completeness | ✅ / ❌ | |
| Gate conditions | MET / UNMET / UNKNOWN | |

**Verdict**: WAVE GATE [OPEN / BLOCKED — reason]
```

If `docs/slice-n/WAVES.md` does not exist: skip gate condition check and append to report: "WAVES.md not found — wave gate status unknown. Run `/wave-plan` before next dispatch."

---

Review changes between a **fixed point** and `HEAD` on two axes: **Standards** and **Spec**.

Issue tracker workflow: `docs/agents/issue-tracker.md`.

## 1. Pin the diff

User supplies a ref (branch, SHA, `develop`, PR base). Default for release review: `origin/main...HEAD` or PR base branch.

```bash
git fetch origin
git diff <fixed-point>...HEAD
git log <fixed-point>..HEAD --oneline
```

Fail fast if ref is invalid or diff is empty.

## 2. Standards sources (mandatory)

- `AGENTS.md` — constraints, peça única, no flor carryover, pnpm, commits.
- `docs/06-agent-playbook.md` — conventions, MCP rules, immutable rules.
- `docs/09-decisions.md` — do not approve re-opening closed decisions without new ADR.
- Existing patterns in the touched feature folders.

Flag: missing admin guard, env outside `lib/env.ts`, Stripe/subscriptions/gift/agent WhatsApp, English user-facing copy, `npm`/`yarn`.

## 3. Spec source

1. Issue `#N` from commit/PR body — fetch with `gh issue view N --repo matteusmanoel/repetitpetit`.
2. Else ask the user for the spec path or issue number.

Map each acceptance criterion to implemented / partial / missing.

## 4. Report format

```markdown
## Standards
(bullets with file references)

## Spec
(bullets tied to issue AC)

## Summary
Standards: N findings — worst: …
Spec: N findings — worst: …
Recommendation: merge / request changes / block
```

Keep under ~600 words total unless high-risk (payments, RLS, webhooks).

## 5. High-risk paths

Extra scrutiny on:

- `app/api/webhooks/mercadopago/**`
- `lib/mercado-pago/**`, `features/payments/**`
- `features/cart/**`, reservation RPC/migrations
- `features/admin/session.ts`, middleware
- Supabase RLS migrations

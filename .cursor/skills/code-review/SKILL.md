---
name: code-review
description: Review a branch or PR against Repeti Petit standards (AGENTS.md, playbook, decisions) and the originating GitHub issue spec. Use after cloud implementation or before merge to develop/main.
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

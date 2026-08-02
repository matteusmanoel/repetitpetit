# Sincronização — GitHub, VM Cloud Agent, Mac local

Não existem **três remotes Git** diferentes. Existe **um** repositório canônico no GitHub; os outros dois lugares são **checkouts** ou **runtimes** que leem/escrevem nele.

## Diagrama

```text
                    ┌─────────────────────────────┐
                    │  GitHub (origin)            │
                    │  matteusmanoel/repetitpetit │
                    │  branches: main, develop,   │
                    │  feature/*, cursor/*        │
                    └──────────────┬──────────────┘
                                   │
           git push / pull         │         git fetch + branch + push (PR)
           gh pr merge             │
                    ┌──────────────┴──────────────┐
                    │                             │
         ┌──────────▼──────────┐     ┌──────────▼──────────┐
         │ Mac local             │     │ Cloud Agent VM       │
         │ ~/Projects/...        │     │ (efêmera, Ubuntu)    │
         │ Cursor IDE + gh       │     │ Cursor cloud runtime │
         └──────────┬────────────┘     └──────────┬──────────┘
                    │                             │
         .env / .env.local              Secrets (dashboard)
         ~/.agents/skills               .cursor/environment.json
         MCP global Mac                  .cursor/skills/ (do clone)
```

## Papel de cada “ambiente”

| Camada | O que sincroniza | O que **não** sincroniza automaticamente |
|---|---|---|
| **GitHub** | Código, docs, `.cursor/environment.json`, skills no repo | Secrets, `node_modules`, `.env.local` |
| **Cloud Agent VM** | Clone na branch base (`develop`) + commits do agente → push → **PR** | Mac paths, skills globais, MCP do laptop, seu `.env` |
| **Mac local** | `git pull` / merge de PRs; push quando você commita | Secrets na VM; estado da VM após término |

A VM **não** é um remote nomeado `cloud-agent-vm`. Quando o agente termina, o que permanece é **branch + PR no GitHub**. A VM é descartada.

## Fluxo típico (wave)

1. **Local** — `git pull origin develop`; dispatch cloud com `cloud_base_branch: develop`.
2. **Cloud** — clone @ `develop`, branch `feature/N-…`, commits, abre PR → `develop`.
3. **Local** — review, `gh pr merge`, `git pull origin develop`.
4. **Vercel** (4º runtime, deploy) — build a partir de `main`/`develop` conforme config; env no dashboard Vercel.

## Variáveis de ambiente

Git **nunca** carrega secrets. Replique **nomes** de `.env.example` em:

- Mac: `.env` / `.env.local`
- Cloud: [Cursor Secrets](https://cursor.com/dashboard/cloud-agents)
- Produção: Vercel project env

Matriz detalhada: [env-matrix.md](./env-matrix.md).

## MCP

- **Local:** `.cursor/mcp.json` + `~/.cursor/mcp.json` global.
- **Cloud:** custom MCP **não** confiar; `.cursor/mcp.json` do repo **não** é lido pela VM (comportamento reportado Cursor + experiência do operador).

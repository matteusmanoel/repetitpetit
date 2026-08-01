# 10 — Handoff

## Estado do repositório (após esta sessão)

**Data**: 2026-08-01
**Origem**: Chat "Repeti Petit MVP discovery" (workspace `flordoestudante`)

### O que foi feito

- [x] `mattpocock/skills` instalado globalmente em `~/.agents/skills` (41 skills)
- [x] Repo `/Users/matteusmanoel/Projects/Personal/repetitpetit` scaffolded
- [x] `public/brand/logo.png` — logo real da marca
- [x] `.cursor/mcp.json` — Supabase MCP configurado para projeto `wcgpamsvnhpgonxzbzlg`
- [x] `.gitignore`, `.env.example`, `AGENTS.md`, `README.md`
- [x] `docs/00-brief.md` — problema, objetivo, métrica de sucesso
- [x] `docs/01-brand.md` — paleta, tipografia, tokens Tailwind
- [x] `docs/02-prd.md` — user stories, SLAs, scope in/out
- [x] `docs/03-architecture.md` — estrutura de pastas, rotas, flows, mermaid diagrams
- [x] `docs/04-data-model.md` — schema completo, enums, RLS, reserva atômica, pg_cron
- [x] `docs/05-ux-direction.md` — filtros, PDP, carrinho, checkout, popup, desapego
- [x] `docs/06-agent-playbook.md` — AUDIT→PLAN→EXECUTE, skill map, MCP map, conventions
- [x] `docs/07-setup.md` — bootstrap, Supabase, Vercel, passos manuais
- [x] `docs/08-roadmap.md` — M0–M5 + pós-MVP
- [x] `docs/09-decisions.md` — 12 decisões fechadas (D01–D12)
- [x] `docs/reference/reuse-map-flordoestudante.md` — mapa de reutilização
- [x] `docs/seed-plan.md` + `supabase/seeds/seed.sql` — 24 peças de desenvolvimento
- [x] Commit e push para `main` do GitHub (executa Vercel deploy ao configurar)
- [x] Todas as decisões documentadas em `docs/09-decisions.md`

### O que NÃO foi feito (M0 do próximo chat)

- [ ] `create-next-app` — scaffold do app Next.js
- [ ] Tailwind v4 + shadcn/ui instalados e configurados
- [ ] `lib/env.ts`, `lib/supabase/*.ts`
- [ ] Migrations criadas e aplicadas via MCP Supabase
- [ ] Tipos TypeScript gerados
- [ ] Seed de dev aplicado

---

## Próximo chat — Contexto de abertura

**Workspace para o próximo chat**: `/Users/matteusmanoel/Projects/Personal/repetitpetit`

Use o prompt abaixo para abrir o próximo chat já em modo de trabalho:

---

```
Você está no projeto Repeti Petit — e-commerce de brechó infantil.

Leia os seguintes documentos na ordem antes de qualquer implementação:
1. AGENTS.md (raiz)
2. docs/00-brief.md
3. docs/01-brand.md
4. docs/02-prd.md
5. docs/03-architecture.md
6. docs/04-data-model.md
7. docs/06-agent-playbook.md
8. docs/08-roadmap.md
9. docs/09-decisions.md

Depois de ler, informe:
- O que você entendeu do projeto
- Qual o próximo passo do roadmap (M0)
- Que dúvidas (se houver) antes de executar

Aguarde confirmação antes de começar a implementar.
```

---

## Configurações pós-commit necessárias (manual)

Após o primeiro push, o próximo agente ou você precisa:

1. **Criar projeto Vercel**: `vercel` na raiz — selecionar Root Directory `./`, framework Next.js.
2. **Configurar env vars** na Vercel com os valores reais de `.env.local`.
3. **Verificar Supabase MCP**: abrir um chat na workspace `repetitpetit` e confirmar que
   a ferramenta Supabase aparece disponível.
4. **Executar migrations** (quando criadas): via `supabase db push` ou MCP `apply_migration`.

## Links úteis

- GitHub: https://github.com/matteusmanoel/repetitpetit
- Supabase project: https://supabase.com/dashboard/project/wcgpamsvnhpgonxzbzlg
- Instagram: https://instagram.com/repetipetit
- Referência UX: https://www.crescivoando.com.br (inspecionar patterns, não copiar visual)
- Flor do Estudante (referência técnica): `/Users/matteusmanoel/Projects/Personal/flordoestudante`

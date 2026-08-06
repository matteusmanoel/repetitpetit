# Matriz de variáveis — local, Cloud Agent VM, Vercel

GitHub **não armazena** secrets de runtime (só código). Sincronização de **código** = git; sincronização de **config** = você replica nomes/valores em cada painel.

Referência canônica de nomes: `.env.example` e `lib/env/load-server.ts` + `lib/env/public.ts`.

## Legenda

| Símbolo | Significado |
|---|---|
| **O** | Obrigatório para `pnpm build` / app server |
| **R** | Recomendado (feature completa ou ticket específico) |
| **·** | Opcional / só alguns tickets |
| **—** | Não aplicável |

## Variáveis

| Variável | Local dev | Cloud Agent VM | Vercel (deploy) | Notas |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | O | O | O | Build embute no client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | O | O | O | Idem |
| `NEXT_PUBLIC_SITE_URL` | O | O | O | MP back URLs, OG; cloud: use URL preview ou prod de teste |
| `NEXT_PUBLIC_STORE_NAME` | O | O | O | |
| `SUPABASE_SERVICE_ROLE_KEY` | O | O | O | Server actions, scripts admin, webhooks |
| `NEXT_PUBLIC_STORE_WHATSAPP` | R | R | R | FAB / links; build passa sem, UX incompleta |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | · | · | · | Checkout / tickets pagamento |
| `MERCADOPAGO_ACCESS_TOKEN` | · | · | · | Checkout + API server |
| `MERCADOPAGO_WEBHOOK_SECRET` | · | · | O (prod) | Webhook HMAC; cloud raramente testa webhook externo |
| `MERCADOPAGO_SANDBOX` | · | · | · | `1`/`true` força sandbox_init_point; APP_USR test também via `/users/me` |
| `VERCEL_OIDC_TOKEN` | · | — | — | Injetado pelo CLI Vercel localmente; **não** copiar para cloud |

## Mínimo Cloud Agent (maioria dos tickets UI/admin/catálogo)

Configure no [Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents) **os mesmos nomes** que `.env.example`:

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `NEXT_PUBLIC_SITE_URL` — ex.: `https://repetitpetit.vercel.app` ou alias real
4. `NEXT_PUBLIC_STORE_NAME` — **`Repeti Petit`** (marca real; loader corrige Repetit/Petite — D100)
5. `SUPABASE_SERVICE_ROLE_KEY`

Adicione MP quando o issue tocar checkout/webhook.

## Estado observado (2026-08-02)

| Ambiente | Situação |
|---|---|
| **`.env` (local, gitignored)** | Contém o set completo de `.env.example` (+ `VERCEL_OIDC_TOKEN`) |
| **`.env.local` (local)** | Só `VERCEL_OIDC_TOKEN` — Next.js ainda carrega vars de `.env` para as demais chaves |
| **Cloud Agent VM** | Depende 100% do dashboard Secrets (não ler `.env` do Mac) |
| **Vercel** | Conferir dashboard do projeto `repetitpetit` — Production + Preview; alinhar com `docs/11-soft-launch.md` |
| **GitHub Actions** | Sem workflow no repo — CI é Vercel/GitHub checks nos PRs, não env matrix no GH |

## MCP vs env no cloud

Custom MCP no Cloud Agents está **instável ou indisponível** para contas individuais (UI Integrations/MCP ausente ou bugada). Na VM, preferir:

- **Secrets** acima + `pnpm` + código no repo
- Migrations SQL em `supabase/migrations/` commitadas; aplicar via Supabase CLI na VM se MCP não existir: `supabase db push --linked` (requer `SUPABASE_ACCESS_TOKEN` ou login — **não** documentado no app hoje; preferir migration já aplicada no projeto remoto + agente só altera repo)
- Supabase remoto já compartilhado (`wcgpamsvnhpgonxzbzlg`) — agents alteram schema via **arquivos migration no PR**, operador ou pipeline aplica

## Checklist operador (fechar gaps)

- [ ] Cloud Secrets: 5 vars mínimas + MP se wave checkout
- [ ] Vercel Production: mesmo set; `NEXT_PUBLIC_SITE_URL` = alias live
- [ ] Local: manter `.env` ou consolidar tudo em `.env.local` (evitar confusão)
- [ ] Não commitar `.env` / `.env.local`

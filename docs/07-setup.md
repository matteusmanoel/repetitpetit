# 07 — Setup Local

## Pré-requisitos

- Node >= 18 (recomendado: 20 LTS)
- pnpm >= 9 (`corepack enable && corepack prepare pnpm@latest --activate`)
- Supabase CLI (`brew install supabase/tap/supabase` ou `npm i -g supabase`)
- Vercel CLI (`pnpm i -g vercel`)

## Supabase

Projeto já vinculado via CLI:

```
Ref: wcgpamsvnhpgonxzbzlg
Nome: repetipetit
```

Para verificar o link:

```bash
cd /Users/matteusmanoel/Projects/Personal/repetitpetit
supabase status
```

Para aplicar migrations:

```bash
supabase db push
```

Para gerar tipos TypeScript após migrations:

```bash
# via MCP Supabase (preferido em sessões de agente)
# ou via CLI:
supabase gen types typescript --linked > lib/supabase/types.ts
```

## Bootstrap do projeto

```bash
cd /Users/matteusmanoel/Projects/Personal/repetitpetit
pnpm install
cp .env.example .env.local
# edite .env.local com as credenciais reais
pnpm dev
```

O app sobe em `http://localhost:3000`.

## HTTPS local (iPhone / mic / câmera na LAN)

`getUserMedia` exige secure context. `http://macteus.local:3000` **não** serve
para microfone no Safari iOS — use HTTPS na LAN.

### Uma vez no Mac

```bash
brew install mkcert
mkcert -install          # pede senha admin — confia o CA no Keychain
pnpm certs:local         # gera .certs/ para localhost + <hostname>.local
```

### Confiar o CA no iPhone (passo a passo)

O Safari só deixa de reclamar do certificado se o **CA do mkcert** estiver
instalado e marcado como confiável. Faça **uma vez**:

1. No Mac, localize o arquivo:
   - `.certs/rootCA.pem` (na pasta do projeto), ou
   - `$(mkcert -CAROOT)/rootCA.pem`
2. **AirDrop** esse arquivo para o iPhone (ou envie por Arquivos/iCloud).
3. No iPhone, toque no arquivo → **Permitir** / **Instalar perfil**.
4. Abra **Ajustes → Geral → VPN e gerenciamento de dispositivo** (ou
   **Perfil baixado**) → toque no perfil **mkcert …** → **Instalar** (digite o
   código do iPhone).
5. Ainda em **Ajustes → Geral → Sobre → Certificados de Confiança** (no fim da
   lista) → ative o interruptor do **mkcert** → Confiar.
6. Feche o Safari por completo e abra de novo:
   `https://macteus.local:3000/...`

Se a página carregar com cadeado / sem aviso vermelho, o HTTPS está ok. Sem o
passo 5 o site pode abrir em alguns casos, mas uploads/`fetch` falham com
**“Load failed”**.

### Rodar o app

```bash
pnpm dev:https
```

No iPhone (mesmo Wi‑Fi):

```text
https://macteus.local:3000/admin/produtos/intake-ia
```

Substitua `macteus` pelo `LocalHostName` do Mac se for outro
(`scutil --get LocalHostName`).

Opcional durante o teste (auth redirects / site URL):

```bash
# em .env.local
NEXT_PUBLIC_SITE_URL=https://macteus.local:3000
```

Se o Supabase Auth rejeitar o redirect, adicione a mesma URL em
Authentication → URL Configuration (Redirect URLs) no dashboard.

`.certs/` está no `.gitignore` (não versionar chaves).

## Variáveis de ambiente obrigatórias

Ver `.env.example` para a lista completa com comentários.

| Variável | Obrigatório | Quando usar |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sempre | App inteiro |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sempre | App inteiro |
| `SUPABASE_SERVICE_ROLE_KEY` | Sempre | Server actions, webhooks |
| `MERCADOPAGO_ACCESS_TOKEN` | Para pagamentos | Checkout, webhook |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Para pagamentos | MP SDK client-side |
| `MERCADOPAGO_WEBHOOK_SECRET` | Para webhooks | `/api/webhooks/mercadopago` |
| `NEXT_PUBLIC_SITE_URL` | Sempre | Back URLs do MP, OG tags |
| `NEXT_PUBLIC_STORE_WHATSAPP` | Para suporte | FAB, links de pedido |
| `NEXT_PUBLIC_STORE_NAME` | Sempre | UI, templates |

## Cloud Agents (execução remota)

Config as code: **`.cursor/environment.json`** — `pnpm install` idempotente em cada boot da VM.

Resolução de environment (Cursor): `.cursor/environment.json` no repo → environment pessoal → team.

### Checklist do operador (dashboard)

Antes de dispatch paralelo ([guia](agents/cloud-dispatch.md), [env matrix](agents/env-matrix.md)):

1. [Environments](https://cursor.com/dashboard/cloud-agents#environments) — repo `repetitpetit` linkado; snapshot após primeiro guided setup (opcional, acelera boot).
2. [Secrets](https://cursor.com/dashboard/cloud-agents) — copiar nomes de `.env.example` (Supabase service role, MP, `NEXT_PUBLIC_*`). Não commitar valores.
3. **MCP cloud** — custom MCP em Cloud Agents está **instável ou indisponível** para muitos planos (UI em [Integrations](https://cursor.com/dashboard/integrations) pode não persistir ou não existir). **Não depender de MCP na VM**; usar Secrets + Supabase remoto compartilhado + migrations no PR. MCP continua no **Cursor local**. Ver `docs/agents/env-matrix.md`.
4. Issues com label `ready-for-agent`, AC testáveis, blockers corretos.
5. Base branch **`develop`** para feature PRs.

Se `flordoestudante` estiver no GitHub: adicionar ao **mesmo environment** para agents lerem patterns sem Filesystem MCP do Mac.

### O que não esperar na VM

- `~/.agents/skills/` do Mac
- Paths locais `/Users/.../flordoestudante` (salvo multi-repo)
- MCP stdio do laptop não registrados no dashboard

---

## MCP no Cursor (IDE local)

### No repositório (`.cursor/mcp.json`)

- **Supabase** — projeto `wcgpamsvnhpgonxzbzlg` (migrations, SQL, docs Supabase via plugin).
- **shadcn** — registry de componentes.

Autenticação Supabase: token gerenciado pelo Cursor / login MCP — não commitar tokens no repo.

### No Cursor global (operador)

Estes MCPs ficam habilitados na config global do Cursor e aparecem nas sessões de agente
com namespace `user-*` ou `plugin-*`:

| MCP | Variável / nota |
|---|---|
| Context7 | `npx @upstash/context7-mcp` — docs de bibliotecas |
| Filesystem | raiz `~/Projects` — leitura cross-repo |
| TestSprite | `TESTSPRITE_API_KEY` no ambiente |
| GitHub | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| Playwright | browser MCP para smoke |
| Mercado Pago | URL MCP + token de app (sandbox/prod) |
| Vercel, Azure DevOps, Terraform | outros projetos Loumar — ignorar se não forem a tarefa |

**Orientação de uso para agentes**: `docs/06-agent-playbook.md` (seção MCP).

### TestSprite (local)

```bash
cd /Users/matteusmanoel/Projects/Personal/repetitpetit
pnpm build && pnpm start   # porta 3000 — preferido antes de E2E TestSprite
# ou pnpm dev (modo dev — menos testes automáticos)
```

Garantir `TESTSPRITE_API_KEY` definida nas env vars do Cursor antes de invocar o MCP.

## Vercel

Primeiro deploy (cria o projeto automaticamente):

```bash
vercel --prod
```

Configurar:
- Root Directory: `./`
- Framework Preset: Next.js
- Build Command: `pnpm build` (detectado automaticamente)

Após o primeiro deploy, configurar env vars pelo dashboard ou:

```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... para cada variável secreta
```

## Passos manuais

Após subir o ambiente:

1. **Criar admin no Supabase Auth**: Dashboard → Authentication → Users → Add user.
   Anotar o `auth_user_id` e inserir em `public.admins`.
   (Produção T24: `admin@repetipetit.com.br` já existe — ver `docs/11-soft-launch.md`.)

2. **Configurar settings iniciais**: rodar seed ou inserir manualmente em `public.settings`.

3. **Criar regras de frete**: inserir em `public.shipping_rules` (ver seed).

4. **Configurar webhook no Mercado Pago**:
   URL: `https://seu-dominio.vercel.app/api/webhooks/mercadopago`
   Eventos: `payment`

   **Homologação / credenciais de teste**:
   - Access Token de teste pode ser `TEST-…` **ou** `APP_USR-…` ligado a um
     usuário com tag `test_user` (painel → Credenciais de teste).
   - Com credenciais de teste, defina **`MERCADOPAGO_SANDBOX=1`** no Vercel
     (Production + Preview) e **redeploy**. Sem isso o Checkout Pro pode abrir
     `www.mercadopago.com.br` e falhar mesmo em aba anônima com
     “Uma das partes … é de teste”.
   - Confirme na URL do redirect: host = **`sandbox.mercadopago.com.br`**.
   - Pagamento no sandbox:
     1. **Não** faça login com conta Mercado Pago **real** (nem Google/Apple da
        conta pessoal) — MP exige comprador de teste quando o vendedor é teste
        ([contas de teste](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/test/accounts)).
     2. Prefira **checkout convidado** + cartão de teste: Mastercard
        `5480 8328 0103 3311`, titular `APRO`, CPF `12345678909`, CVV `123`,
        validade `11/30`.
     3. Ou crie um usuário **Comprador** em Suas integrações → Contas de teste
        (precisa estar logado com a conta **produtiva** do Devsite) e entre com
        o username/senha gerados.
   - O botão “Simular notificação” do painel envia `data.id=123456` (pagamento
     inexistente). O webhook deve responder **200 ignored** (`payment_not_found`),
     não 500. Pagamentos reais usam id válido e seguem o fluxo normal.
   - Smoke automatizado (sandbox host): `node scripts/qa-mp-pref-hosts.mjs` e
     `node scripts/qa-buyer-journey-prod.mjs` (requer Playwright + Chrome).

5. **Configurar redirect URLs no Supabase Auth**:
   Site URL: `https://seu-dominio.vercel.app`
   Redirect URLs: `https://seu-dominio.vercel.app/auth/reset`

6. **Inventário real**: Admin → Produtos → Importar (`docs/admin-xlsx-import-template.md`).

7. **Impressora térmica de etiquetas** (quando o hardware estiver plugado):
   ver [`docs/thermal-label-print.md`](thermal-label-print.md) — fluxo Admin →
   Etiqueta → Imprimir, tamanho 58×40 mm, drivers e fallback PDF.


Gate VIP / smoke / Lighthouse: `docs/11-soft-launch.md`.

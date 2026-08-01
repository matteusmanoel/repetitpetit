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

## MCP Supabase no Cursor

O arquivo `.cursor/mcp.json` já está configurado com o projeto `wcgpamsvnhpgonxzbzlg`.
Para que o MCP autentique, o Supabase MCP usa o token armazenado pelo Cursor —
**não é necessário configurar tokens manualmente**.

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

2. **Configurar settings iniciais**: rodar seed ou inserir manualmente em `public.settings`.

3. **Criar regras de frete**: inserir em `public.shipping_rules` (ver seed).

4. **Configurar webhook no Mercado Pago**:
   URL: `https://seu-dominio.vercel.app/api/webhooks/mercadopago`
   Eventos: `payment`

5. **Configurar redirect URLs no Supabase Auth**:
   Site URL: `https://seu-dominio.vercel.app`
   Redirect URLs: `https://seu-dominio.vercel.app/auth/reset`

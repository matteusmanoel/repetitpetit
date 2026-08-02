# 11 — Soft launch hardening (T24)

Checklist operacional antes de enviar o link ao grupo VIP no WhatsApp.
Atualizado em 2026-08-02 (agente cloud, branch `feature/24-soft-launch-hardening`).

## Verificado neste ambiente

| Item | Status | Evidência |
|---|---|---|
| Admin Auth + `public.admins` | OK | `admin@repetipetit.com.br` ativo, `auth_user_id` ligado, e-mail confirmado (Auth Admin API) |
| Seed de desenvolvimento | OK | ~28 produtos, 7 categorias, settings, shipping_rules, banners |
| Webhook route | OK | `POST /api/webhooks/mercadopago` → `401 invalid_signature` sem HMAC (fail-closed, secret presente) |
| Reserva atômica | OK | `scripts/smoke-cart-reserve.mjs` → `SMOKE OK` (concorrência 200/409) |
| Rotas públicas @375px | OK | `/`, `/catalogo`, PDP seed, `/desapegue`, `/checkout`, `/pedido/RP-2026-0001`, `/admin/login` → HTTP 200 |
| Lighthouse mobile (build local) | OK | `/` performance **92**; `/catalogo` performance **95** (Chrome headless, 375×812) |
| `.env.example` | OK | Vars alinhadas a `docs/07-setup.md`; webhook path documentado |
| pnpm only | OK | Sem `package-lock.json` |

## Lighthouse (local `pnpm build` + `pnpm start`)

Medido em `http://127.0.0.1:3000` — domínio público Vercel indisponível neste momento (ver abaixo).

| Rota | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/` | 92 | 96 | 96 | 100 |
| `/catalogo` | 95 | 96 | 96 | 100 |

Relatórios HTML: artefatos da sessão em `/opt/cursor/artifacts/lighthouse/`.
Revalidar no alias de produção assim que o deploy estiver saudável.

## Pendente — Mateus (manual)

### 1. Deploy de produção estável (bloqueante)

- Alias de produção (`NEXT_PUBLIC_SITE_URL`) responde `DEPLOYMENT_NOT_FOUND`.
- Último deploy Production no GitHub (ref antiga) falhou.
- Tip de `develop` aparece como Vercel **"Canceled by Ignored Build Step"**.
- Previews exigem Vercel SSO — não servem para smoke público / webhook externo.

**Ação**: no projeto Vercel `repetitpetit`, desligar/ajustar Ignored Build Step para `develop`/`main`, promover um deploy Production saudável, e alinhar `NEXT_PUBLIC_SITE_URL` + webhook MP + Supabase Auth redirect URLs ao alias real.

### 2. Inventário real (XLSX)

- `imports_log` está vazio — catálogo atual = seed de desenvolvimento (placehold.co).
- Não apagar o seed em produção às cegas: importar peças reais via **Admin → Produtos → Importar** (`/admin/produtos/importar`).
- Template e colunas: `docs/admin-xlsx-import-template.md`.
- Após import, desativar/remover placeholders do seed se não forem vender.

### 3. Smoke E2E pago (sandbox ou valor baixo)

Path ainda não exercitado de ponta a ponta com pagamento real:

1. Browse → PDP → reservar → checkout → preferência MP  
2. Pagar (PIX/cartão sandbox ou valor baixo)  
3. Webhook marca `paid` + produto `sold`  
4. `/admin/pedidos` recebe na fila (Realtime) → Conferir e separar → status seguinte  
5. Comprador vê atualização em `/pedido/[codigo]`

### 4. DNS / VIP

- Domínio custom ou alias Vercel estável público.
- Enviar link ao grupo VIP só depois dos itens 1–3.

### 5. Credenciais admin

- Usuário de produção já existe (`admin@repetipetit.com.br`).
- Senha **não** está neste repo nem neste PR — recuperar via “Esqueci minha senha” em `/admin/login` se necessário.
- Contas de agente (`agent-t10@…`, `t11.agent…`) podem ser desativadas (`is_active = false`) após soft launch.

## Comandos úteis

```bash
pnpm install
pnpm build && PORT=3000 pnpm start
node --env-file=.env.local scripts/smoke-cart-reserve.mjs
pnpm dlx lighthouse@12.6.1 http://127.0.0.1:3000/ \
  --only-categories=performance --form-factor=mobile \
  --screenEmulation.mobile --chrome-flags="--headless --no-sandbox"
```
